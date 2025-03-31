import { FC, ReactNode, DragEvent } from 'react';
import { cn } from '@/lib/utils';

export interface GoldBorderProps {
  children: ReactNode;
  className?: string;
  spotlight?: boolean;
  hover?: boolean;
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (e: DragEvent<HTMLDivElement>) => void;
}

const GoldBorder: FC<GoldBorderProps> = ({
  children,
  className,
  spotlight = false,
  hover = false,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  return (
    <div 
      className={cn(
        'gold-border bg-black rounded-lg',
        spotlight && 'spotlight',
        hover && 'transition-transform hover:scale-[1.02]',
        className
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
};

export default GoldBorder;
