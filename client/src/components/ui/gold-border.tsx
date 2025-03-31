import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GoldBorderProps extends HTMLAttributes<HTMLDivElement> {}

const GoldBorder = ({ 
  className,
  children,
  ...props
}: GoldBorderProps) => {
  return (
    <div 
      className={cn(
        "border border-amber-deep/40 rounded-md overflow-hidden bg-black-elegant",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GoldBorder;