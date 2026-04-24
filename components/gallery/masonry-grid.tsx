import { ReactNode } from 'react';

export function MasonryGrid({ children }: { children: ReactNode }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
      {children}
    </div>
  );
}
