import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import type { Env } from '../config/env.validation';
import { UserOtp } from '../entities/user-otp.entity';
import { UserSession } from '../entities/user-session.entity';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { SessionService } from './session.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';

/**
 * `auth` depends on `users`, never the other way round. `users` reaches back
 * only for the guards and decorators, which are plain files with no providers.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([UserSession, UserOtp]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
        // Refresh tokens are opaque and signed by nothing — this key only ever
        // signs short-lived access tokens.
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
    UsersModule,
    MailModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    TokenService,
    OtpService,
    JwtStrategy,
  ],
  exports: [SessionService],
})
export class AuthModule {}
