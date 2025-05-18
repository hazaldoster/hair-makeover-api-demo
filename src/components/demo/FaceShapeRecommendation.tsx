import { Badge } from '@/components/ui/badge';
import { FaceShape } from '@/lib/faceShapeDetection';
import { InfoIcon } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '../ui/button';

type FaceShapeInfo = {
  [key in FaceShape]: {
    description: string;
    characteristics: string[];
  };
};

const faceShapeInfo: FaceShapeInfo = {
  [FaceShape.OVAL]: {
    description: 'The oval face is considered the ideal shape because of its balanced proportions.',
    characteristics: ['Forehead slightly wider than the chin', 'Face length is about 1.5 times the width'],
  },
  [FaceShape.ROUND]: {
    description: 'Round faces have soft angles and are approximately as wide as they are long.',
    characteristics: ['Full cheeks', 'Rounded jawline', 'Similar width and height'],
  },
  [FaceShape.SQUARE]: {
    description: 'Square faces have strong, angular jawlines and typically equal face width and length.',
    characteristics: ['Strong jawline', 'Minimal curve from forehead to jaw', 'Forehead, cheekbones and jawline are similar widths'],
  },
  [FaceShape.HEART]: {
    description: 'Heart-shaped faces have a wider forehead and cheekbones with a narrow jawline and chin.',
    characteristics: ['Wider forehead', 'Narrow chin', 'High cheekbones'],
  },
  [FaceShape.LONG]: {
    description: 'Long faces are longer than they are wide with little width variation throughout.',
    characteristics: ['Face length greater than width', 'Straight cheek line', 'Narrow chin'],
  },
  [FaceShape.DIAMOND]: {
    description: 'Diamond faces have narrow foreheads and jawlines with wider cheekbones.',
    characteristics: ['Narrow forehead', 'Pointed chin', 'High, wide cheekbones'],
  },
};

interface FaceShapeRecommendationProps {
  faceShape: FaceShape | null;
  recommendedHairstyleIds: number[];
  isLoading: boolean;
  error: string | null;
  onSelectRecommended: (hairstyleIds: number[]) => void;
}

export function FaceShapeRecommendation({
  faceShape,
  recommendedHairstyleIds,
  isLoading,
  error,
  onSelectRecommended,
}: FaceShapeRecommendationProps) {
  useEffect(() => {
    if (recommendedHairstyleIds.length > 0) {
      // Use a timeout to ensure animation effect if user should notice the recommendations
      const timer = setTimeout(() => {
        const recommendSection = document.getElementById('recommendation-section');
        if (recommendSection) {
          recommendSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [recommendedHairstyleIds]);

  if (isLoading) {
    return (
      <div className="mt-4 rounded-md border border-blue-100 bg-blue-50 p-4 text-center">
        <p className="text-sm text-blue-700">Analyzing your face shape...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!faceShape || recommendedHairstyleIds.length === 0) {
    return null;
  }

  const info = faceShapeInfo[faceShape];

  return (
    <div id="recommendation-section" className="mt-6 rounded-lg border border-[#E4E5E6] bg-white p-4">
      <div className="mb-4 flex items-center">
        <InfoIcon className="mr-2 h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-medium text-[#0C0C0C]">Face Shape Analysis</h3>
      </div>
      
      <div className="mb-4">
        <div className="mb-2 flex items-center">
          <span className="mr-2 text-sm font-medium">Your face shape:</span>
          <Badge variant="outline" className="bg-blue-50 font-medium capitalize text-blue-700">
            {faceShape}
          </Badge>
        </div>
        <p className="text-sm text-[#7C7C7C]">{info.description}</p>
        
        <div className="mt-2">
          <p className="text-xs font-medium text-[#0C0C0C]">Characteristics:</p>
          <ul className="mt-1 list-inside list-disc text-xs text-[#7C7C7C]">
            {info.characteristics.map((char, index) => (
              <li key={index}>{char}</li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="mt-4">
        <p className="mb-2 text-sm font-medium text-[#0C0C0C]">
          Based on your face shape, we recommend these hairstyles:
        </p>
        <Button
          onClick={() => onSelectRecommended(recommendedHairstyleIds)}
          variant="outline"
          className="w-full border-blue-200 bg-blue-50 text-sm text-blue-700 hover:bg-blue-100"
        >
          Highlight recommended hairstyles
        </Button>
      </div>
    </div>
  );
} 