import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../config/env.validation';
import type { AccessTokenPayload } from './auth-principal';

const SECONDS_PER_UNIT: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

/** `15m` -> 900. The env schema has already checked the shape. */
function toSeconds(ttl: string): number {
  const amount = Number(ttl.slice(0, -1));
  return amount * SECONDS_PER_UNIT[ttl.slice(-1)];
}

/**
 * Signs and verifies access JWTs. Refresh tokens are not JWTs and are not
 * handled here — see `SessionService`.
 */
@Injectable()
export class TokenService {
  readonly accessTokenTtlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessTokenTtlSeconds = toSeconds(
      config.get('JWT_ACCESS_TTL', { infer: true }),
    );
  }

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenTtlSeconds,
    });
  }
}
