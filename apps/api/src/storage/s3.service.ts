import { Injectable, Logger } from "@nestjs/common";
import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { extname, basename, join } from "path";
import { tmpdir } from "os";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { Repository } from "typeorm";
import { S3Config } from "../entities/s3-config.entity";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);

  constructor(
    @InjectRepository(S3Config)
    private readonly s3ConfigRepo: Repository<S3Config>,
    private readonly configService: ConfigService,
  ) {}

  async getConfig(): Promise<S3Config | null> {
    const configs = await this.s3ConfigRepo.find({
      order: { updatedAt: "DESC" },
      take: 1,
    });
    return configs[0] ?? null;
  }

  async saveConfig(data: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
  }): Promise<S3Config> {
    const existing = await this.getConfig();
    if (existing) {
      existing.accessKeyId = data.accessKeyId;
      existing.secretAccessKey = data.secretAccessKey;
      existing.region = data.region;
      existing.bucket = data.bucket;
      return this.s3ConfigRepo.save(existing);
    }
    const config = this.s3ConfigRepo.create(data);
    return this.s3ConfigRepo.save(config);
  }

  private async getClient(): Promise<{ client: S3Client; bucket: string }> {
    const config = await this.getConfig();
    if (!config) {
      throw new Error("S3 configuration is not set. Please configure it in admin settings.");
    }
    const client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    return { client, bucket: config.bucket };
  }

  async uploadProfileImage(
    file: UploadedImageFile,
    userId: string,
  ): Promise<string> {
    const { client, bucket } = await this.getClient();
    const ext = extname(file.originalname) || ".jpg";
    const key = `profiles/${userId}/${randomUUID()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://${bucket}.s3.${(await this.getConfig())!.region}.amazonaws.com/${key}`;
  }

  async uploadFamilyMedia(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    familyId: string,
    isSensitive: boolean,
  ): Promise<{
    url: string;
    blurredUrl: string | null;
    mimeType: string;
    filename: string;
    kind: "image" | "video";
    isSensitive: boolean;
  }> {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    if (!isImage && !isVideo) {
      throw new Error("Only image and video files are allowed");
    }

    const { client, bucket } = await this.getClient();
    const config = (await this.getConfig())!;
    const ext = extname(file.originalname) || (isImage ? ".jpg" : ".mp4");
    const key = `families/${familyId}/${randomUUID()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const blurredUrl = await this.uploadBlurredFamilyMediaThumbnail(
      client,
      bucket,
      config.region,
      familyId,
      file.buffer,
      isImage,
    );

    return {
      url: `https://${bucket}.s3.${config.region}.amazonaws.com/${key}`,
      blurredUrl,
      mimeType: file.mimetype,
      filename: file.originalname,
      kind: isImage ? "image" : "video",
      isSensitive,
    };
  }

  private async uploadBlurredFamilyMediaThumbnail(
    client: S3Client,
    bucket: string,
    region: string,
    familyId: string,
    buffer: Buffer,
    isImage: boolean,
  ): Promise<string | null> {
    try {
      const blurredBuffer = isImage
        ? await this.blurImageBuffer(buffer)
        : await this.blurVideoPosterBuffer(buffer);
      const blurredKey = `families/${familyId}/blurred/${randomUUID()}.jpg`;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: blurredKey,
          Body: blurredBuffer,
          ContentType: "image/jpeg",
        }),
      );
      return `https://${bucket}.s3.${region}.amazonaws.com/${blurredKey}`;
    } catch (error) {
      this.logger.warn(
        `Failed to generate blurred thumbnail for family ${familyId} media: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async blurImageBuffer(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .blur(20)
      .jpeg({ quality: 60 })
      .toBuffer();
  }

  private async blurVideoPosterBuffer(buffer: Buffer): Promise<Buffer> {
    const tmpDir = await mkdtemp(join(tmpdir(), "family-media-"));
    const inputPath = join(tmpDir, `input-${randomUUID()}.mp4`);
    const frameFilename = `frame-${randomUUID()}.jpg`;
    const framePath = join(tmpDir, frameFilename);
    try {
      await writeFile(inputPath, buffer);
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .on("end", () => resolve())
          .on("error", (error: Error) => reject(error))
          .screenshots({
            timestamps: ["10%"],
            filename: basename(frameFilename),
            folder: tmpDir,
            size: "400x?",
          });
      });
      const frameBuffer = await readFile(framePath);
      return this.blurImageBuffer(frameBuffer);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  async uploadSponsorshipReceipt(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    sponsorshipId: string,
  ): Promise<string> {
    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";
    if (!isImage && !isPdf) {
      throw new Error("Receipt must be an image or PDF file");
    }

    const { client, bucket } = await this.getClient();
    const ext =
      extname(file.originalname) || (isPdf ? ".pdf" : ".jpg");
    const key = `sponsorship-receipts/${sponsorshipId}/${randomUUID()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const config = await this.getConfig();
    return `https://${bucket}.s3.${config!.region}.amazonaws.com/${key}`;
  }

  async uploadTransferProof(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    sponsorshipId: string,
  ): Promise<string> {
    const isImage = file.mimetype.startsWith("image/");
    const isPdf = file.mimetype === "application/pdf";
    if (!isImage && !isPdf) {
      throw new Error("Transfer proof must be an image or PDF file");
    }

    const { client, bucket } = await this.getClient();
    const ext =
      extname(file.originalname) || (isPdf ? ".pdf" : ".jpg");
    const key = `transfer-proofs/${sponsorshipId}/${randomUUID()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const config = await this.getConfig();
    return `https://${bucket}.s3.${config!.region}.amazonaws.com/${key}`;
  }

  async uploadChatMedia(
    file: { buffer: Buffer; originalname: string; mimetype: string },
    roomId: string,
    kindOverride?: "image" | "video" | "document" | "sticker",
  ): Promise<{ url: string; kind: "image" | "video" | "document" | "sticker" }> {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");
    const isDocument = isAllowedChatDocument(file.mimetype, file.originalname);

    let kind: "image" | "video" | "document" | "sticker";
    if (kindOverride === "sticker" && isImage) {
      kind = "sticker";
    } else if (kindOverride === "document" || isDocument) {
      if (!isDocument && kindOverride !== "document") {
        throw new Error("Only supported document types are allowed");
      }
      kind = "document";
    } else if (isImage) {
      kind = "image";
    } else if (isVideo) {
      kind = "video";
    } else {
      throw new Error("Unsupported file type");
    }

    const { client, bucket } = await this.getClient();
    const ext =
      extname(file.originalname) ||
      (kind === "video"
        ? ".mp4"
        : kind === "document"
          ? ".bin"
          : ".jpg");
    const key = `chat/${roomId}/${randomUUID()}${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const config = await this.getConfig();
    return {
      url: `https://${bucket}.s3.${config!.region}.amazonaws.com/${key}`,
      kind,
    };
  }
}

const CHAT_DOCUMENT_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
]);

const CHAT_DOCUMENT_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".zip",
]);

function isAllowedChatDocument(mimetype: string, originalname: string) {
  if (CHAT_DOCUMENT_MIMES.has(mimetype)) return true;
  const ext = extname(originalname).toLowerCase();
  return CHAT_DOCUMENT_EXTENSIONS.has(ext);
}
