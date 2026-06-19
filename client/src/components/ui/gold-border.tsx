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
        "relative rounded-xl overflow-hidden border border-amber-deep/30 bg-black-elegant/90",
        "shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.04)]",
        "transition-all duration-300",
        hover && "hover:-translate-y-0.5 hover:border-amber-deep/70 hover:shadow-gold",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default GoldBorder;