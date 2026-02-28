import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { badRequestError } from '../utils/errors';
import { env } from '../config/env';
import crypto from 'crypto';

export type MediaFolder = 'profile' | 'posts' | 'clips' | 'articles';

/**
 * Upload a file buffer to Cloudinary and return the secure URL.
 * Path convention: profile/{userId}/avatar|cover, posts/{userId}/{postId}_{timestamp}, etc.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: MediaFolder,
  publicIdPrefix: string,
  options?: { resourceType?: 'image' | 'video' | 'raw'; format?: string }
): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw badRequestError('Cloudinary is not configured');
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `arena/${folder}/${publicIdPrefix}`,
        resource_type: options?.resourceType ?? 'auto',
        format: options?.format,
      },
      (err, result) => {
        if (err) return reject(err);
        if (!result || !result.secure_url) {
          return reject(new Error('Upload failed'));
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete asset from Cloudinary by public_id.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image'
): Promise<void> {
  if (!isCloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

/**
 * Generate signed upload params for client-side upload (optional).
 * Client can use these with Cloudinary SDK to upload directly.
 */
export function getUploadSignature(
  folder: MediaFolder,
  publicIdPrefix: string,
  timestamp: number
): { signature: string; apiKey: string; cloudName: string; folder: string } {
  if (!isCloudinaryConfigured()) {
    throw badRequestError('Cloudinary is not configured');
  }
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;
  const apiSecret = env.CLOUDINARY_API_SECRET;
  const folderPath = `arena/${folder}/${publicIdPrefix}`;
  const paramsToSign = { folder: folderPath, timestamp };
  const sorted = Object.keys(paramsToSign)
    .sort()
    .map((k) => `${k}=${paramsToSign[k as keyof typeof paramsToSign]}`)
    .join('&');
  const signature = crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
  return {
    signature,
    apiKey,
    cloudName,
    folder: folderPath,
  };
}
