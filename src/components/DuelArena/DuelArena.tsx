import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Swordsman from '../Swordsman/Swordsman';
import type { Racer } from '../RaceTrack/RaceTrack';
import { prefersReducedMotion } from '../../utils/motion';
import './DuelArena.css';

/** A one-shot strike to replay — bump `seq` (matching HudState's judgementSeq/milestoneSeq pattern elsewhere) to trigger it again for the same striker. */
export interface DuelStrike {
  /** Must match one of `racers[].id`. */
  strikerId: string;
  seq: number;
}

interface DuelArenaProps {
  /** Exactly two racers — Duel Mode is 1v1 only for this first version. */
  racers: Racer[];
  strike?: DuelStrike | null;
}

type Side = 'left' | 'right';

const REST_ANGLE = -34;
const DIR: Record<Side, number> = { left: 1, right: -1 };
const PETAL_COUNT = 14;


export default function DuelArena({ racers, strike }: DuelArenaProps) {
  const [left, right] = racers;

  const scopeRef = useRef<HTMLDivElement>(null);
  const leftBodyRef = useRef<SVGSVGElement>(null);
  const rightBodyRef = useRef<SVGSVGElement>(null);
  const leftSwordRef = useRef<SVGGElement>(null);
  const rightSwordRef = useRef<SVGGElement>(null);
  const leftSlashRef = useRef<HTMLDivElement>(null);
  const rightSlashRef = useRef<HTMLDivElement>(null);

  const bodies = { left: leftBodyRef, right: rightBodyRef };
  const swords = { left: leftSwordRef, right: rightSwordRef };
  const slashes = { left: leftSlashRef, right: rightSlashRef };

  const petals = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, () => ({
        left: Math.random() * 100,
        drift: Math.random() * 80 - 40,
        duration: 7 + Math.random() * 6,
        delay: Math.random() * -12,
        opacity: 0.4 + Math.random() * 0.5,
      })),
    []
  );

  // Setup: mirror the right-hand fighter and start idle sway. Runs once on
  // mount — GSAP owns the whole transform chain on these elements from here
  // on, so nothing else (CSS or otherwise) should set their transform.
  useGSAP(
    () => {
      if (!leftBodyRef.current || !rightBodyRef.current || !leftSwordRef.current || !rightSwordRef.current) return;
      gsap.set(rightBodyRef.current, { scaleX: -1, transformOrigin: '50% 50%' });
      gsap.set([leftSwordRef.current, rightSwordRef.current], { rotation: REST_ANGLE, transformOrigin: '0px 0px' });

      if (!prefersReducedMotion()) {
        gsap.to(leftBodyRef.current, { y: -4, duration: 2.1, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        gsap.to(rightBodyRef.current, { y: -4, duration: 2.1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.05 });
      }
    },
    { scope: scopeRef }
  );

  // One strike: wind up (blade back, small step back), lunge forward while
  // the blade swings through its arc, the impact lands at the swing's apex
  // (flashing the screen streak and knocking the defender back), then the
  // attacker recovers to guard.
  useGSAP(
    () => {
      if (!strike) return;
      const attackerKey: Side | null = left?.id === strike.strikerId ? 'left' : right?.id === strike.strikerId ? 'right' : null;
      if (!attackerKey) return;
      const defenderKey: Side = attackerKey === 'left' ? 'right' : 'left';

      const atkBody = bodies[attackerKey].current;
      const atkSword = swords[attackerKey].current;
      const defBody = bodies[defenderKey].current;
      const slashEl = slashes[attackerKey].current;
      if (!atkBody || !atkSword || !defBody) return;

      const reduce = prefersReducedMotion();
      const t = reduce ? 0.01 : 1;
      const lunge = 60 * DIR[attackerKey];
      const knockback = -16 * DIR[defenderKey];

      gsap
        .timeline()
        .to(atkSword, { rotation: REST_ANGLE - 46, duration: 0.11 * t, ease: 'power1.out' }, 0)
        .to(atkBody, { x: -6 * DIR[attackerKey], duration: 0.11 * t, ease: 'power1.out' }, 0)
        .to(atkBody, { x: lunge, duration: 0.13 * t, ease: 'power4.in' }, 0.11 * t)
        .to(atkSword, { rotation: REST_ANGLE + 96, duration: 0.13 * t, ease: 'power4.in' }, 0.11 * t)
        .call(
          () => {
            if (slashEl) {
              slashEl.classList.remove('duel-arena__slash--active');
              void slashEl.offsetWidth;
              slashEl.classList.add('duel-arena__slash--active');
            }
            defBody.classList.remove('swordsman--hit-flash');
            void defBody.getBoundingClientRect(); // SVGElement has no offsetWidth — this is the reflow-forcing equivalent
            defBody.classList.add('swordsman--hit-flash');
            if (scopeRef.current) {
              scopeRef.current.classList.remove('duel-arena--shake');
              void scopeRef.current.offsetWidth;
              scopeRef.current.classList.add('duel-arena--shake');
            }
            gsap
              .timeline()
              .to(defBody, { x: knockback, duration: reduce ? 0.01 : 0.07, ease: 'power4.out' })
              .to(defBody, { x: 0, duration: reduce ? 0.01 : 0.32, ease: 'elastic.out(1, 0.5)' });
          },
          undefined,
          0.22 * t
        )
        .to(atkBody, { x: 0, duration: 0.34 * t, ease: 'power2.out' }, 0.26 * t)
        .to(atkSword, { rotation: REST_ANGLE, duration: 0.34 * t, ease: 'power2.out' }, 0.26 * t);
    },
    { scope: scopeRef, dependencies: [strike?.seq] }
  );

  const leftIsVictor = !!left?.finished;
  const rightIsVictor = !!right?.finished;

  // Victory/defeat pose — fires exactly once per transition, since the
  // dependency pair only changes the instant the match is decided.
  useGSAP(
    () => {
      const winnerKey: Side | null = leftIsVictor ? 'left' : rightIsVictor ? 'right' : null;
      if (!winnerKey) return;
      const loserKey: Side = winnerKey === 'left' ? 'right' : 'left';
      const winnerBody = bodies[winnerKey].current;
      const loserBody = bodies[loserKey].current;
      if (!winnerBody || !loserBody) return;

      const reduce = prefersReducedMotion();
      gsap.to(winnerBody, { y: -12, duration: reduce ? 0.01 : 0.6, ease: 'power2.out' });
      gsap.to(loserBody, {
        rotation: -14 * DIR[loserKey],
        y: 10,
        opacity: 0.65,
        transformOrigin: '50% 100%',
        duration: reduce ? 0.01 : 0.7,
        ease: 'power2.in',
      });
    },
    { scope: scopeRef, dependencies: [leftIsVictor, rightIsVictor] }
  );

  if (!left || !right) return null;

  const leftHp = Math.max(0, 1 - (right.carProgress ?? 0)) * 100;
  const rightHp = Math.max(0, 1 - (left.carProgress ?? 0)) * 100;

  return (
    <div className="duel-arena" ref={scopeRef}>
      <div className="duel-arena__kanji" aria-hidden="true">
        斬
      </div>
      <div className="duel-arena__moon" />

      <svg className="duel-arena__torii" viewBox="0 0 200 90" fill="none" aria-hidden="true">
        <rect x="18" y="18" width="8" height="60" fill="#f3f0e4" />
        <rect x="174" y="18" width="8" height="60" fill="#f3f0e4" />
        <rect x="4" y="8" width="192" height="10" rx="2" fill="#f3f0e4" />
        <rect x="0" y="22" width="200" height="6" rx="2" fill="#f3f0e4" />
      </svg>

      <div className="duel-arena__mist" />
      <div className="duel-arena__mist duel-arena__mist--low" />
      <div className="duel-arena__ground" />

      <div className="duel-arena__petals" aria-hidden="true">
        {petals.map((p, i) => (
          <div
            key={i}
            className="duel-arena__petal"
            style={
              {
                left: `${p.left}%`,
                '--drift': `${p.drift}px`,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                opacity: p.opacity,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="duel-arena__vs">VS</div>

      <div className="duel-arena__duel">
        <div
          className={`duel-arena__fighter duel-arena__fighter--left${leftIsVictor ? ' duel-arena__fighter--victor' : ''}${rightIsVictor ? ' duel-arena__fighter--defeated' : ''}`}
        >
          <div className="duel-arena__plate">
            <span className="duel-arena__plate-name">{left.nickname}</span>
            <span className="duel-arena__plate-hp">
              <span className="duel-arena__plate-hp-fill" style={{ width: `${leftHp}%` }} />
            </span>
          </div>
          <Swordsman index={left.avatarIndex} bodyRef={leftBodyRef} swordRef={leftSwordRef} />
        </div>

        <div
          className={`duel-arena__fighter duel-arena__fighter--right${rightIsVictor ? ' duel-arena__fighter--victor' : ''}${leftIsVictor ? ' duel-arena__fighter--defeated' : ''}`}
        >
          <div className="duel-arena__plate">
            <span className="duel-arena__plate-name">{right.nickname}</span>
            <span className="duel-arena__plate-hp">
              <span className="duel-arena__plate-hp-fill" style={{ width: `${rightHp}%` }} />
            </span>
          </div>
          <Swordsman index={right.avatarIndex} bodyRef={rightBodyRef} swordRef={rightSwordRef} />
        </div>
      </div>

      <div className="duel-arena__slash duel-arena__slash--left" ref={leftSlashRef} />
      <div className="duel-arena__slash duel-arena__slash--right" ref={rightSlashRef} />
    </div>
  );
}
