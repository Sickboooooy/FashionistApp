import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GoldBorderProps {
  children: ReactNode;
  className?: string;
  spotlight?: boolean;
  hover?: boolean;
}

const GoldBorder: FC<GoldBorderProps> = ({
  children,
  className,
  spotlight = false,
  hover = false,
}) => {
  return (
    <div 
      className={cn(
        'gold-border bg-black rounded-lg',
        spotlight && 'spotlight',
        hover && 'transition-transform hover:scale-[1.02]',
        className
      )}
    >
      {children}
    </div>
  );
};

export default GoldBorder;
