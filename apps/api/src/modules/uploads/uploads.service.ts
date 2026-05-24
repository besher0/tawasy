import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadsService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadReferenceImage(fileBuffer: Buffer, fileName: string) {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      throw new InternalServerErrorException(
        'Cloudinary is not configured. Set CLOUDINARY_* env vars.',
      );
    }

    return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'sugarprecision/order-references',
          public_id: `${Date.now()}-${fileName.replace(/\s+/g, '-')}`,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Upload failed'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      stream.end(fileBuffer);
    });
  }
}