// Face shape types
export enum FaceShape {
  OVAL = 'oval',
  ROUND = 'round',
  SQUARE = 'square',
  HEART = 'heart',
  LONG = 'long',
  DIAMOND = 'diamond',
}

// Mapping face shapes to most suitable hairstyles from our selection
export const faceShapeToHairstyles: Record<FaceShape, number[]> = {
  [FaceShape.OVAL]: [1, 3, 5, 7], // Oval faces can pull off most hairstyles
  [FaceShape.ROUND]: [2, 6, 9],   // Hairstyles that lengthen the face
  [FaceShape.SQUARE]: [1, 5, 8],  // Softer hairstyles to balance strong jawline
  [FaceShape.HEART]: [3, 7, 9],   // Hairstyles that balance wider forehead
  [FaceShape.LONG]: [2, 4, 8],    // Hairstyles that add width
  [FaceShape.DIAMOND]: [1, 3, 6], // Hairstyles that soften angular features
};

// Define the Point interface to match face-api.js Point type
interface Point {
  x: number;
  y: number;
}

// Dynamically import face-api.js only on the client side
let faceapi: any = null;
let modelsLoaded = false;

const loadFaceAPI = async () => {
  if (typeof window === 'undefined') return null;
  
  if (!faceapi) {
    const faceApiModule = await import('face-api.js');
    faceapi = faceApiModule.default || faceApiModule;
  }
  
  return faceapi;
};

// Initialize face-api models
export const loadFaceDetectionModels = async () => {
  try {
    if (modelsLoaded) return true;
    
    await loadFaceAPI();
    if (!faceapi) return false;
    
    // Set model location and ensure it doesn't add /model to the end
    const modelUrl = '/models';
    
    console.log('Loading SSD MobileNet model...');
    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl);
    
    console.log('Loading Face Landmark model...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
    
    modelsLoaded = true;
    return true;
  } catch (error) {
    console.error('Error loading face detection models:', error);
    return false;
  }
};

// Analyze an image and detect face shape
export const detectFaceShape = async (imageElement: HTMLImageElement): Promise<FaceShape | null> => {
  try {
    await loadFaceAPI();
    if (!faceapi) return null;
    
    if (!modelsLoaded) {
      console.log('Models not loaded yet, loading them now...');
      const success = await loadFaceDetectionModels();
      if (!success) {
        console.error('Failed to load models');
        return null;
      }
    }
    
    console.log('Detecting face and landmarks...');
    // Use detectAllFaces instead of detectSingleFace and pass the proper options
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
    const detections = await faceapi.detectAllFaces(imageElement, options)
      .withFaceLandmarks();
      
    console.log('Detections:', detections);
    
    if (!detections || detections.length === 0) {
      console.warn('No faces with landmarks detected in the image');
      return null;
    }
    
    // Use the first face detected
    const detection = detections[0];
    const landmarks = detection.landmarks || detection.landmarks;
    
    if (!landmarks) {
      console.warn('No landmarks found in the detection');
      return null;
    }
    
    console.log('Getting facial points...');
    
    // Get facial points
    const jawLine = landmarks.getJawOutline();
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose && landmarks.getNose();
    
    if (!jawLine || !leftEye || !rightEye) {
      console.warn('Missing required facial landmarks');
      return null;
    }
    
    // Create more precise measurements
    // For face width, use the width at cheek level, not the full jawline
    const cheekPointLeft = jawLine[1]; // Point near the ear on left side
    const cheekPointRight = jawLine[15]; // Point near the ear on right side
    const faceWidthAtCheeks = cheekPointRight.x - cheekPointLeft.x;
    
    // Get the cheek fullness by measuring distance from center to side at cheek level
    const faceCenterX = (cheekPointLeft.x + cheekPointRight.x) / 2;
    const midCheekLeft = jawLine[2]; // Mid-point on left cheek
    const midCheekRight = jawLine[14]; // Mid-point on right cheek
    const cheekFullnessLeft = faceCenterX - midCheekLeft.x;
    const cheekFullnessRight = midCheekRight.x - faceCenterX;
    const cheekFullness = (cheekFullnessLeft + cheekFullnessRight) / faceWidthAtCheeks; // Normalized fullness
    
    // For actual face width (including ears), use the full jawline width
    const faceWidth = Math.max(...jawLine.map((pt: Point) => pt.x)) - Math.min(...jawLine.map((pt: Point) => pt.x));
    
    // For face height, use top of forehead to bottom of chin
    const foreheadTop = Math.min(...leftEye.concat(rightEye).map((pt: Point) => pt.y)) - 20; // Estimate top of forehead
    const chinBottom = jawLine[8].y; // Bottom point of chin
    const faceHeight = chinBottom - foreheadTop;
    
    // Calculate round face specific measurements
    // Calculate face circularity (higher for round faces)
    const faceCircularity = Math.min(faceWidth, faceHeight) / Math.max(faceWidth, faceHeight);
    
    // Calculate roundness coefficient (higher for round faces)
    const roundnessCoefficient = (Math.abs(faceWidth - faceHeight) < faceWidth * 0.1) ? 
                               2 : // Very similar width and height
                               1 * (1 - Math.abs(faceWidth - faceHeight) / faceWidth);
    
    // Calculate cheek curvature (another important indicator for round faces)
    const jawCornerLeft = jawLine[3]; // Bottom corner of left jaw
    const jawCornerRight = jawLine[13]; // Bottom corner of right jaw
    const cheekCurvatureLeft = Math.abs(midCheekLeft.y - jawCornerLeft.y) / (faceCenterX - midCheekLeft.x);
    const cheekCurvatureRight = Math.abs(midCheekRight.y - jawCornerRight.y) / (midCheekRight.x - faceCenterX);
    const cheekCurvature = (cheekCurvatureLeft + cheekCurvatureRight) / 2;
    
    // Calculate chin length - distance from mouth bottom to chin bottom
    const mouthBottom = Math.max(...landmarks.getMouth().map((pt: Point) => pt.y));
    const chinLength = chinBottom - mouthBottom;
    
    // Calculate chin ratio - proportion of face that is chin
    const chinRatio = chinLength / faceHeight;
    
    // Check if the facial measurements are valid
    if (faceWidth <= 0 || faceHeight <= 0) {
      console.warn('Invalid facial measurements', { faceWidth, faceHeight });
      return null;
    }
    
    // For jaw width, use the width at the bottom corners of the jaw
    const jawWidth = jawCornerRight.x - jawCornerLeft.x;
    
    // For forehead width, estimate based on eye position and face width
    const eyeMidPoint = (Math.min(...leftEye.map((pt: Point) => pt.x)) + 
                         Math.max(...rightEye.map((pt: Point) => pt.x))) / 2;
    // Using faceCenterX already calculated above
    const eyeWidth = Math.max(...rightEye.map((pt: Point) => pt.x)) - 
                     Math.min(...leftEye.map((pt: Point) => pt.x));
                     
    // More accurate forehead width measurement
    const foreheadWidth = Math.max(eyeWidth * 1.6, faceWidth * 0.85); // Use either eye-based estimate or proportion of total face width
    
    // Get upper face width (at temple level) for more accurate heart shape detection
    const upperFaceWidth = Math.max(foreheadWidth, faceWidth * 0.9);
    
    // Measure jawline curvature (important for round vs oval)
    const jawLeftCorner = jawLine[3]; // Left corner of jaw
    const jawRightCorner = jawLine[13]; // Right corner of jaw
    const jawBottom = jawLine[8]; // Bottom point of chin
    
    // Calculate jaw angle by measuring the interior angle at the chin
    // First, get vectors from chin to each jaw corner
    const leftVector = {
      x: jawLeftCorner.x - jawBottom.x,
      y: jawLeftCorner.y - jawBottom.y
    };
    const rightVector = {
      x: jawRightCorner.x - jawBottom.x,
      y: jawRightCorner.y - jawBottom.y
    };
    
    // Calculate magnitudes of these vectors
    const leftMagnitude = Math.sqrt(leftVector.x * leftVector.x + leftVector.y * leftVector.y);
    const rightMagnitude = Math.sqrt(rightVector.x * rightVector.x + rightVector.y * rightVector.y);
    
    // Calculate dot product
    const dotProduct = leftVector.x * rightVector.x + leftVector.y * rightVector.y;
    
    // Calculate cosine of angle between vectors
    const cosAngle = dotProduct / (leftMagnitude * rightMagnitude);
    
    // Calculate the jaw angle in degrees (higher = more pointed, lower = more rounded)
    const jawAngle = Math.acos(cosAngle) * (180 / Math.PI);
    
    // Calculate jaw roundness as the inverse of the jaw angle (higher = more round)
    const jawRoundness = 180 - jawAngle;
    
    // Calculate ratios
    const widthToHeightRatio = faceWidth / faceHeight;
    const jawToForeheadRatio = jawWidth / foreheadWidth;
    
    // Calculate additional ratios for heart-shaped face detection
    const foreheadToJawRatio = foreheadWidth / jawWidth;
    const upperToLowerFaceWidthRatio = upperFaceWidth / jawWidth;
    
    // Calculate face width at different points to determine if it's diamond-shaped or heart-shaped
    const topThirdWidth = foreheadWidth;
    const midThirdWidth = faceWidthAtCheeks;
    const bottomThirdWidth = jawWidth;
    
    // Calculate chin pointedness (important for heart-shaped faces)
    const chinPointedness = jawAngle;
    
    // Calculate face tapering (ratio of width reduction from forehead to jaw)
    const faceTapering = (foreheadWidth - jawWidth) / foreheadWidth;
    
    console.log('Facial measurements:', { 
      faceWidth, 
      faceHeight, 
      jawWidth, 
      foreheadWidth,
      upperFaceWidth,
      upperToLowerFaceWidthRatio,
      faceTapering,
      chinPointedness 
    });
    console.log('Ratios:', { 
      widthToHeightRatio, 
      jawToForeheadRatio,
      foreheadToJawRatio 
    });
    
    // Determine face shape based on measurements and ratios
    console.log('Determining face shape with:', {
      widthToHeightRatio,
      jawToForeheadRatio,
      foreheadToJawRatio,
      upperToLowerFaceWidthRatio,
      topThirdWidth,
      midThirdWidth,
      bottomThirdWidth,
      faceHeight,
      chinLength,
      chinRatio,
      cheekFullness,
      jawAngle,
      jawRoundness,
      chinPointedness,
      faceTapering
    });
    
    // More balanced approach to face shape detection
    // We'll use a scoring system to determine the most likely face shape
    const scores = {
      [FaceShape.OVAL]: 0,
      [FaceShape.ROUND]: 0,
      [FaceShape.SQUARE]: 0,
      [FaceShape.HEART]: 0,
      [FaceShape.LONG]: 0,
      [FaceShape.DIAMOND]: 0
    };
    
    // Width to height ratio scoring - key for oval vs round vs long
    // REVISED: More strict criteria for round faces and adjusted oval face criteria
    if (widthToHeightRatio > 0.95) {
      scores[FaceShape.ROUND] += 5; // Extremely round face
      scores[FaceShape.OVAL] -= 3; // Strongly penalize oval score for very wide faces
      console.log('Very high width-to-height ratio indicates round face');
    } else if (widthToHeightRatio >= 0.85 && widthToHeightRatio <= 0.95) {
      scores[FaceShape.ROUND] += 3; // Clearly round
      scores[FaceShape.OVAL] -= 1; // Slightly penalize oval
      console.log('High width-to-height ratio indicates round face');
    } else if (widthToHeightRatio >= 0.78 && widthToHeightRatio < 0.85) {
      scores[FaceShape.ROUND] += 1;
      // Neutral for oval, could be borderline
    } else if (widthToHeightRatio >= 0.67 && widthToHeightRatio < 0.75) {
      // MODIFIED: Narrowed ideal oval ratio range and reduced points
      scores[FaceShape.OVAL] += 2; // Reduced from 3 to make oval less distinct
      console.log('Width-to-height ratio in range for oval face');
    } else if (widthToHeightRatio <= 0.67 && widthToHeightRatio >= 0.62) {
      scores[FaceShape.LONG] += 2;
      scores[FaceShape.OVAL] += 1; // Still allow some oval possibility
    } else if (widthToHeightRatio < 0.62) {
      scores[FaceShape.LONG] += 4; // Increased score for very long face
      scores[FaceShape.OVAL] -= 1; // Penalize oval for very narrow faces
    }
    
    // Additional round face indicators based on new measurements
    // Round face coefficient scoring - very strong indicator
    if (roundnessCoefficient > 0.85) {
      scores[FaceShape.ROUND] += 8; // Very strong indicator of round face
      scores[FaceShape.OVAL] -= 3;
      console.log('Very high roundness coefficient strongly indicates round face');
    } else if (roundnessCoefficient > 0.75) {
      scores[FaceShape.ROUND] += 5;
      scores[FaceShape.OVAL] -= 2;
      console.log('High roundness coefficient indicates round face');
    } else if (roundnessCoefficient > 0.65) {
      scores[FaceShape.ROUND] += 2;
      console.log('Moderate roundness coefficient suggests possible round face');
    }

    // Face circularity scoring - strong indicator for round faces
    if (faceCircularity > 0.95) {
      scores[FaceShape.ROUND] += 7;
      scores[FaceShape.OVAL] -= 3;
      console.log('Very high face circularity strongly indicates round face');
    } else if (faceCircularity > 0.9) {
      scores[FaceShape.ROUND] += 5;
      scores[FaceShape.OVAL] -= 2;
      console.log('High face circularity indicates round face');
    } else if (faceCircularity > 0.85) {
      scores[FaceShape.ROUND] += 3;
      scores[FaceShape.OVAL] -= 1;
      console.log('Moderate face circularity suggests possible round face');
    }

    // Cheek curvature scoring - good indicator for round faces
    if (cheekCurvature < 0.4) { // Flatter curve indicates round
      scores[FaceShape.ROUND] += 4;
      scores[FaceShape.OVAL] -= 2;
      console.log('Low cheek curvature indicates round face with full cheeks');
    } else if (cheekCurvature < 0.6) {
      scores[FaceShape.ROUND] += 2;
      scores[FaceShape.OVAL] -= 1;
      console.log('Moderate cheek curvature may suggest round face');
    }
    
    // Jaw to forehead ratio - important for heart, square, and oval
    if (jawToForeheadRatio > 0.92 && jawToForeheadRatio < 1.08) {
      // MODIFIED: Narrowed balanced proportion range and reduced points
      scores[FaceShape.OVAL] += 1; // Reduced from 2 to make oval less distinct
      scores[FaceShape.ROUND] += (widthToHeightRatio > 0.85) ? 1 : 0;
    } else if (jawToForeheadRatio >= 1.08 && jawToForeheadRatio < 1.18) {
      scores[FaceShape.SQUARE] += 3; // Increased score for square
    } else if (jawToForeheadRatio >= 1.18) {
      scores[FaceShape.SQUARE] += 4; // Increased from 3 to make square more distinct
    } else if (jawToForeheadRatio <= 0.92 && jawToForeheadRatio > 0.82) {
      scores[FaceShape.HEART] += 2; // Increased score for slight heart indicator
    } else if (jawToForeheadRatio <= 0.82 && jawToForeheadRatio > 0.72) {
      scores[FaceShape.HEART] += 3; // Increased from 2 to make heart more distinct
    } else if (jawToForeheadRatio <= 0.72) {
      scores[FaceShape.HEART] += 4; // Increased from 3 to make heart more distinct
    }
    
    // Enhanced heart shape detection using multiple measurements
    // Heart-shaped faces have wider foreheads and temples but narrow jaws
    if (foreheadToJawRatio > 1.15 && foreheadToJawRatio < 1.3) {
      scores[FaceShape.HEART] += 2;
      console.log('Forehead-to-jaw ratio indicates possible heart shape');
    } else if (foreheadToJawRatio >= 1.3) {
      scores[FaceShape.HEART] += 4;
      scores[FaceShape.OVAL] -= 1;
      console.log('High forehead-to-jaw ratio strongly indicates heart shape');
    }
    
    // Upper to lower face width ratio - key for heart shape
    if (upperToLowerFaceWidthRatio > 1.2 && upperToLowerFaceWidthRatio < 1.35) {
      scores[FaceShape.HEART] += 2;
      console.log('Upper-to-lower face width ratio indicates possible heart shape');
    } else if (upperToLowerFaceWidthRatio >= 1.35) {
      scores[FaceShape.HEART] += 4;
      scores[FaceShape.OVAL] -= 2;
      console.log('High upper-to-lower face width ratio strongly indicates heart shape');
    }
    
    // Face tapering - significant tapering indicates heart shape
    if (faceTapering > 0.25 && faceTapering < 0.35) {
      scores[FaceShape.HEART] += 2;
      console.log('Face tapering indicates possible heart shape');
    } else if (faceTapering >= 0.35) {
      scores[FaceShape.HEART] += 3;
      scores[FaceShape.OVAL] -= 1;
      console.log('Significant face tapering indicates heart shape');
    }
    
    // Chin pointedness is often associated with heart-shaped faces
    if (chinPointedness > 65 && chinPointedness < 75) {
      scores[FaceShape.HEART] += 1;
      console.log('Somewhat pointed chin may suggest heart shape');
    } else if (chinPointedness >= 75) {
      scores[FaceShape.HEART] += 2;
      console.log('Pointed chin suggests heart shape');
    }
    
    // Diamond shape detection using width at different points
    // Diamond shape has wider middle third compared to top and bottom
    if (midThirdWidth > topThirdWidth && midThirdWidth > bottomThirdWidth) {
      const diamondRatio1 = midThirdWidth / topThirdWidth;
      const diamondRatio2 = midThirdWidth / bottomThirdWidth;
      
      if (diamondRatio1 > 1.15 && diamondRatio2 > 1.15) {
        scores[FaceShape.DIAMOND] += 4; // Increased from 3 to make diamond more distinct
      } else if (diamondRatio1 > 1.10 && diamondRatio2 > 1.10) {
        scores[FaceShape.DIAMOND] += 3; // Increased from 2 to make diamond more distinct
      } else if (diamondRatio1 > 1.05 && diamondRatio2 > 1.05) {
        scores[FaceShape.DIAMOND] += 1;
      }
    }
    
    // Additional checks based on common characteristics
    
    // Square faces typically have strong jawlines and similar width throughout
    if (Math.abs(topThirdWidth - bottomThirdWidth) < topThirdWidth * 0.10) {
      scores[FaceShape.SQUARE] += 2; // Increased from 1 to make square more distinct
    }
    
    // Heart-shaped faces have wider forehead and narrower chin
    if (topThirdWidth > bottomThirdWidth * 1.2 && topThirdWidth < bottomThirdWidth * 1.4) {
      scores[FaceShape.HEART] += 2;
      console.log('Forehead width to jaw width ratio indicates heart shape');
    } else if (topThirdWidth >= bottomThirdWidth * 1.4) {
      scores[FaceShape.HEART] += 3;
      scores[FaceShape.OVAL] -= 1;
      console.log('Very wide forehead compared to jaw strongly indicates heart shape');
    }
    
    // Oval faces have balanced proportions
    // MODIFIED: Made thresholds more stringent and reduced scores
    if (Math.abs(jawToForeheadRatio - 1.0) < 0.08 && 
        widthToHeightRatio > 0.67 && widthToHeightRatio < 0.75) {
      scores[FaceShape.OVAL] += 1; // Reduced from 2 to make oval less distinct
    }
    
    // *** Additional round vs oval face discriminators based on new measurements ***
    
    // Cheek fullness is a strong indicator of round vs oval faces
    if (cheekFullness > 0.45) { // Very full cheeks
      scores[FaceShape.ROUND] += 4;
      scores[FaceShape.OVAL] -= 2;
      console.log('Very high cheek fullness indicates round face');
    } else if (cheekFullness > 0.4 && cheekFullness <= 0.45) { // Moderately full cheeks
      scores[FaceShape.ROUND] += 2;
      scores[FaceShape.OVAL] -= 1;
      console.log('High cheek fullness indicates round face');
    } else if (cheekFullness > 0.32 && cheekFullness <= 0.37) { // Moderate cheek fullness
      // MODIFIED: Added moderate range that could be oval or other shapes
      scores[FaceShape.OVAL] += 1;
      console.log('Moderate cheek fullness may suggest oval face');
    } else if (cheekFullness < 0.32) { // Less full cheeks
      // MODIFIED: Lowered threshold and added points for long face
      scores[FaceShape.OVAL] += 1; // Reduced from 2
      scores[FaceShape.LONG] += 1; // Also can indicate long face
      console.log('Low cheek fullness suggests oval or long face');
    }
    
    // Jaw angle/roundness is a good indicator of round vs oval
    if (jawRoundness < 115) { // Very pointed chin
      scores[FaceShape.OVAL] += 2; // Reduced from 3
      scores[FaceShape.ROUND] -= 2;
      scores[FaceShape.HEART] += 1;
      console.log('Very low jaw roundness (pointed chin) indicates oval face or possibly heart');
    } else if (jawRoundness < 125) { // Moderately pointed chin
      scores[FaceShape.OVAL] += 1; // Reduced from 2
      scores[FaceShape.ROUND] -= 1;
      console.log('Low jaw roundness (more pointed chin) indicates oval face');
    } else if (jawRoundness > 145) { // Very rounded jawline
      scores[FaceShape.ROUND] += 4;
      scores[FaceShape.OVAL] -= 2;
      scores[FaceShape.HEART] -= 1;
      console.log('Very high jaw roundness indicates round face');
    } else if (jawRoundness > 135 && jawRoundness <= 145) { // Moderately rounded jawline
      scores[FaceShape.ROUND] += 2;
      scores[FaceShape.OVAL] -= 1;
      console.log('High jaw roundness indicates round face');
    }
    
    // *** DEFINITIVE HEART SHAPE CHECK ***
    const DEFINITIVE_HEART_FOREHEAD_JAW_RATIO = 1.4;
    const DEFINITIVE_HEART_TAPERING = 0.4;

    // Check if face has extremely heart-like proportions
    if ((foreheadToJawRatio >= DEFINITIVE_HEART_FOREHEAD_JAW_RATIO && faceTapering >= 0.3) || 
        (faceTapering >= DEFINITIVE_HEART_TAPERING && foreheadToJawRatio >= 1.25)) {
      // Set extremely high score for heart to ensure it wins
      scores[FaceShape.HEART] = 100;
      // Reset other scores to ensure heart wins
      scores[FaceShape.OVAL] = 0;
      scores[FaceShape.ROUND] = 0;
      scores[FaceShape.SQUARE] = 0;
      scores[FaceShape.LONG] = 0;
      scores[FaceShape.DIAMOND] = 0;
      
      console.log(`DEFINITIVE RULE: Forehead-to-jaw ratio ${foreheadToJawRatio} and face tapering ${faceTapering} indicate DEFINITIVE heart shape`);
      
      // Skip remaining scoring - this is a definitive decision
    } 
    // *** DEFINITIVE ROUND FACE CHECK ***
    else if ((faceCircularity > 0.95 && roundnessCoefficient > 0.85) || 
             (widthToHeightRatio > 0.95 && cheekFullness > 0.45)) {
      // Set extremely high score for round to ensure it wins
      scores[FaceShape.ROUND] = 100;
      // Reset other scores to ensure round wins
      scores[FaceShape.OVAL] = 0;
      scores[FaceShape.HEART] = 0;
      scores[FaceShape.SQUARE] = 0;
      scores[FaceShape.LONG] = 0;
      scores[FaceShape.DIAMOND] = 0;
      
      console.log(`DEFINITIVE RULE: Face circularity ${faceCircularity}, roundness coefficient ${roundnessCoefficient} and width-to-height ratio ${widthToHeightRatio} indicate DEFINITIVE round face`);
      
      // Skip remaining scoring - this is a definitive decision
    }
    // *** DEFINITIVE CHIN RATIO CHECK - Made more stringent ***
    else if (chinRatio >= 0.17) { // Raised from 0.15 to make oval classification more stringent
      // Reduced certainty for oval face
      scores[FaceShape.OVAL] += 15; // Was 100, now just gives a large boost
      
      console.log(`High chin ratio ${chinRatio} >= 0.17 strongly suggests oval face`);
    } 
    // For faces with chin ratio below the definitive threshold
    else {
      console.log(`Chin ratio ${chinRatio} is below threshold 0.17 for strong oval indicator`);
      
      // Small/short chin is a strong indicator of round face
      if (chinRatio < 0.10) { // Chin takes up less than 10% of face height (stricter threshold)
        scores[FaceShape.ROUND] += 5;
        scores[FaceShape.OVAL] -= 3;
        console.log('Very short chin detected, strongly favoring round face');
      } else if (chinRatio >= 0.10 && chinRatio < 0.12) { // Moderately short chin
        scores[FaceShape.ROUND] += 3;
        scores[FaceShape.OVAL] -= 1;
        console.log('Short chin detected, favoring round face');
      }
      // Moderate chin length
      else if (chinRatio >= 0.12 && chinRatio < 0.15) {
        scores[FaceShape.OVAL] += 1;
        console.log('Moderate chin ratio slightly suggests oval face');
      } else if (chinRatio >= 0.15 && chinRatio < 0.17) {
        scores[FaceShape.OVAL] += 2;
        console.log('Good chin ratio suggests oval face');
      }
    }
    
    // Find the face shape with the highest score
    let maxScore = 0;
    let detectedShape = FaceShape.OVAL; // Default to oval
    
    for (const [shape, score] of Object.entries(scores)) {
      console.log(`Shape: ${shape}, Score: ${score}`);
      if (score > maxScore) {
        maxScore = score;
        detectedShape = shape as FaceShape;
      }
    }
    
    // Check for close scores and implement tiebreakers
    const sortedScores = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([shape, score]) => ({ shape, score }));
      
    const topShape = sortedScores[0];
    const secondShape = sortedScores[1];
    
    // If top two scores are close, consider more nuanced decision
    if (secondShape.score > 0 && (topShape.score - secondShape.score) <= 3) {
      console.log(`Top two shapes are close: ${topShape.shape} (${topShape.score}) and ${secondShape.shape} (${secondShape.score})`);
      
      // Special handling for close oval/heart scores
      if ((topShape.shape === FaceShape.OVAL && secondShape.shape === FaceShape.HEART) ||
          (topShape.shape === FaceShape.HEART && secondShape.shape === FaceShape.OVAL)) {
        console.log("Oval and heart scores are very close. Using definitive measurements to decide.");
        
        // For truly ambiguous cases, use definitive criteria
        if (foreheadToJawRatio > 1.22) { // Lowered from 1.25 to favor heart
          detectedShape = FaceShape.HEART;
          console.log("Final decision: HEART based on forehead-to-jaw ratio");
        } else if (faceTapering > 0.28) { // Lowered from 0.3 to favor heart
          detectedShape = FaceShape.HEART;
          console.log("Final decision: HEART based on face tapering");
        } else if (upperToLowerFaceWidthRatio > 1.18) { // Lowered from 1.2 to favor heart
          detectedShape = FaceShape.HEART;
          console.log("Final decision: HEART based on upper-to-lower face width ratio");
        } else if (chinPointedness > 68) { // Lowered from 70 to favor heart
          detectedShape = FaceShape.HEART;
          console.log("Final decision: HEART based on pointed chin");
        } else if (Math.abs(jawToForeheadRatio - 1.0) < 0.12 && chinRatio > 0.15) {
          detectedShape = FaceShape.OVAL;
          console.log("Final decision: OVAL based on balanced proportions and good chin ratio");
        }
      }
      
      // Special handling for close oval/round scores
      if ((topShape.shape === FaceShape.OVAL && secondShape.shape === FaceShape.ROUND) ||
          (topShape.shape === FaceShape.ROUND && secondShape.shape === FaceShape.OVAL)) {
        console.log("Oval and round scores are very close. Using definitive measurements to decide.");
        
        // Adjusted thresholds to favor round over oval in borderline cases
        if (widthToHeightRatio > 0.8) { // Lowered from 0.82 to favor round even more
          detectedShape = FaceShape.ROUND;
          console.log("Final decision: ROUND based on width-to-height ratio");
        } else if (widthToHeightRatio < 0.7) { // Adjusted from 0.72 to make oval range smaller
          detectedShape = FaceShape.OVAL;
          console.log("Final decision: OVAL based on width-to-height ratio");
        } else if (jawRoundness > 130) { // Lowered from 135 to favor round even more
          detectedShape = FaceShape.ROUND;
          console.log("Final decision: ROUND based on jaw roundness");
        } else if (faceCircularity > 0.87) { // New check to favor round
          detectedShape = FaceShape.ROUND;
          console.log("Final decision: ROUND based on face circularity");
        } else if (roundnessCoefficient > 0.7) { // New check to favor round
          detectedShape = FaceShape.ROUND;
          console.log("Final decision: ROUND based on roundness coefficient");
        } else if (chinRatio > 0.16) { // Unchanged
          detectedShape = FaceShape.OVAL;
          console.log("Final decision: OVAL based on chin length");
        } else if (cheekFullness < 0.33) { // Unchanged
          detectedShape = FaceShape.OVAL;
          console.log("Final decision: OVAL based on low cheek fullness");
        } else if (cheekFullness > 0.38) { // Lowered from 0.4 to favor round even more
          detectedShape = FaceShape.ROUND;
          console.log("Final decision: ROUND based on high cheek fullness");
        } else {
          detectedShape = FaceShape.ROUND; // Default to round in truly ambiguous cases
          console.log("Final decision: ROUND by default in ambiguous case");
        }
      }
      
      // Special handling for oval/long scores
      if ((topShape.shape === FaceShape.OVAL && secondShape.shape === FaceShape.LONG) ||
          (topShape.shape === FaceShape.LONG && secondShape.shape === FaceShape.OVAL)) {
        console.log("Oval and long scores are very close. Using definitive measurements to decide.");
        
        if (widthToHeightRatio < 0.65) {
          detectedShape = FaceShape.LONG;
          console.log("Final decision: LONG based on low width-to-height ratio");
        } else if (widthToHeightRatio > 0.72) {
          detectedShape = FaceShape.OVAL;
          console.log("Final decision: OVAL based on width-to-height ratio");
        } else {
          detectedShape = FaceShape.LONG; // Default to long in ambiguous cases
          console.log("Final decision: LONG by default in ambiguous case");
        }
      }
      
      // Special handling for oval/square scores
      if ((topShape.shape === FaceShape.OVAL && secondShape.shape === FaceShape.SQUARE) ||
          (topShape.shape === FaceShape.SQUARE && secondShape.shape === FaceShape.OVAL)) {
        
        if (jawToForeheadRatio > 1.05) {
          detectedShape = FaceShape.SQUARE;
          console.log("Final decision: SQUARE based on jaw to forehead ratio");
        } else if (Math.abs(topThirdWidth - bottomThirdWidth) < topThirdWidth * 0.12) {
          detectedShape = FaceShape.SQUARE;
          console.log("Final decision: SQUARE based on similar widths throughout face");
        }
      }
    }
    
    console.log('Detected face shape:', detectedShape, 'with score:', maxScore);
    
    // If no clear winner (max score is 0), default to round instead of oval
    if (maxScore === 0) {
      console.log('No clear face shape detected, defaulting to round instead of oval');
      return FaceShape.ROUND;
    }
    
    return detectedShape;
  } catch (error) {
    console.error('Error detecting face shape:', error);
    return null;
  }
};

// Get recommended hairstyles based on face shape
export const getRecommendedHairstyles = (faceShape: FaceShape): number[] => {
  return faceShapeToHairstyles[faceShape] || [];
}; 