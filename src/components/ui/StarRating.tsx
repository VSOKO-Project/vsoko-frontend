import { Star } from 'lucide-react';
import './StarRating.css';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  max?: number;
  readonly?: boolean;
}

export function StarRating({ value, onChange, max = 5, readonly }: StarRatingProps) {
  return (
    <div className={`star-rating ${readonly ? 'star-rating--readonly' : ''}`}>
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            className={`star-rating__star ${starValue <= value ? 'star-rating__star--active' : ''}`}
            onClick={() => !readonly && onChange?.(starValue)}
            disabled={readonly}
          >
            <Star size={22} fill={starValue <= value ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}
