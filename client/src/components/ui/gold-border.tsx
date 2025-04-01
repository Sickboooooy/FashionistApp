import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GoldBorderProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

const GoldBorder = ({ 
  className,
  children,
  hover,
  ...props
}: GoldBorderProps) => {
  return (
    <div 
      className={cn(
        "border border-amber-deep/40 rounded-md overflow-hidden bg-black-elegant",
        hover && "transition-all duration-300 hover:border-amber-deep/80 hover:shadow-gold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GoldBorder;