export interface ObjectStorageProvider {
  getUploadUrl(input: {
    objectKey: string;
    mimeType: string;
    expiresInSeconds: number;
  }): Promise<{ uploadUrl: string; publicUrl: string }>;
}
