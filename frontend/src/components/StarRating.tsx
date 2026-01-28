'use client';
import { Star } from 'lucide-react';
import { useState } from 'react';

interface StarRatingProps {
    totalStars?: number;
    onRate: (rating: number) => void;
}

export default function StarRating({ totalStars = 5, onRate }: StarRatingProps) {
    const [hover, setHover] = useState(0);
    const [rating, setRating] = useState(0);

    const handleClick = (value: number) => {
        setRating(value);
        onRate(value);
    };

    return (
        <div className="flex gap-1">
            {[...Array(totalStars)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => handleClick(starValue)}
                        onMouseEnter={() => setHover(starValue)}
                        onMouseLeave={() => setHover(0)}
                        className="focus:outline-none transition-transform hover:scale-110"
                    >
                        <Star 
                            size={24} 
                            className={`${starValue <= (hover || rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                        />
                    </button>
                );
            })}
        </div>
    );
}