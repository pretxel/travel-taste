import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageModal } from './image-modal';
import type { Photo } from '@/lib/photos';

const photos: Photo[] = [
  { publicId: 'a', width: 100, height: 100, folder: 's' },
  { publicId: 'b', width: 100, height: 100, folder: 's' },
  { publicId: 'c', width: 100, height: 100, folder: 's' },
];

function setup(indexStart: number | null) {
  const onIndexChange = vi.fn();
  const onClose = vi.fn();
  const utils = render(
    <ImageModal
      photos={photos}
      index={indexStart}
      onIndexChange={onIndexChange}
      onClose={onClose}
    />
  );
  return { onIndexChange, onClose, ...utils };
}

afterEach(() => cleanup());

describe('ImageModal', () => {
  it('renders nothing when index is null', () => {
    setup(null);
    expect(screen.queryByTestId('cld-image')).toBeNull();
  });

  it('renders the image for the current index with its public_id caption', () => {
    setup(1);
    const img = screen.getByTestId('cld-image') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('b');
    const matches = screen.getAllByText('b');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.some(el => el.tagName === 'P')).toBe(true);
  });

  it('ArrowRight advances to next image and wraps at end', async () => {
    const { onIndexChange } = setup(2);
    await userEvent.keyboard('{ArrowRight}');
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('ArrowLeft goes to previous image and wraps at start', async () => {
    const { onIndexChange } = setup(0);
    await userEvent.keyboard('{ArrowLeft}');
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('Escape calls onClose', async () => {
    const { onClose } = setup(0);
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('attaches no keydown listener while closed', async () => {
    const { onIndexChange } = setup(null);
    await userEvent.keyboard('{ArrowRight}');
    expect(onIndexChange).not.toHaveBeenCalled();
  });

  it('swipe right (deltaX > 50) navigates to previous', () => {
    const { onIndexChange } = setup(1);
    const surface = screen.getByTestId('modal-swipe-surface');
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 200, clientY: 110, pointerId: 1 });
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('swipe left (deltaX < -50) navigates to next', () => {
    const { onIndexChange } = setup(1);
    const surface = screen.getByTestId('modal-swipe-surface');
    fireEvent.pointerDown(surface, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 100, clientY: 110, pointerId: 1 });
    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('ignores vertical-dominant swipes', () => {
    const { onIndexChange } = setup(1);
    const surface = screen.getByTestId('modal-swipe-surface');
    fireEvent.pointerDown(surface, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(surface, { clientX: 140, clientY: 300, pointerId: 1 });
    expect(onIndexChange).not.toHaveBeenCalled();
  });
});
