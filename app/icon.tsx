import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#8b3a1f', // terracotta
          color: '#f4ead7', // cream
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          fontWeight: 700,
          fontSize: 22,
          letterSpacing: '-0.04em',
          // Visual nudge: optical center for serif T
          paddingBottom: 2,
        }}
      >
        T
      </div>
    ),
    size
  );
}
