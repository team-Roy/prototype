import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = '팬덤 라운지';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        position: 'relative',
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          left: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(168, 85, 247, 0.1)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(236, 72, 153, 0.1)',
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 180,
          height: 180,
          borderRadius: 40,
          background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
          marginBottom: 40,
        }}
      >
        <span
          style={{
            fontSize: 120,
            fontWeight: 'bold',
            color: 'white',
          }}
        >
          F
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 72,
          fontWeight: 'bold',
          color: 'white',
          marginBottom: 20,
        }}
      >
        팬덤 라운지
      </div>

      {/* Subtitle */}
      <div
        style={{
          fontSize: 28,
          color: '#94a3b8',
          marginBottom: 40,
        }}
      >
        소규모 버튜버/크리에이터 팬덤 커뮤니티 플랫폼
      </div>

      {/* Accent line */}
      <div
        style={{
          width: 400,
          height: 4,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 100%)',
        }}
      />
    </div>,
    {
      ...size,
    }
  );
}
