import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

type HairstyleSelectorProps = {
  onSelect: (hairstyleId: number) => void;
  recommendedIds?: number[];
};

export function HairstyleSelector({ onSelect, recommendedIds = [] }: HairstyleSelectorProps) {
  const [selectedHairstyle, setSelectedHairstyle] = useState<number | null>(null);
  const [showRecommendations, setShowRecommendations] = useState(false);

  useEffect(() => {
    // Show recommendations when they're passed in and there are some
    setShowRecommendations(recommendedIds.length > 0);
  }, [recommendedIds]);

  const hairstyles = Array.from({ length: 9 }, (_, id) => ({
    id: id + 1,
    src: `/images/hairstyles/${id + 1}.jpeg`,
    isRecommended: recommendedIds.includes(id + 1)
  }));

  const handleSelect = (id: number) => {
    if (selectedHairstyle === id) {
      setSelectedHairstyle(null);
      onSelect(-1); // -1 indicates no selection
    } else {
      setSelectedHairstyle(id);
      onSelect(id);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4"
        role="radiogroup"
        aria-label="Hairstyle options"
      >
        {hairstyles.map(hairstyle => (
          <div key={hairstyle.id} className="relative">
            <button
              type="button"
              onClick={() => handleSelect(hairstyle.id)}
              className={cn(
                'mx-auto h-[100px] w-[100px] cursor-pointer overflow-hidden rounded-full border transition-all duration-300 focus:outline-none sm:h-30 sm:w-30',
                selectedHairstyle === hairstyle.id ? 'border-[#000000] border-2' : 'border-[#E4E5E6]',
                hairstyle.isRecommended && showRecommendations ? 'border-blue-500 border-2' : '',
                selectedHairstyle !== null && selectedHairstyle !== hairstyle.id
                  ? 'opacity-30'
                  : 'opacity-100'
              )}
              role="radio"
              aria-checked={selectedHairstyle === hairstyle.id}
            >
              <img
                src={hairstyle.src}
                alt={`Hairstyle ${hairstyle.id}`}
                className="h-full w-full object-cover"
              />
              <span className="sr-only">
                {selectedHairstyle === hairstyle.id
                  ? `Hairstyle ${hairstyle.id} selected`
                  : `Select hairstyle ${hairstyle.id}`}
              </span>
            </button>
            {hairstyle.isRecommended && showRecommendations && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                ✓
              </span>
            )}
          </div>
        ))}
      </div>
      
      {recommendedIds.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => setShowRecommendations(!showRecommendations)}
            className="text-xs text-blue-600 hover:underline"
          >
            {showRecommendations ? 'Hide recommendations' : 'Show recommendations'}
          </button>
        </div>
      )}
    </div>
  );
}
