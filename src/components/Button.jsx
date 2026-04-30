import React from 'react';
import clsx from 'clsx';
import './Button.css';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  fullWidth,
  ...props 
}) => {
  return (
    <button 
      className={clsx(
        'base-button',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full-width',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
