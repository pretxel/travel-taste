import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#f4ead7', // cream paper
          color: '#1a1715', // warm ink
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* corner postal stripes */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 60,
            height: 60,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            padding: 6,
            background: 'linear-gradient(135deg, transparent 50%, #8b3a1f 50%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            color: '#1a1715',
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: '-0.06em',
          }}
        >
          T
          <span style={{ color: '#8b3a1f', fontStyle: 'italic', fontSize: 70, padding: '0 4px' }}>
            &amp;
          </span>
          T
        </div>
        <div
          style={{
            marginTop: 8,
            color: '#8b3a1f',
            fontFamily: 'monospace',
            fontSize: 11,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
          }}
        >
          PRIVATE
        </div>
      </div>
    ),
    size
  );
}
