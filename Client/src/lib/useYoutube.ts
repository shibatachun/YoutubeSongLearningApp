import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function loadYTScript(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
}

export function useYouTubePlayer(
  elementId: string,
  videoId: string,
  playerVars: Record<string, any> = {}
) {
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let destroyed = false;
    loadYTScript().then(() => {
      if (destroyed) return;
      playerRef.current = new window.YT.Player(elementId, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          ...playerVars,
        },
        events: {
          onReady: () => setReady(true),
        },
      });
    });
    return () => {
      destroyed = true;
      try { playerRef.current?.destroy?.(); } catch {}
    };
  }, [elementId, videoId]);

  return { player: playerRef, ready };
}