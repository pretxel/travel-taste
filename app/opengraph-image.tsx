import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Travel Taste — A Private Diary';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'radial-gradient(ellipse at 30% 20%, #f7eed8, #ecdfc1 70%, #d9c89e 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          fontFamily: 'serif',
          color: '#1a1715',
          position: 'relative',
        }}
      >
        {/* Top label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            color: '#8b3a1f',
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: '0.36em',
            textTransform: 'uppercase',
          }}
        >
          <span>No. 01</span>
          <span style={{ width: 36, height: 2, background: '#8b3a1f' }} />
          <span>Private Edition</span>
        </div>

        {/* Title */}
        <div
          style={{
            marginTop: 56,
            display: 'flex',
            alignItems: 'baseline',
            fontSize: 200,
            fontWeight: 700,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          Travel
          <span
            style={{
              color: '#8b3a1f',
              fontStyle: 'italic',
              fontSize: 160,
              padding: '0 24px',
            }}
          >
            &amp;
          </span>
          Taste
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            flexDirection: 'column',
            fontSize: 36,
            fontStyle: 'italic',
            color: '#3a322c',
            maxWidth: 900,
            lineHeight: 1.25,
          }}
        >
          <span>A small letterbox of postcards from the road —</span>
          <span>kept for those who matter.</span>
        </div>

        {/* Bottom rule */}
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 80,
            right: 80,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#3a322c',
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 56, height: 2, background: '#8b3a1f' }} />
            <span>By Invitation Only</span>
          </div>
          <span>travel · taste</span>
        </div>
      </div>
    ),
    size
  );
}
