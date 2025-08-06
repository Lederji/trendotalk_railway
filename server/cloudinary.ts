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
}

/**
 * Delete a resource from Cloudinary using its URL
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Extract public_id from Cloudinary URL
    // Example URL: https://res.cloudinary.com/your-cloud-name/video/upload/v1234567890/folder/filename.mp4
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1 || uploadIndex + 2 >= urlParts.length) {
      console.log('Could not extract public_id from URL:', url);
      resolve(); // Don't fail the operation if URL parsing fails
      return;
    }
    
    // Get everything after the version number
    const pathWithExtension = urlParts.slice(uploadIndex + 2).join('/');
    // Remove file extension
    const publicId = pathWithExtension.replace(/\.[^/.]+$/, '');
    
    console.log(`Deleting from Cloudinary with public_id: ${publicId}`);
    
    // Determine resource type from URL
    let resourceType: 'image' | 'video' | 'raw' = 'image';
    if (url.includes('/video/')) {
      resourceType = 'video';
    } else if (url.includes('/raw/')) {
      resourceType = 'raw';
    }
    
    cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error: any, result: any) => {
      if (error) {
        console.error('Error deleting from Cloudinary:', error);
        // Don't reject - we still want to continue with database cleanup
        resolve();
      } else {
        console.log('Successfully deleted from Cloudinary:', result);
        resolve();
      }
    });
  });
};

export default cloudinary;