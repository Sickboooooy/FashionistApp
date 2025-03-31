import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GoldTextProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

const GoldText: FC<GoldTextProps> = ({
  children,
  className,
  as = 'span',
}) => {
  const Component = as;
  
  return (
    <Component 
      className={cn(
        'gold-text',
        className
      )}
    >
      {children}
    </Component>
  );
};

export default GoldText;
