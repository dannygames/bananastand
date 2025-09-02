// API Configuration for React Native App
// This file centralizes all API endpoint configurations

// Environment detection
const isDevelopment = __DEV__;

// API Base URLs
export const API_CONFIG = {
  // Production API (deployed Next.js app)
  PRODUCTION_URL: 'https://banana-stand.vercel.app/api',
  
  // Development API (local Next.js server)
  DEVELOPMENT_URL: 'http://localhost:3000/api',
  
  // Current API URL based on environment
  get BASE_URL() {
    return isDevelopment ? this.DEVELOPMENT_URL : this.PRODUCTION_URL;
  }
};

// API Endpoints
export const ENDPOINTS = {
  UPLOAD_IMAGE: '/upload',
  GENERATE_VIDEO: '/generate-video',
} as const;

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// API response types
export interface UploadResponse {
  success: boolean;
  presignedUrl?: string;
  publicUrl?: string;
  fileName?: string;
  error?: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  predictionId?: string;
  status?: string;
  output?: string;
  error?: string;
  createdAt?: string;
  startedAt?: string;
  completedAt?: string;
}

// API utility functions
export class ApiService {
  static async uploadImage(imageUri: string): Promise<string> {
    try {
      // Step 1: Get presigned URL from your API
      const fileName = `image_${Date.now()}.jpg`;
      const contentType = 'image/jpeg';
      
      const presignedResponse = await fetch(buildApiUrl(ENDPOINTS.UPLOAD_IMAGE), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName,
          contentType,
        }),
      });

      if (!presignedResponse.ok) {
        const errorText = await presignedResponse.text();
        throw new Error(`Failed to get upload URL (${presignedResponse.status}): ${errorText}`);
      }

      const { presignedUrl, publicUrl } = await presignedResponse.json();

      // Step 2: Upload directly to R2 using presigned URL
      const imageFile = {
        uri: imageUri,
        type: contentType,
        name: fileName,
      };

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: imageFile as any,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload to R2 failed (${uploadResponse.status})`);
      }

      // Return the public URL where the file is now accessible
      return publicUrl;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  static async startVideoGeneration(imageUrl: string): Promise<VideoGenerationResponse> {
    const response = await fetch(buildApiUrl(ENDPOINTS.GENERATE_VIDEO), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video generation failed (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  static async checkVideoStatus(predictionId: string): Promise<VideoGenerationResponse> {
    const response = await fetch(`${buildApiUrl(ENDPOINTS.GENERATE_VIDEO)}?id=${predictionId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Status check failed (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  static async pollVideoUntilComplete(predictionId: string): Promise<string> {
    console.log('🔄 Polling video status for prediction:', predictionId);
    
    while (true) {
      try {
        const result = await this.checkVideoStatus(predictionId);
        console.log('📊 Polling result:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to check video status');
        }
        
        if (result.status === 'succeeded' && result.output) {
          console.log('✅ Video generation completed!');
          return result.output;
        } else if (result.status === 'failed') {
          throw new Error(result.error || 'Video generation failed');
        } else if (result.status === 'canceled') {
          throw new Error('Video generation was canceled');
        }
        
        // Still processing, wait 3 seconds before next poll
        console.log(`⏳ Video status: ${result.status}, polling again in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
      } catch (error) {
        console.error('❌ Polling error:', error);
        throw error;
      }
    }
  }
}
