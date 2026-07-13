import type { UploadedImageFile } from '../common/types/uploaded-file.type';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { Repository } from 'typeorm';
import { S3Config } from '../entities/s3-config.entity';

@Injectable()
export class S3Service {
  constructor(
    @InjectRepository(S3Config)
    private readonly s3ConfigRepo: Repository<S3Config>,
  ) {}

  private async getConfig(): Promise<S3Config> {
    const config = await this.s3ConfigRepo.findOne({
      where: {},
      order: { updatedAt: 'DESC' },
    });
    if (!config) throw new Error('S3 configuration is not set');
    return config;
  }

  async uploadProfileImage(file: UploadedImageFile, userId: string) {
    const config = await this.getConfig();
    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    const extension = extname(file.originalname) || '.jpg';
    const key = 'profiles/' + userId + '/' + randomUUID() + extension;
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return (
      'https://' +
      config.bucket +
      '.s3.' +
      config.region +
      '.amazonaws.com/' +
      key
    );
  }
}
