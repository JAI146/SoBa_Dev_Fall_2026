import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProfileImageUploadResponse } from '@purposemint/contracts';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { S3Config } from '../entities/s3-config.entity';

const UPLOAD_URL_TTL_SECONDS = 300;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

@Injectable()
export class S3Service {
  constructor(
    @InjectRepository(S3Config)
    private readonly s3ConfigRepo: Repository<S3Config>,
  ) {}

  /**
   * Hands the client a short-lived PUT URL rather than proxying the bytes
   * through the API. The client must send the same `Content-Type` it asked for.
   */
  async createProfileImageUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<ProfileImageUploadResponse> {
    const config = await this.getConfig();
    const client = this.createClient(config);
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType] ?? '.jpg';
    const key = `profiles/${userId}/${randomUUID()}${extension}`;

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );

    return {
      uploadUrl,
      publicUrl: `https://${config.bucket}.s3.${config.region}.amazonaws.com/${key}`,
      expiresInSeconds: UPLOAD_URL_TTL_SECONDS,
    };
  }

  private createClient(config: S3Config): S3Client {
    return new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  private async getConfig(): Promise<S3Config> {
    const config = await this.s3ConfigRepo.findOne({
      where: {},
      order: { updatedAt: 'DESC' },
    });
    if (!config) throw new Error('S3 configuration is not set');
    return config;
  }
}
