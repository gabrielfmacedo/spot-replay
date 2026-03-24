
import React, { useState, useEffect } from 'react';

interface CardProps {
  code: string; // e.g., "As", "Td", "2h", "7c"
  hidden?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  cardStyle?: 'off' | 'text' | 'bg';
}

const Card: React.FC<CardProps> = ({ code, hidden, size = 'md', animate = false, cardStyle = 'off' }) => {
  // If animate=false: start flipped (instant face-up). If animate=true: start face-down, flip after mount.
  const [isFlipped, setIsFlipped] = useState(!animate);

  useEffect(() => {
    if (animate) {
      const t = setTimeout(() => setIsFlipped(true), 60);
      return () => clearTimeout(t);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sizeClasses = {
    sm: 'w-8 h-11 text-[9px]',
    md: 'w-[46px] h-[64px] text-[10px]',
    lg: 'w-14 h-20 text-xs',
  };

  const rank = code[0];
  const suit = code[1];

  // 'text' mode: white bg, colored suit text. 'bg' mode: colored bg, white text. 'off': classic
  const suitTextColors: Record<string, string> = {
    's': 'text-gray-900',
    'h': 'text-red-600',
    'd': cardStyle === 'text' ? 'text-blue-600' : 'text-red-600',
    'c': cardStyle === 'text' ? 'text-green-700' : 'text-gray-900',
  };

  const suitBgColors: Record<string, string> = {
    's': '#1e293b', // dark slate
    'h': '#dc2626', // red-600
    'd': '#2563eb', // blue-600
    'c': '#15803d', // green-700
  };

  const suitIcons: Record<string, string> = {
    's': '♠', 'h': '♥', 'd': '♦', 'c': '♣'
  };

  const isLarge = size === 'lg';
  const isMedium = size === 'md';

  const CardBack = () => (
    <div className="absolute inset-0 w-full h-full border-2 border-white rounded-md flex items-center justify-center shadow-lg overflow-hidden backface-hidden" style={{ background: 'var(--card-back-bg, #991b1b)' }}>
      <div className="w-full h-full opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:6px_6px]"></div>
    </div>
  );

  const CardFront = () => {
    if (cardStyle === 'bg') {
      return (
        <div
          className="absolute inset-0 w-full h-full rounded-md flex flex-col items-center justify-between p-0.5 md:p-1 shadow-xl backface-hidden [transform:rotateY(180deg)]"
          style={{ background: suitBgColors[suit], border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <span className={`font-bold leading-none self-start text-white ${isLarge ? 'text-lg' : isMedium ? 'text-xs' : 'text-[9px]'}`}>{rank}</span>
          <span className={`leading-none text-white ${isLarge ? 'text-3xl' : isMedium ? 'text-xl' : 'text-lg'}`}>{suitIcons[suit]}</span>
          <span className={`font-bold leading-none self-end rotate-180 text-white ${isLarge ? 'text-lg' : isMedium ? 'text-xs' : 'text-[9px]'}`}>{rank}</span>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 w-full h-full bg-white border border-gray-300 rounded-md flex flex-col items-center justify-between p-0.5 md:p-1 shadow-xl backface-hidden [transform:rotateY(180deg)]">
        <span className={`font-bold leading-none self-start ${suitTextColors[suit]} ${isLarge ? 'text-lg' : isMedium ? 'text-xs' : 'text-[9px]'}`}>{rank}</span>
        <span className={`leading-none ${suitTextColors[suit]} ${isLarge ? 'text-3xl' : isMedium ? 'text-xl' : 'text-lg'}`}>{suitIcons[suit]}</span>
        <span className={`font-bold leading-none self-end rotate-180 ${suitTextColors[suit]} ${isLarge ? 'text-lg' : isMedium ? 'text-xs' : 'text-[9px]'}`}>{rank}</span>
      </div>
    );
  };

  if (hidden) {
    return <div className={`${sizeClasses[size]} relative`}><CardBack /></div>;
  }

  return (
    <div className={`${sizeClasses[size]} relative [perspective:1000px] group`}>
      <div className={`relative w-full h-full transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        <CardBack />
        <CardFront />
      </div>
    </div>
  );
};

export default Card;
