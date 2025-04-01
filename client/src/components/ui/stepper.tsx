import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface StepperContextValue {
  activeIndex: number;
}

const StepperContext = createContext<StepperContextValue>({
  activeIndex: 0,
});

interface StepContext {
  index?: number;
}

const StepContext = createContext<StepContext | null>(null);

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number;
  children: React.ReactNode;
}

export function Stepper({ 
  index, 
  children, 
  className, 
  ...props 
}: StepperProps) {
  const childrenArray = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child)
  );

  return (
    <StepperContext.Provider value={{ activeIndex: index }}>
      <div
        className={cn(
          "flex items-center w-full justify-between gap-2",
          className
        )}
        {...props}
      >
        {childrenArray.map((child, childIndex) => {
          return React.cloneElement(child as React.ReactElement, {
            index: childIndex,
            isLast: childIndex === childrenArray.length - 1,
          });
        })}
      </div>
    </StepperContext.Provider>
  );
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  isLast?: boolean;
  children: React.ReactNode;
}

export function Step({ 
  index = 0, 
  isLast = false, 
  children, 
  className, 
  ...props 
}: StepProps) {
  const { activeIndex } = useContext(StepperContext);
  const isActive = activeIndex === index;
  const isCompleted = activeIndex > index;

  return (
    <StepContext.Provider value={{ index }}>
      <div className={cn("flex items-center", className)} {...props}>
        {children}
        {!isLast && (
          <div
            className={cn(
              "h-px flex-1 mx-2",
              isCompleted ? "bg-amber-deep" : "bg-muted"
            )}
          />
        )}
      </div>
    </StepContext.Provider>
  );
}

interface StepIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function StepIndicator({ 
  children, 
  className, 
  ...props 
}: StepIndicatorProps) {
  const { activeIndex } = useContext(StepperContext);
  const step = useContext(StepContext);
  
  const isActive = activeIndex === step?.index;
  const isCompleted = activeIndex > (step?.index ?? 0);

  return (
    <div
      className={cn(
        "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background text-sm font-medium",
        isActive
          ? "border-amber-deep/50 bg-black-elegant text-amber-deep shadow-md shadow-amber-deep/20 ring-2 ring-amber-deep/30"
          : isCompleted
          ? "border-amber-deep bg-amber-deep text-black-elegant"
          : "border-muted bg-muted/30 text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StepLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function StepLabel({ 
  children, 
  className, 
  ...props 
}: StepLabelProps) {
  const { activeIndex } = useContext(StepperContext);
  const step = useContext(StepContext);
  
  const isActive = activeIndex === step?.index;
  const isCompleted = activeIndex > (step?.index ?? 0);

  return (
    <div
      className={cn(
        "font-medium",
        isActive
          ? "text-amber-deep"
          : isCompleted
          ? "text-foreground"
          : "text-muted-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface StepDescriptionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function StepDescription({ 
  children, 
  className, 
  ...props 
}: StepDescriptionProps) {
  return (
    <div
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  );
}