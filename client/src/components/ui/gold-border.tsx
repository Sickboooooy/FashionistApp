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
        "glass-card",
        hover && "hover:-translate-y-0.5 cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GoldBorder;