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
    default: 'gold-button gold-shine',
    outline: 'border border-amber-500/60 bg-transparent text-amber-300 hover:bg-amber-500/10 hover:text-amber-200',
    rounded: 'gold-button gold-shine rounded-full',
  };

  const sizeClasses = {
    sm: 'px-4 py-1 text-xs',
    md: 'px-8 py-3 text-sm',
    lg: 'px-10 py-4 text-base',
  };

  return (
    <button
      className={cn(
        'font-montserrat font-medium shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
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
