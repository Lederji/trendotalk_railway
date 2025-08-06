import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

// Set the ffmpeg path
if (ffmpegInstaller) {
  ffmpeg.setFfmpegPath(ffmpegInstaller);
}

/**
 * Validate video duration and force processing if needed
 * This is a pre-upload check to ensure Play Store compliance
 */
export async function validateAndProcessVideo(inputBuffer: Buffer): Promise<{ buffer: Buffer; wasTrimmed: boolean }> {
  console.log(`🎬 PLAY STORE VALIDATOR: Checking video (${(inputBuffer.length / 1024 / 1024).toFixed(2)}MB)`);
  
  let wasTrimmed = false;
  
  try {
    // Get video duration
    const duration = await getVideoDurationQuick(inputBuffer);
    console.log(`📏 Video duration: ${duration}s`);
    
    // If video is longer than 59 seconds (with 1s buffer), force trim
    if (duration > 59) {
      console.log(`🚫 VIDEO TOO LONG: ${duration}s > 59s limit - MANDATORY TRIMMING`);
      const trimmedBuffer = await forceVideoTrim(inputBuffer);
      console.log(`✂️  Video trimmed from ${duration}s to ≤60s for Play Store compliance`);
      wasTrimmed = true;
      return { buffer: trimmedBuffer, wasTrimmed };
    }
    
    console.log(`✅ Video duration OK: ${duration}s ≤ 59s - no trimming needed`);
    return { buffer: inputBuffer, wasTrimmed };
    
  } catch (error) {
    console.error('❌ Duration detection failed - applying safety trim:', error);
    
    // SAFETY: If we can't detect duration, assume it's long and trim
    const safetyTrimmed = await forceVideoTrim(inputBuffer);
    console.log('🛡️  Safety trim applied - video guaranteed ≤60s');
    wasTrimmed = true;
    return { buffer: safetyTrimmed, wasTrimmed };
  }
}

/**
 * Quick video duration detection
 */
async function getVideoDurationQuick(inputBuffer: Buffer): Promise<number> {
  return new Promise((resolve, reject) => {
    const tempPath = path.join(process.cwd(), 'uploads', `quick_check_${Date.now()}.mp4`);
    
    try {
      fs.writeFileSync(tempPath, inputBuffer);
      
      ffmpeg.ffprobe(tempPath, (err: any, metadata: any) => {
        // Cleanup
        try {
          fs.unlinkSync(tempPath);
        } catch (e) { /* ignore */ }
        
        if (err) {
          reject(new Error(`Duration detection failed: ${err.message}`));
          return;
        }
        
        const duration = metadata?.format?.duration || 0;
        resolve(Math.ceil(duration)); // Round up to be conservative
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Force video trimming to exactly 60 seconds
 */
async function forceVideoTrim(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const inputPath = path.join(process.cwd(), 'uploads', `force_trim_in_${Date.now()}.mp4`);
    const outputPath = path.join(process.cwd(), 'uploads', `force_trim_out_${Date.now()}.mp4`);
    
    try {
      fs.writeFileSync(inputPath, inputBuffer);
      console.log('🔧 Force trimming video to exactly 60 seconds...');
      
      ffmpeg(inputPath)
        .seekInput(0)           // Start from beginning
        .duration(60)           // Take exactly 60 seconds
        .videoCodec('libx264')  // Ensure compatibility
        .audioCodec('aac')      // Ensure compatibility
        .format('mp4')
        .outputOptions([
          '-movflags faststart',
          '-preset faster',     // Faster processing
          '-crf 23',
          '-avoid_negative_ts make_zero',
          '-fflags +genpts'
        ])
        .on('start', () => {
          console.log('⏳ FFmpeg force trim started...');
        })
        .on('end', () => {
          try {
            const trimmedBuffer = fs.readFileSync(outputPath);
            console.log(`✅ Force trim complete: ${(trimmedBuffer.length / 1024 / 1024).toFixed(2)}MB`);
            
            // Cleanup
            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
            
            resolve(trimmedBuffer);
          } catch (error) {
            reject(new Error(`Failed to read trimmed video: ${error}`));
          }
        })
        .on('error', (err: any) => {
          console.error('❌ Force trim failed:', err);
          
          // Cleanup
          try {
            fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
          } catch (e) { /* ignore */ }
          
          reject(new Error(`Video trimming failed: ${err.message}`));
        })
        .save(outputPath);
        
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get readable video info for user feedback
 */
export function getVideoProcessingMessage(wasTrimmed: boolean): string {
  if (wasTrimmed) {
    return 'Video was automatically trimmed to 60 seconds for Play Store compliance.';
  }
  return 'Video uploaded successfully.';
}