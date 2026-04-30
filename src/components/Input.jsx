import React from 'react';
import clsx from 'clsx';
import './Input.css';

export const Input = React.forwardRef(({ 
  label, 
  error, 
  className, 
  fullWidth = true,
  ...props 
}, ref) => {
  return (
    <div className={clsx('input-wrapper', fullWidth && 'w-full', className)}>
      {label && <label className="input-label">{label}</label>}
      <input 
        ref={ref}
        className={clsx('base-input', error && 'input-error')}
        {...props} 
      />
      {error && <span className="input-error-msg">{error}</span>}
    </div>
  );
});
