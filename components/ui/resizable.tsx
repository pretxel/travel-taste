'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const ResizablePanel = React.forwardRef<
  React.ElementRef<'div'>,
  React.HTMLAttributes<React.ElementRef<'div'>>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('relative', className)} {...props} />
));
ResizablePanel.displayName = 'ResizablePanel';

const ResizableHandle = React.forwardRef<
  React.ElementRef<'div'>,
  React.HTMLAttributes<React.ElementRef<'div'>>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'absolute right-0 top-0 h-full w-1 cursor-col-resize bg-border hover:bg-primary/50',
      className
    )}
    {...props}
  />
));
ResizableHandle.displayName = 'ResizableHandle';

export { ResizablePanel, ResizableHandle };
