/** @type {import('next').NextConfig} */

// IMAGE_NO_CACHE=true  → 개발 단계: 매번 서버에서 새 이미지를 가져옴 (FTP 교체 즉시 반영)
// IMAGE_NO_CACHE=false → 완성 단계: 브라우저 장기 캐싱 허용 (성능 최적화)
const isNoCacheMode = process.env.IMAGE_NO_CACHE === 'true';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,

  async headers() {
    return [
      {
        // public/pet/* 경로의 모든 이미지 파일에 적용
        source: '/pet/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: isNoCacheMode
              ? 'no-cache, no-store, must-revalidate' // 개발 단계
              : 'public, max-age=31536000, immutable', // 완성 단계 (1년 캐싱)
          },
        ],
      },
    ];
  },
};

export default nextConfig;
