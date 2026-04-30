import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import './Avatar.css';

// Simple hash function to generate a consistent color from a string
const stringToColor = (string) => {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = Math.floor(Math.abs((Math.sin(hash) * 10000) % 1 * 16777215)).toString(16);
  return '#' + '000000'.substring(0, 6 - color.length) + color;
};

export const Avatar = ({ name, surname, src, size = 'md', className }) => {
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    if (src instanceof Blob) {
      const url = URL.createObjectURL(src);
      setImgUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof src === 'string') {
      setImgUrl(src);
    } else {
      setImgUrl(null);
    }
  }, [src]);

  const initials = `${name?.[0] || ''}${surname?.[0] || ''}`.toUpperCase();
  const bgColor = stringToColor(`${name}${surname}`);
  
  return (
    <div 
      className={clsx('base-avatar', `avatar-${size}`, className)}
      style={imgUrl ? {} : { backgroundColor: bgColor }}
    >
      {imgUrl ? (
        <img src={imgUrl} alt={`${name} ${surname}`} className="avatar-img" />
      ) : (
        <span className="avatar-initials">{initials}</span>
      )}
    </div>
  );
};
