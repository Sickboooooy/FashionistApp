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
      <div className="overflow-hidden rounded-lg gold-border mb-3 bg-black aspect-square relative">
        <img 
          src={design.imageUrl} 
          alt={design.name} 
          className={`w-full h-full object-cover transition-transform duration-500 ${isHovered ? 'scale-110' : ''}`} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent opacity-60"></div>
        <div className="absolute bottom-0 left-0 p-4">
          <h3 className="font-playfair text-lg gold-text">{design.name}</h3>
          <p className="font-montserrat text-xs opacity-80">{design.category}</p>
        </div>
      </div>
    </div>
  );
};

export default DesignCard;
