import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomRole } from './entities/custom-role.entity';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { validateEnv, type Env } from './config/env.validation';
import { DashboardModule } from './dashboard/dashboard.module';
import { dataSourceOptions } from './database/data-source';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { UsersModule } from './users/users.module';
import { PathwaysModule } from './pathways/pathways.module';
import { ReflectionsModule } from './reflections/reflections.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { CommunityChallengesModule } from './community-challenges/community-challenges.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CustomRole]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      cache: true,
      validate: validateEnv,
    }),
    // The exact same options the TypeORM CLI uses, so the schema the app
    // expects and the schema the migrations build cannot drift apart.
    TypeOrmModule.forRootAsync({
      useFactory: () => dataSourceOptions,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          ttl: config.get('THROTTLE_TTL_SECONDS', { infer: true }) * 1000,
          limit: config.get('THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OnboardingModule,
    DashboardModule,
    PathwaysModule,
    ReflectionsModule,
    SubscriptionsModule,
    CommunityChallengesModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    // Order matters: rate limit, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
