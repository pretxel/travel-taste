import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoSection } from './photo-section';
import type { Photo } from '@/lib/photos';

const photos: Photo[] = [
  { publicId: 'travel-taste/bali/a', width: 100, height: 100, folder: 'bali' },
  { publicId: 'travel-taste/bali/b', width: 100, height: 100, folder: 'bali' },
  { publicId: 'travel-taste/bali/c', width: 100, height: 100, folder: 'bali' },
];

afterEach(() => cleanup());

describe('PhotoSection', () => {
  it('renders the humanized title as an h2', () => {
    render(<PhotoSection slug="bali" title="Bali" photos={photos} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toBe('Bali');
  });

  it('renders one tile per photo', () => {
    render(<PhotoSection slug="bali" title="Bali" photos={photos} />);
    const imgs = screen.getAllByTestId('cld-image');
    expect(imgs).toHaveLength(3);
  });

  it('opens the modal at the clicked index', async () => {
    render(<PhotoSection slug="bali" title="Bali" photos={photos} />);
    const buttons = screen.getAllByRole('button', { name: /Open photo/ });
    await userEvent.click(buttons[2]);
    const modalImg = screen
      .getAllByTestId('cld-image')
      .find(el => (el as HTMLImageElement).getAttribute('src') === 'travel-taste/bali/c');
    expect(modalImg).toBeTruthy();
    const matches = screen.getAllByText('travel-taste/bali/c');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });
});
