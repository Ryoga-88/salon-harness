import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

/** ブラウザ既定の `/favicon.ico` は `next.config.ts` の rewrite でここへ向ける */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f766e',
          color: '#fff',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    { ...size }
  );
}
