import { detectFaceShape, FaceShape, getRecommendedHairstyles, loadFaceDetectionModels } from '@/lib/faceShapeDetection';
import { useCallback, useEffect, useState } from 'react';

export function useFaceShapeDetection() {
  const [isLoading, setIsLoading] = useState(false);
  const [faceShape, setFaceShape] = useState<FaceShape | null>(null);
  const [recommendedHairstyles, setRecommendedHairstyles] = useState<number[]>([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBrowser, setIsBrowser] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Check if running in browser
  useEffect(() => {
    setIsBrowser(typeof window !== 'undefined');
  }, []);

  // Load face detection models
  useEffect(() => {
    if (!isBrowser) return; // Skip on server-side rendering
    
    async function loadModels() {
      if (!modelsLoaded) {
        try {
          setIsLoading(true);
          const success = await loadFaceDetectionModels();
          
          if (success) {
            setModelsLoaded(true);
            setError(null);
          } else {
            // Retry loading up to 3 times
            if (retryCount < 3) {
              console.log(`Retry attempt ${retryCount + 1} to load models`);
              setRetryCount(prev => prev + 1);
              // Will trigger this effect again with increased retry count
            } else {
              setError('Failed to load face detection models after multiple attempts. Recommendation feature may not work properly.');
            }
          }
        } catch (err) {
          console.error('Failed to load models:', err);
          setError('Failed to load face detection models. Recommendation feature may not work properly.');
        } finally {
          setIsLoading(false);
        }
      }
    }

    loadModels();
  }, [modelsLoaded, isBrowser, retryCount]);

  // Detect face shape from image
  const detectFace = useCallback(async (imageUrl: string): Promise<void> => {
    if (!isBrowser) return; // Skip on server-side rendering
    
    // Let's continue even if models aren't fully loaded yet
    // The detectFaceShape function will try to load them if needed
    
    setIsLoading(true);
    setError(null);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });

      console.log('Image loaded, detecting face shape...');
      const detectedShape = await detectFaceShape(img);
      
      if (detectedShape) {
        console.log('Face shape detected:', detectedShape);
        setFaceShape(detectedShape);
        const recommendations = getRecommendedHairstyles(detectedShape);
        setRecommendedHairstyles(recommendations);
      } else {
        setError('No face detected in the image. Please try a clearer photo.');
      }
    } catch (err) {
      console.error('Error during face detection:', err);
      setError('Error analyzing face shape. Please try again with a different photo.');
    } finally {
      setIsLoading(false);
    }
  }, [isBrowser]);

  return {
    isLoading,
    faceShape,
    recommendedHairstyles,
    detectFace,
    error,
    modelsLoaded,
  };
} 