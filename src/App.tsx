import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

interface WinSize {
  w: number;
  h: number;
}

const scaledFrames = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 }
];

// 빌드 타임 fallback용 Vite 동적 이미지 수집
const globbedImages = import.meta.glob('/public/pet/*.webp', { eager: true });
const fallbackPetImages = Object.keys(globbedImages).map(path => path.replace('/public', ''));

export function App() {
  const [petImages, setPetImages] = useState<string[]>([]);
  const [winSize, setWinSize] = useState<WinSize>({ w: window.innerWidth, h: window.innerHeight });
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // 리프레시(새로고침)할 때마다 타일의 랜덤 배치가 완전히 바뀌도록 마운트 시점에 고유 시드(seed) 결정
  const [seed] = useState(() => Math.floor(Math.random() * 1000000));

  // 1. 컴포넌트 마운트 시 실시간으로 /api/pets API를 호출하여 파일 목록 갱신
  useEffect(() => {
    fetch('/api/pets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPetImages(data);
        } else {
          setPetImages(fallbackPetImages);
        }
      })
      .catch(err => {
        console.warn('Vite API server not running or production environment, falling back to globbed assets:', err);
        setPetImages(fallbackPetImages);
      });
  }, []);

  // 2. 1초마다 프레임을 회전시키는 글로벌 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => (prev + 1) % 4);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. GSAP 기반 정교한 확대/축소 루프 애니메이션
  // 12초 후 1초간 확대 (expo.inOut) -> 4초 대기 -> 1초간 축소 (expo.inOut) -> 12초 대기 반복
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ repeat: -1 });

      tl.to(containerRef.current, {
        scale: 2.5,
        duration: 1,
        delay: 12, // 12초 대기
        ease: 'expo.inOut' // gsap의 easeInOutExpo 대응
      })
      .to(containerRef.current, {
        scale: 1,
        duration: 1,
        delay: 4, // 4초 대기
        ease: 'expo.inOut' // gsap의 easeInOutExpo 대응
      });
    });

    return () => ctx.revert();
  }, [petImages]); // 이미지 로드 완료 시점에 안정적으로 애니메이션 바인딩

  // 4. 화면 리사이즈 감지
  useEffect(() => {
    function handleResize() {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 5. requestAnimationFrame 기반 30도 사선 우상단 무한 스크롤 루프
  useEffect(() => {
    let lastTime = performance.now();
    let animationFrameId: number;

    const speed = 40; // 초당 이동 픽셀 수
    const angleRad = (30 * Math.PI) / 180; // 30도 각도
    
    // 우측상단 이동 벡터: X는 우측(+), Y는 상단(-)
    const vx = Math.cos(angleRad);
    const vy = -Math.sin(angleRad);

    const updateScroll = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      setScroll(prev => ({
        x: prev.x + vx * speed * dt,
        y: prev.y + vy * speed * dt
      }));

      animationFrameId = requestAnimationFrame(updateScroll);
    };

    animationFrameId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // 새로고침 시 설정된 seed와 좌표값을 조합하여 일관된(결정론적) 이미지를 렌더링하는 헬퍼 함수
  function getDeterministicPetImage(x: number, y: number): string {
    if (petImages.length === 0) return '';
    const hash = Math.abs(((x + seed) * 73856093) ^ ((y + seed) * 19349663)) % petImages.length;
    return petImages[hash];
  }

  if (petImages.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#ffffff] text-slate-600 font-sans">
        <p>pet_march/public/pet/ 폴더를 스캔 중이거나 이미지를 찾을 수 없습니다...</p>
      </div>
    );
  }

  // 6. 화면 크기와 스크롤 오프셋을 바탕으로 렌더링에 필요한 타일 범위 및 위치 계산
  const tileSize = 100;
  const gapX = 336; // X축(가로) 간격
  const gapY = 48;  // Y축(세로) 간격
  const pitchX = tileSize + gapX; // 436px
  const pitchY = tileSize + gapY; // 148px

  // 화면 여백 및 오프셋 보완을 위해 좌우상하 범위를 넓게(3개 타일 분량 추가) 설정 (1배율 기준)
  const cols = Math.ceil(winSize.w / pitchX) + 3;
  const rows = Math.ceil(winSize.h / pitchY) + 3;

  // 화면 좌상단에 들어와야 할 그리드 상의 시작 좌표 (-1부터 시작)
  const startCol = Math.floor(scroll.x / pitchX) - 1;
  const startRow = Math.floor(scroll.y / pitchY) - 1;

  // 현재 프레임의 크기 오프셋 좌표
  const frameCoords = scaledFrames[tick];

  // 7. 절대 좌표 기반 지그재그 타일 배열 계산 (각 행마다 가로 오프셋 부여)
  const tileElements = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const gridX = startCol + c;
      const gridY = startRow + r;

      // 30도 사선 이동에 조화롭도록 가로 한 줄(행)마다 X축 엇갈림(지그재그) 오프셋을 pitchX 절반(218px)만큼 설정
      const isOddRow = Math.abs(gridY) % 2 !== 0;
      const xOffset = isOddRow ? pitchX / 2 : 0;

      // 가상 2D 평면에서의 논리 픽셀 위치 계산
      const xPos = gridX * pitchX + xOffset;
      const yPos = gridY * pitchY;

      // 스크롤 카메라 오프셋을 차감한 실제 화면상의 픽셀 위치
      const left = xPos - scroll.x;
      const top = yPos - scroll.y;

      const image = getDeterministicPetImage(gridX, gridY);
      const key = `${gridX}_${gridY}`;

      tileElements.push(
        <div
          key={key}
          className="w-[100px] h-[100px] absolute select-none pointer-events-none"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            backgroundImage: `url(${image})`,
            backgroundSize: '200px 200px',
            backgroundPosition: `-${frameCoords.x}px -${frameCoords.y}px`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      );
    }
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#ffffff] relative select-none pointer-events-none">
      {/* GSAP 제어를 위한 ref 등록 및 초기 정중앙 기준점 설정 */}
      <div
        ref={containerRef}
        className="w-full h-full absolute top-0 left-0"
        style={{
          transform: 'scale(1)',
          transformOrigin: 'center center'
        }}
      >
        {tileElements}
      </div>
    </div>
  );
}

export default App;
