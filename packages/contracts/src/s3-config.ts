import { z } from "zod";

export const s3ConfigSchema = z.object({
  accessKeyId: z.string().min(1, "Access key ID is required"),
  secretAccessKey: z.string().min(1, "Secret access key is required"),
  region: z.string().min(1, "Region is required"),
  bucket: z.string().min(1, "Bucket name is required"),
});

export type S3ConfigInput = z.infer<typeof s3ConfigSchema>;

export interface S3ConfigPublic {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  updatedAt: string;
}
