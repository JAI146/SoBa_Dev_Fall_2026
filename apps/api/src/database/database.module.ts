import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Config } from '../entities/s3-config.entity';
import { SmtpConfig } from '../entities/smtp-config.entity';
import { User } from '../entities/user.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, S3Config, SmtpConfig])],
  providers: [SeedService],
})
export class DatabaseModule {}
