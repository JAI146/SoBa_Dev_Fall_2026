import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import type { OtpTypeValue } from '@purposemint/contracts';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { IsNull, Repository } from 'typeorm';
import type { Env } from '../config/env.validation';
import { UserOtp } from '../entities/user-otp.entity';

/**
 * Six-digit one-time codes: bcrypt hashed, single-use, attempt-capped, and
 * invalidated in bulk whenever a fresh one is issued.
 *
 * Every failure message names the fix rather than the fault, and none of them
 * distinguishes "no such account" from "wrong code" — the caller relies on
 * that to keep `/forgot-password` from confirming who has an account.
 */
@Injectable()
export class OtpService {
  private readonly ttlMinutes: number;
  private readonly maxAttempts: number;
  private readonly cooldownSeconds: number;
  private readonly bcryptRounds: number;

  constructor(
    @InjectRepository(UserOtp)
    private readonly otpsRepo: Repository<UserOtp>,
    config: ConfigService<Env, true>,
  ) {
    this.ttlMinutes = config.get('OTP_TTL_MINUTES', { infer: true });
    this.maxAttempts = config.get('OTP_MAX_ATTEMPTS', { infer: true });
    this.cooldownSeconds = config.get('OTP_RESEND_COOLDOWN_SECONDS', {
      infer: true,
    });
    this.bcryptRounds = config.get('BCRYPT_ROUNDS', { infer: true });
  }

  get ttlMinutesForCopy(): number {
    return this.ttlMinutes;
  }

  /**
   * Returns the plaintext code — the only time it exists outside the email.
   * Any outstanding code of the same type is retired first, so a person always
   * has exactly one live code and the newest one always works.
   */
  async issue(userId: string, type: OtpTypeValue): Promise<string> {
    await this.otpsRepo.update(
      { userId, type, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.otpsRepo.insert({
      userId,
      type,
      codeHash: await bcrypt.hash(code, this.bcryptRounds),
      expiresAt: new Date(Date.now() + this.ttlMinutes * 60_000),
      attempts: 0,
    });

    return code;
  }

  /** Guards `/resend-verification` against being used as an email cannon. */
  async assertNotOnCooldown(
    userId: string,
    type: OtpTypeValue,
  ): Promise<void> {
    if (this.cooldownSeconds <= 0) return;

    const latest = await this.otpsRepo.findOne({
      where: { userId, type },
      order: { createdAt: 'DESC' },
    });
    if (!latest) return;

    const elapsedSeconds = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsedSeconds < this.cooldownSeconds) {
      const wait = Math.ceil(this.cooldownSeconds - elapsedSeconds);
      throw new BadRequestException(
        `We sent a code moments ago — give it ${wait} more second${wait === 1 ? '' : 's'} and we'll happily send another.`,
      );
    }
  }

  /**
   * Verifies and burns a code. Throws with the same shape of message whether
   * the code was wrong, stale or already used.
   */
  async consume(
    userId: string,
    type: OtpTypeValue,
    code: string,
  ): Promise<void> {
    const otp = await this.otpsRepo
      .createQueryBuilder('otp')
      .addSelect('otp.codeHash')
      .where('otp.userId = :userId', { userId })
      .andWhere('otp.type = :type', { type })
      .andWhere('otp.consumedAt IS NULL')
      .orderBy('otp.createdAt', 'DESC')
      .getOne();

    if (!otp) {
      throw new BadRequestException(
        "We don't have a code waiting on that account. Ask for a fresh one and we'll send it straight over.",
      );
    }

    if (otp.expiresAt.getTime() <= Date.now()) {
      await this.retire(otp.id);
      throw new BadRequestException(
        `That code has expired — they last ${this.ttlMinutes} minutes. Ask for a new one and we'll send it right away.`,
      );
    }

    // Count the attempt before checking it, so a crash mid-verify cannot be
    // used to get a free guess.
    await this.otpsRepo.increment({ id: otp.id }, 'attempts', 1);
    const attempts = otp.attempts + 1;

    if (await bcrypt.compare(code, otp.codeHash)) {
      await this.retire(otp.id);
      return;
    }

    if (attempts >= this.maxAttempts) {
      await this.retire(otp.id);
      throw new BadRequestException(
        "That's a few tries with this code, so we've retired it. Ask for a fresh one and we'll start over.",
      );
    }

    throw new BadRequestException(
      "That code doesn't match the one we sent. Worth another look — or ask for a new one.",
    );
  }

  private async retire(otpId: string): Promise<void> {
    await this.otpsRepo.update(otpId, { consumedAt: new Date() });
  }
}
