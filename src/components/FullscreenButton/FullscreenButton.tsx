import { useEffect, useState } from 'react';
import './FullscreenButton.css';

const SUPPORTED = typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;

export default function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(() => SUPPORTED && !!document.fullscreenElement);

  useEffect(() => {
    if (!SUPPORTED) return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  if (!SUPPORTED) return null;

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  return (
    <button
      type="button"
      className={`fs-toggle${isFullscreen ? ' fs-toggle--active' : ''}`}
      onClick={toggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      <svg viewBox="0 0 24 24" className="fs-toggle__icon" aria-hidden="true">
        <path className="fs-toggle__corner fs-toggle__corner--tl" d="M9 3H4v5" />
        <path className="fs-toggle__corner fs-toggle__corner--tr" d="M15 3h5v5" />
        <path className="fs-toggle__corner fs-toggle__corner--br" d="M15 21h5v-5" />
        <path className="fs-toggle__corner fs-toggle__corner--bl" d="M9 21H4v-5" />
      </svg>
    </button>
  );
}
