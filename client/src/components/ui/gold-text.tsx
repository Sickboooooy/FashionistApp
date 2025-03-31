import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GoldTextProps extends HTMLAttributes<HTMLSpanElement> {}

const GoldText = ({ 
  className,
  children,
  ...props
}: GoldTextProps) => {
  return (
    <span 
      className={cn(
        "gold-text",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default GoldText;