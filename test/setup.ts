import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import React from 'react';

vi.mock('next-cloudinary', () => ({
  CldImage: (props: Record<string, unknown>) => {
    const {
      src,
      alt = '',
      width,
      height,
      className,
    } = props as {
      src: string;
      alt?: string;
      width?: number;
      height?: number;
      className?: string;
    };
    return React.createElement('img', {
      src,
      alt,
      width,
      height,
      className,
      'data-testid': 'cld-image',
    });
  },
}));
