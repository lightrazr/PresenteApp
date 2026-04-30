import React from 'react';
import clsx from 'clsx';
import './Card.css';

export const Card = ({ children, className, ...props }) => {
  return (
    <div className={clsx('base-card', className)} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className, ...props }) => {
  return (
    <div className={clsx('card-header', className)} {...props}>
      {children}
    </div>
  );
};

export const CardContent = ({ children, className, ...props }) => {
  return (
    <div className={clsx('card-content', className)} {...props}>
      {children}
    </div>
  );
};
