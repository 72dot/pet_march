"use client";

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

// 초기 SSR 및 API 응답 대기 시간용 폴백 펫 이미지 경로
const fallbackPetImages = [
  '/pet/cat_Abyssinian.webp',
  '/pet/cat_British_Shorthair.webp',
  '/pet/cat_Norwegian_Forest.webp',
  '/pet/cat_Persian.webp',
  '/pet/cat_Ragdoll.webp',
  '/pet/cat_Russian_Blue.webp',
  '/pet/cat_Scottish_Fold.webp',
  '/pet/cat_Siamese.webp',
  '/pet/cat_Sphynx.webp',
  '/pet/dog_Akita.webp',
  '/pet/dog_Beagle.webp',
  '/pet/dog_Bichon.webp',
  '/pet/dog_Border_Collie.webp',
  '/pet/dog_Boston_Terrier.webp',
  '/pet/dog_Bull_Terrier.webp',
  '/pet/dog_Chihuahua.webp',
  '/pet/dog_Cocker_Spaniel.webp',
  '/pet/dog_Dachshund.webp',
  '/pet/dog_French_Bulldog.webp',
  '/pet/dog_Golden_Retriever.webp',
  '/pet/dog_Jindo.webp',
  '/pet/dog_Labrador_Retriever.webp',
  '/pet/dog_Maltese.webp',
  '/pet/dog_Maltipoo.webp',
  '/pet/dog_Pomeranian.webp',
  '/pet/dog_Pug.webp',
  '/pet/dog_Samoyed.webp',
  '/pet/dog_Schnauzer.webp',
  '/pet/dog_Scottish_Terrier.webp',
  '/pet/dog_Shiba.webp',
  '/pet/dog_Shih_Tzu.webp',
  '/pet/dog_Toy_Poodle.webp',
  '/pet/dog_Welsh_Corgi.webp',
  '/pet/dog_Yorkshire_Terrier.webp'
];

// 토러스 공간 내에서의 두 타일 중심점 간 최단 물리적 유클리드 거리 계산
function getTorusPhysicalDistance(
  r1: number,
  c1: number,
  r2: number,
  c2: number,
  N: number,
  pitchX: number,
  pitchY: number,
  tileSize: number
): number {
  let dr = r2 - r1;
  let dc = c2 - c1;

  // 토러스 무한 랩핑 보정
  dr = ((dr % N) + N) % N;
  if (dr > N / 2) dr -= N;

  dc = ((dc % N) + N) % N;
  if (dc > N / 2) dc -= N;

  const r2_corrected = r1 + dr;
  const c2_corrected = c1 + dc;

  // 행마다 pitchX/2의 X축 엇갈림 오프셋 적용
  const cx1 = c1 * pitchX + ((r1 % 2 !== 0) ? pitchX / 2 : 0) + tileSize / 2;
  const cy1 = r1 * pitchY + tileSize / 2;

  const cx2 = c2_corrected * pitchX + ((Math.abs(r2_corrected) % 2 !== 0) ? pitchX / 2 : 0) + tileSize / 2;
  const cy2 = r2_corrected * pitchY + tileSize / 2;

  const dx = cx1 - cx2;
  const dy = cy1 - cy2;
  return Math.sqrt(dx * dx + dy * dy);
}

// 백트래킹 성능 극대화를 위한 물리적 거리 임계값 미만 인접 목록(Adjacency List) 테이블 빌드
function buildAdjacencyList(
  N: number,
  pitchX: number,
  pitchY: number,
  tileSize: number,
  threshold: number
): number[][] {
  const adj: number[][] = Array.from({ length: N * N }, () => []);
  for (let i = 0; i < N * N; i++) {
    const r1 = Math.floor(i / N);
    const c1 = i % N;
    // 백트래킹 시 이미 배치된 이전 인덱스들과만 거리를 비교
    for (let j = 0; j < i; j++) {
      const r2 = Math.floor(j / N);
      const c2 = j % N;
      const dist = getTorusPhysicalDistance(r1, c1, r2, c2, N, pitchX, pitchY, tileSize);
      if (dist < threshold) {
        adj[i].push(j);
      }
    }
  }
  return adj;
}

// 고속 룩업 테이블 기반 인접성 검사
function isSafeFast(flatGrid: string[], index: number, img: string, adjList: number[][]): boolean {
  const neighbors = adjList[index];
  for (let i = 0; i < neighbors.length; i++) {
    if (flatGrid[neighbors[i]] === img) {
      return false;
    }
  }
  return true;
}

// 랜덤 셔플 헬퍼 함수
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 물리적 유클리드 거리 제약 조건 기반의 토러스형 백트래킹 지도 빌더
function generateTorusPhysicalMap(
  petImages: string[],
  N: number,
  pitchX: number,
  pitchY: number,
  tileSize: number,
  threshold: number
): string[][] {
  const flatGrid = Array(N * N).fill('');
  const adjList = buildAdjacencyList(N, pitchX, pitchY, tileSize, threshold);

  function solve(index: number): boolean {
    if (index === N * N) {
      return true; // 충돌 없이 전체 배치 성공
    }

    // 후보군을 셔플하여 새로고침 시마다 완전 무작위 셔플 보장
    const candidates = shuffleArray(petImages);

    for (const img of candidates) {
      if (isSafeFast(flatGrid, index, img, adjList)) {
        flatGrid[index] = img;
        if (solve(index + 1)) {
          return true;
        }
        flatGrid[index] = ''; // 백트랙
      }
    }
    return false;
  }

  const success = solve(0);
  const grid: string[][] = Array.from({ length: N }, () => Array(N).fill(''));

  if (!success) {
    console.warn('Physical Backtracking failed to find a perfect map, falling back to random allocation.');
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N);
      const c = i % N;
      grid[r][c] = flatGrid[i] !== '' ? flatGrid[i] : petImages[Math.floor(Math.random() * petImages.length)];
    }
  } else {
    for (let i = 0; i < N * N; i++) {
      const r = Math.floor(i / N);
      const c = i % N;
      grid[r][c] = flatGrid[i];
    }
  }
  return grid;
}

export default function Home() {
  const [petImages, setPetImages] = useState<string[]>(fallbackPetImages);
  const [winSize, setWinSize] = useState<WinSize>({ w: 1200, h: 800 }); // 기본 초기값
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);
  const [isMounted, setIsMounted] = useState(false); // 하이드레이션 에러 방지용 마운트 검증 상태

  // 백트래킹으로 생성된 물리적 중복 배제 펫 맵 상태
  const [petMap, setPetMap] = useState<string[][]>([]);
  const [cacheKey, setCacheKey] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // 화면 크기 및 타일 배치 정보
  const tileSize = 100;
  const gapX = 336; // X축(가로) 간격
  const gapY = 48;  // Y축(세로) 간격
  const pitchX = tileSize + gapX; // 436px
  const pitchY = tileSize + gapY; // 148px
  const N = 40; // 40x40 지도 스케일
  const distanceThreshold = 450; // 물리적 2D 유클리드 거리 임계값 (450px 이내 동일 캐릭터 배치 차단)

  // 1. 컴포넌트 마운트 시 실시간으로 /api/pets API를 호출하여 파일 목록 갱신 및 윈도우 크기 설정
  useEffect(() => {
    setIsMounted(true);
    setCacheKey(Date.now().toString());
    if (typeof window !== 'undefined') {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    }

    fetch('/api/pets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPetImages(data);
          const map = generateTorusPhysicalMap(data, N, pitchX, pitchY, tileSize, distanceThreshold);
          setPetMap(map);
        } else {
          const map = generateTorusPhysicalMap(fallbackPetImages, N, pitchX, pitchY, tileSize, distanceThreshold);
          setPetMap(map);
        }
      })
      .catch(err => {
        console.warn('Vite API server not running or production environment, falling back to static list:', err);
        const map = generateTorusPhysicalMap(fallbackPetImages, N, pitchX, pitchY, tileSize, distanceThreshold);
        setPetMap(map);
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
  }, [petMap]); // 백트래킹 맵 로드 시점에 맞춤

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

  // O(1) 성능의 토러스 2D 백트래킹 맵 룩업 헬퍼 함수
  function getDeterministicPetImage(x: number, y: number): string {
    if (petMap.length === 0) return '';
    const N = petMap.length;
    // 음수 인덱스 보정 모듈러 연산으로 상하좌우 무한 타일링(Tiling) 안전 구현
    const mapX = ((x % N) + N) % N;
    const mapY = ((y % N) + N) % N;
    return petMap[mapY][mapX];
  }

  if (!isMounted || petMap.length === 0) {
    return <div className="w-screen h-screen bg-[#ffffff]" />;
  }

  // 6. 화면 크기와 스크롤 오프셋을 바탕으로 렌더링에 필요한 타일 범위 및 위치 계산
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
      const imageUrl = image ? `${image}?v=${cacheKey}` : '';
      const key = `${gridX}_${gridY}`;

      tileElements.push(
        <div
          key={key}
          className="w-[100px] h-[100px] absolute select-none pointer-events-none"
          style={{
            left: `${left}px`,
            top: `${top}px`,
            backgroundImage: `url(${imageUrl})`,
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
