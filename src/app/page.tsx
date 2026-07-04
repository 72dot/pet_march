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

  // 배경음악(BGM) 재생 상태 및 볼륨 상태
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  
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

  // 2. 배경음악 자동 재생 정책 대응 글로벌 리스너 등록
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = true;
    audio.volume = 0.5; // 너무 크지 않도록 적절한 볼륨(50%)으로 설정

    // 브라우저의 오디오 자동재생 제약을 풀기 위해 사용자의 첫 터치/클릭 감지 시 오디오 재생을 부드럽게 개시
    const initAndPlayAudio = () => {
      audio.play()
        .then(() => {
          setIsAudioMuted(false); // 재생 성공 시 뮤트 상태 해제
        })
        .catch(err => {
          console.log('Autoplay blocked by browser. Awaiting explicit user click.', err);
        });

      // 리스너 정리
      window.removeEventListener('click', initAndPlayAudio);
      window.removeEventListener('touchstart', initAndPlayAudio);
    };

    window.addEventListener('click', initAndPlayAudio);
    window.addEventListener('touchstart', initAndPlayAudio);

    return () => {
      window.removeEventListener('click', initAndPlayAudio);
      window.removeEventListener('touchstart', initAndPlayAudio);
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

  // 오디오 음소거/해제 수동 토글 헬퍼
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // 배경 클릭 이벤트 트리거 전이 방지
    const audio = audioRef.current;
    if (!audio) return;

    if (isAudioMuted) {
      audio.play()
        .then(() => {
          setIsAudioMuted(false);
          audio.muted = false;
        })
        .catch(err => console.error('Play failed:', err));
    } else {
      audio.muted = true;
      setIsAudioMuted(true);
    }
  };

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

      {/* 10. 프리미엄 플로팅 오디오 제어 버튼 UI (자동 재생이 차단될 수 있으므로 직관적인 토글 제공) */}
      <button
        onClick={toggleMute}
        title={isAudioMuted ? "배경음악 켜기" : "배경음악 끄기"}
        className="fixed top-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full border border-slate-200/80 bg-white/90 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-slate-50 active:scale-95 cursor-pointer"
      >
        {isAudioMuted ? (
          <span className="text-xl text-slate-400 select-none">🔇</span>
        ) : (
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-xl text-emerald-500 select-none">🔊</span>
            {/* 음파 댄싱 바 그래픽 효과 */}
            <div className="flex items-end gap-[2px] h-3 w-3 select-none">
              <span className="w-[1.5px] h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }}></span>
              <span className="w-[1.5px] h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }}></span>
              <span className="w-[1.5px] h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '0.5s' }}></span>
            </div>
          </div>
        )}
      </button>

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
