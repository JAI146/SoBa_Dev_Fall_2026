import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { S3Config } from '../entities/s3-config.entity';
import { S3Service } from './s3.service';

@Module({
  imports: [TypeOrmModule.forFeature([S3Config])],
  providers: [S3Service],
  exports: [S3Service],
})
export class StorageModule {}
