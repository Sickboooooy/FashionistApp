import { useState } from 'react';

interface DesignCardProps {
  design: {
    id: number;
    name: string;
    category: string;
    imageUrl: string;
  };
}

const DesignCard = ({ design }: DesignCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-white/[0.02] mb-3 aspect-square relative group-hover:border-amber-500/40 transition-colors">
        <img 
          src={design.imageUrl} 
          alt={design.name} 
          className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-105' : ''}`} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-4">
          <h3 className="font-serif text-lg text-stone-100">{design.name}</h3>
          <p className="font-montserrat text-[10px] uppercase tracking-wider text-amber-400/70">{design.category}</p>
        </div>
      </div>
    </div>
  );
};

export default DesignCard;
