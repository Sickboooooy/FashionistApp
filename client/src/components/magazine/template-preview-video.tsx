import { FC, useEffect, useRef, useState } from 'react';

interface TemplatePreviewVideoProps {
  src: string;
  poster: string;
  label: string;
}

// Proporción del video que debe estar en pantalla para reproducirse.
const VISIBLE_THRESHOLD = 0.4;
// La imagen fija es el fotograma de 1.25 s; la primera reproducción arranca ahí para no saltar.
const POSTER_TIME_FRAGMENT = '#t=1.25';

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TemplatePreviewVideo: FC<TemplatePreviewVideoProps> = ({ src, poster, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showPoster, setShowPoster] = useState<boolean>(prefersReducedMotion);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || showPoster) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          video.pause();
          return;
        }
        video.play().catch((error: unknown) => {
          // Solo un bloqueo de reproducción automática deja la imagen fija; un AbortError
          // por desplazamiento rápido se ignora y se reintenta al volver a verse.
          if (error instanceof DOMException && error.name === 'NotAllowedError') {
            setShowPoster(true);
          }
        });
      },
      { threshold: VISIBLE_THRESHOLD },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [showPoster]);

  if (showPoster) {
    return <img src={poster} alt={label} className="w-full h-full object-cover" />;
  }

  return (
    <video
      ref={videoRef}
      src={`${src}${POSTER_TIME_FRAGMENT}`}
      poster={poster}
      aria-label={label}
      className="w-full h-full object-cover"
      muted
      loop
      playsInline
      preload="metadata"
      onError={() => setShowPoster(true)}
    />
  );
};

export default TemplatePreviewVideo;
