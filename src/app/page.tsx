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

export default function Home() {
  const [petImages, setPetImages] = useState<string[]>(fallbackPetImages);
  const [winSize, setWinSize] = useState<WinSize>({ w: 1200, h: 800 }); // 기본 초기값
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 리프레시(새로고침)할 때마다 타일의 랜덤 배치가 완전히 바뀌도록 마운트 시점에 고유 시드(seed) 결정
  const [seed] = useState(() => Math.floor(Math.random() * 1000000));

  // 1. 컴포넌트 마운트 시 실시간으로 /api/pets API를 호출하여 파일 목록 갱신 및 윈도우 크기 설정
  useEffect(() => {
    setWinSize({ w: window.innerWidth, h: window.innerHeight });

    fetch('/api/pets')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPetImages(data);
        }
      })
      .catch(err => {
        console.warn('API server not running or production environment, falling back to static list:', err);
      });
  }, []);

  // 2. 배경음악 즉시 자동 재생 및 브라우저 자동 재생 제약 우회 리스너
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.5; // 배경음악 적절 볼륨

    // 브라우저가 즉시 play()를 허용하는 경우 바로 재생 시도
    audio.play().catch(err => {
      console.log('Autoplay blocked. Background music will start on first user interaction.', err);
    });

    // 만약 브라우저가 자동 재생을 막았다면, 사용자의 첫 클릭/터치/스크롤 등의 이벤트가 발생하는 즉시 재생 시작
    const startAudioOnInteraction = () => {
      audio.play().catch(e => console.log('Interactive play failed:', e));
      
      // 단 한 번만 실행되도록 리스너를 즉시 제거
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
      window.removeEventListener('scroll', startAudioOnInteraction);
    };

    window.addEventListener('click', startAudioOnInteraction);
    window.addEventListener('touchstart', startAudioOnInteraction);
    window.addEventListener('scroll', startAudioOnInteraction);

    return () => {
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
      window.removeEventListener('scroll', startAudioOnInteraction);
    };
  }, []);

  // 3. 1초마다 프레임을 회전시키는 글로벌 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => (prev + 1) % 4);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. GSAP 기반 정교한 확대/축소 루프 애니메이션
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
  }, [petImages]);

  // 5. 화면 리사이즈 감지
  useEffect(() => {
    function handleResize() {
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 6. requestAnimationFrame 기반 30도 사선 우상단 무한 스크롤 루프
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

  // 7. 화면 크기와 스크롤 오프셋을 바탕으로 렌더링에 필요한 타일 범위 및 위치 계산
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

  // 8. 절대 좌표 기반 지그재그 타일 배열 계산 (각 행마다 가로 오프셋 부여)
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
    <div className="w-screen h-screen overflow-hidden bg-[#ffffff] relative select-none">
      
      {/* 9. 배경음악 오디오 태그 엘리먼트 (무한반복 지정) */}
      <audio 
        ref={audioRef} 
        src="/bgm/pet_march_bgm.opus" 
        preload="auto" 
        loop
      />

      {/* GSAP 제어를 위한 ref 등록 및 초기 정중앙 기준점 설정 */}
      <div
        ref={containerRef}
        className="w-full h-full absolute top-0 left-0 pointer-events-none"
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
