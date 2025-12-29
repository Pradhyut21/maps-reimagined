import React from 'react';

type LoadingSpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
};

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'accent',
  className = '',
}) => {
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const colorClass = `border-${color}-500 border-t-transparent`;

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClass} ${colorClass}`}
        style={{
          borderTopColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: 'transparent',
          borderLeftColor: 'var(--color-accent-500)',
          borderStyle: 'solid',
          borderRadius: '50%',
        }}
      >
        <span className="sr-only">Loading...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
