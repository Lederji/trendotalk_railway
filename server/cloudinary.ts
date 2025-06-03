import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: 'dmeect7uw',
  api_key: '618798214133158',
  api_secret: '9flyrz7DfdBIAeZbe4X4UQPtYLI'
});

export const uploadToCloudinary = async (file: Express.Multer.File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto', // Automatically detect file type (image/video)
        folder: 'trendotalk',
        quality: 'auto',
        fetch_format: 'auto'
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

export default cloudinary;