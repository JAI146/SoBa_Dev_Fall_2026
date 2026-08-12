import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@purposemint/contracts';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Env } from '../../config/env.validation';
import { UsersService } from '../../users/users.service';
import type { AccessTokenPayload, AuthPrincipal } from '../auth-principal';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  /**
   * Loads the user by primary key on every request rather than trusting the
   * payload. That is one indexed lookup per call, and it buys immediate
   * revocation: suspending or deleting an account takes effect on the next
   * request instead of whenever the 15-minute token happens to expire.
   */
  async validate(payload: AccessTokenPayload): Promise<AuthPrincipal> {
    // Soft-deleted users are excluded by the repository's default scope.
    const user = await this.usersService.findById(payload.sub);
    if (!user || user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      sessionId: payload.sid,
      userType: user.userType,
      adminRole: user.adminRole,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
    };
  }
}
