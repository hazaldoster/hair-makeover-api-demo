declare module 'face-api.js' {
  interface Point {
    x: number;
    y: number;
  }

  interface FaceLandmarks {
    getJawOutline(): Point[];
    getNose(): Point[];
    getLeftEye(): Point[];
    getRightEye(): Point[];
    getMouth(): Point[];
  }

  interface WithFaceLandmarks {
    landmarks: FaceLandmarks;
  }

  interface FaceDetection {
    withFaceLandmarks(): Promise<WithFaceLandmarks>;
  }

  interface SsdMobilenetv1 {
    loadFromUri(url: string): Promise<void>;
  }

  interface FaceLandmark68Net {
    loadFromUri(url: string): Promise<void>;
  }

  const nets: {
    ssdMobilenetv1: SsdMobilenetv1;
    faceLandmark68Net: FaceLandmark68Net;
  };

  function detectSingleFace(image: HTMLImageElement): FaceDetection;
} 