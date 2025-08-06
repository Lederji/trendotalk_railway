import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import { posts, vibes, stories } from "@shared/schema";
import { db } from "./db";
import { eq, lt, sql } from "drizzle-orm";

// Set the ffmpeg path
if (ffmpegInstaller) {
  ffmpeg.setFfmpegPath(ffmpegInstaller);
}

/**
 * Trim video to maximum 60 seconds
 */
export async function trimVideo(inputBuffer: Buffer, maxDuration: number = 60): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const tempInputPath = path.join(process.cwd(), 'uploads', `temp_input_${Date.now()}.mp4`);
    const tempOutputPath = path.join(process.cwd(), 'uploads', `temp_output_${Date.now()}.mp4`);
    
    try {
      // Write buffer to temporary file
      fs.writeFileSync(tempInputPath, inputBuffer);
      
      ffmpeg(tempInputPath)
        .duration(maxDuration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .outputOptions([
          '-movflags faststart', // Enable fast start for web playback
          '-preset fast',        // Fast encoding preset
          '-crf 23'             // Good quality compression
        ])
        .on('end', () => {
          try {
            const outputBuffer = fs.readFileSync(tempOutputPath);
            
            // Clean up temporary files
            fs.unlinkSync(tempInputPath);
            fs.unlinkSync(tempOutputPath);
            
            resolve(outputBuffer);
          } catch (error) {
            console.error('Error reading processed video:', error);
            reject(error);
          }
        })
        .on('error', (err: any) => {
          console.error('FFmpeg error:', err);
          
          // Clean up temporary files
          try {
            fs.unlinkSync(tempInputPath);
            if (fs.existsSync(tempOutputPath)) {
              fs.unlinkSync(tempOutputPath);
            }
          } catch (cleanupError) {
            console.error('Error cleaning up temporary files:', cleanupError);
          }
          
          reject(err);
        })
        .save(tempOutputPath);
    } catch (error) {
      console.error('Error in trimVideo:', error);
      reject(error);
    }
  });
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(inputBuffer: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const tempInputPath = path.join(process.cwd(), 'uploads', `temp_duration_${Date.now()}.mp4`);
    
    try {
      // Write buffer to temporary file
      fs.writeFileSync(tempInputPath, inputBuffer);
      
      ffmpeg.ffprobe(tempInputPath, (err: any, metadata: any) => {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempInputPath);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
        
        if (err) {
          console.error('FFprobe error:', err);
          reject(err);
          return;
        }
        
        const duration = metadata.format.duration || 0;
        resolve(duration);
      });
    } catch (error) {
      console.error('Error in getVideoDuration:', error);
      reject(error);
    }
  });
}

/**
 * Process video: trim if longer than 60 seconds
 */
export async function processVideo(inputBuffer: Buffer): Promise<Buffer> {
  try {
    // Get video duration
    const duration = await getVideoDuration(inputBuffer);
    console.log(`Video duration: ${duration} seconds`);
    
    // If video is longer than 60 seconds, trim it
    if (duration > 60) {
      console.log(`✂️ Video is ${duration}s long, trimming to 60s for Play Store compliance...`);
      return await trimVideo(inputBuffer, 60);
    }
    
    // If video is 60 seconds or less, return as is
    console.log(`✅ Video is ${duration}s - within 60s limit, uploading without changes`);
    return inputBuffer;
  } catch (error) {
    console.error('Error processing video:', error);
    // If processing fails, return original buffer
    return inputBuffer;
  }
}

/**
 * Delete videos older than 72 hours from database and Cloudinary
 */
export async function deleteOldVideos(): Promise<void> {
  try {
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
    console.log(`Deleting videos older than: ${seventyTwoHoursAgo.toISOString()}`);
    
    // Find old posts with videos
    const oldPosts = await db
      .select()
      .from(posts)
      .where(
        sql`${posts.createdAt} < ${seventyTwoHoursAgo} AND (${posts.videoUrl} IS NOT NULL OR ${posts.video1Url} IS NOT NULL OR ${posts.video2Url} IS NOT NULL OR ${posts.video3Url} IS NOT NULL)`
      );
    
    console.log(`Found ${oldPosts.length} old posts with videos to delete`);
    
    // Delete video URLs from posts
    for (const post of oldPosts) {
      const videosToDelete = [];
      
      if (post.videoUrl) videosToDelete.push(post.videoUrl);
      if (post.video1Url) videosToDelete.push(post.video1Url);
      if (post.video2Url) videosToDelete.push(post.video2Url);
      if (post.video3Url) videosToDelete.push(post.video3Url);
      
      // Delete videos from Cloudinary
      try {
        const cloudinaryModule = await import('./cloudinary');
        const deleteFromCloudinary = cloudinaryModule.deleteFromCloudinary;
        for (const videoUrl of videosToDelete) {
          await deleteFromCloudinary(videoUrl);
          console.log(`Deleted video from Cloudinary: ${videoUrl}`);
        }
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
      }
      
      // Update post to remove video URLs
      await db
        .update(posts)
        .set({
          videoUrl: null,
          video1Url: null,
          video2Url: null,
          video3Url: null
        })
        .where(eq(posts.id, post.id));
      
      console.log(`Removed video URLs from post ${post.id}`);
    }
    
    // Find old vibes with videos
    const oldVibes = await db
      .select()
      .from(vibes)
      .where(
        sql`${vibes.createdAt} < ${seventyTwoHoursAgo} AND ${vibes.videoUrl} IS NOT NULL`
      );
    
    console.log(`Found ${oldVibes.length} old vibes with videos to delete`);
    
    // Delete video URLs from vibes
    for (const vibe of oldVibes) {
      if (vibe.videoUrl) {
        try {
          const cloudinaryModule = await import('./cloudinary');
          const deleteFromCloudinary = cloudinaryModule.deleteFromCloudinary;
          await deleteFromCloudinary(vibe.videoUrl);
          console.log(`Deleted vibe video from Cloudinary: ${vibe.videoUrl}`);
        } catch (cloudinaryError) {
          console.error('Error deleting vibe video from Cloudinary:', cloudinaryError);
        }
        
        // Update vibe to remove video URL
        await db
          .update(vibes)
          .set({ videoUrl: null })
          .where(eq(vibes.id, vibe.id));
        
        console.log(`Removed video URL from vibe ${vibe.id}`);
      }
    }
    
    // Find old stories with videos
    const oldStories = await db
      .select()
      .from(stories)
      .where(
        sql`${stories.createdAt} < ${seventyTwoHoursAgo} AND ${stories.videoUrl} IS NOT NULL`
      );
    
    console.log(`Found ${oldStories.length} old stories with videos to delete`);
    
    // Delete video URLs from stories
    for (const story of oldStories) {
      if (story.videoUrl) {
        try {
          const cloudinaryModule = await import('./cloudinary');
          const deleteFromCloudinary = cloudinaryModule.deleteFromCloudinary;
          await deleteFromCloudinary(story.videoUrl);
          console.log(`Deleted story video from Cloudinary: ${story.videoUrl}`);
        } catch (cloudinaryError) {
          console.error('Error deleting story video from Cloudinary:', cloudinaryError);
        }
        
        // Update story to remove video URL
        await db
          .update(stories)
          .set({ videoUrl: null })
          .where(eq(stories.id, story.id));
        
        console.log(`Removed video URL from story ${story.id}`);
      }
    }
    
    console.log('Old video deletion completed');
  } catch (error) {
    console.error('Error deleting old videos:', error);
  }
}

/**
 * Start the automatic video cleanup job
 * Runs every 6 hours to delete videos older than 72 hours
 */
export function startVideoCleanupJob(): void {
  // Run immediately on startup
  console.log('🎬 TrendoTalk Video Management System Started');
  console.log('✂️  Auto video trimming: Videos longer than 60 seconds will be automatically trimmed');
  console.log('🗑️  Auto cleanup: Videos will be deleted after 72 hours');
  
  deleteOldVideos();
  
  // Then run every 6 hours (6 * 60 * 60 * 1000 ms)
  const cleanupInterval = 6 * 60 * 60 * 1000;
  
  setInterval(() => {
    console.log('🧹 Running scheduled video cleanup job...');
    deleteOldVideos();
  }, cleanupInterval);
  
  console.log('✅ Video cleanup job started - will run every 6 hours');
}