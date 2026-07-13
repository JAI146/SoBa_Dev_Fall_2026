export type UploadedImageFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export type UploadedMediaFile = UploadedImageFile;
