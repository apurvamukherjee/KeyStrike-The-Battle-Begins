import { useEffect, useRef, useState } from 'react';
import './LoaderScreen.css';

const MIN_DISPLAY_MS = 1100;

interface LoaderScreenProps {
  onDone: () => void;
}

export default function LoaderScreen({ onDone }: LoaderScreenProps) {
  const [progress, setProgress] = useState(0.08);
  const doneRef = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let fontsReady = false;

    document.fonts?.ready
      .then(() => {
        fontsReady = true;
      })
      .catch(() => {
        fontsReady = true;
      });

    const tick = () => {
      const elapsed = performance.now() - start;
      const timeProgress = Math.min(0.92, (elapsed / MIN_DISPLAY_MS) * 0.92);
      setProgress((p) => Math.max(p, timeProgress));

      if (fontsReady && elapsed >= MIN_DISPLAY_MS && !doneRef.current) {
        doneRef.current = true;
        setProgress(1);
        window.setTimeout(onDone, 220);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <div className="screen loader" role="status" aria-live="polite">
      <h1 className="wordmark">
        Key<span>Strike</span>
      </h1>
      <div className="loader__bar">
        <div className="loader__fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="loader__credit">
        By <strong>Apurva</strong>
      </p>
    </div>
  );
}
