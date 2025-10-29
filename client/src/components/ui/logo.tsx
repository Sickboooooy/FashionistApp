import { FC } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const Logo: FC<LogoProps> = ({ size = 'md', showText = true }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-base',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  };

  return (
    <div className="flex items-center">
      <div className={`mr-3 relative ${sizeClasses[size]}`}>
        <div className={`${sizeClasses[size]} rounded-full bg-[#000000] border border-amber-deep flex items-center justify-center`}>
          <span className="gold-text font-playfair font-bold">A</span>
        </div>
      </div>
      {showText && (
        <>
          <h1 className="font-playfair text-xl md:text-2xl gold-text font-bold">
            FashionistApp
          </h1>
          <span className="ml-2 font-cormorant text-sm italic text-cream-soft opacity-80">
            Anna Style
          </span>
        </>
      )}
    </div>
  );
};

export default Logo;
