import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightContainerProps {
  children: ReactNode;
  className?: string;
  centered?: boolean;
}

const SpotlightContainer: FC<SpotlightContainerProps> = ({
  children,
  className,
  centered = false,
}) => {
  return (
    <div 
      className={cn(
        'section-editorial',
        centered && 'flex flex-col items-center justify-center text-center',
        className
      )}
    >
      {children}
    </div>
  );
};

export default SpotlightContainer;
