import { FC, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GoldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'rounded';
  size?: 'sm' | 'md' | 'lg';
}

const GoldButton: FC<GoldButtonProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variantClasses = {
    default: 'gold-button',
    outline: 'border border-amber-deep bg-transparent text-amber-deep hover:text-black-elegant hover:gold-button',
    rounded: 'gold-button rounded-full',
  };

  const sizeClasses = {
    sm: 'px-4 py-1 text-xs',
    md: 'px-8 py-3 text-sm',
    lg: 'px-10 py-4 text-base',
  };

  return (
    <button
      className={cn(
        'font-montserrat font-medium shadow-lg hover:shadow-xl transition-all',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default GoldButton;
