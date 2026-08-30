import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalTemplate } from '../entities/goal-template.entity';
import { HabitTemplate } from '../entities/habit-template.entity';
import { S3Config } from '../entities/s3-config.entity';
import { SmtpConfig } from '../entities/smtp-config.entity';
import { User } from '../entities/user.entity';
import { Value } from '../entities/value.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      S3Config,
      SmtpConfig,
      Value,
      GoalTemplate,
      HabitTemplate,
    ]),
  ],
  providers: [SeedService],
})
export class DatabaseModule {}
