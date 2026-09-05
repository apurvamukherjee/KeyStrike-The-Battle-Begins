import { useMemo, useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Swordsman from '../Swordsman/Swordsman';
import type { DuelStrike } from '../DuelArena/DuelArena';
import { prefersReducedMotion } from '../../utils/motion';
import './DuelArenaFFA.css';

export interface FFAFighter {
  /** Matches room.players[].id (the live socket id) — what strike.strikerId/targetId are keyed by. */
  id: string;
  nickname: string;
  avatarIndex: number;
  /** 0-1 */
  hp: number;
  eliminated: boolean;
  isYou: boolean;
}

interface DuelArenaFFAProps {
  /** 3-4 fighters, evenly spaced across the dojo floor — auto-targeted (lowest hp), never manually picked. */
  fighters: FFAFighter[];
  strike?: DuelStrike | null;
}

const REST_ANGLE = -34;
const PETAL_COUNT = 14;

/**
 * The 3-4 fighter sibling to DuelArena (which is built entirely around a
 * fixed mirrored left/right pair — a shape that can't stretch to a variable
 * arc of independents without tangling every GSAP calculation in
 * conditionals). Backdrop markup/CSS is intentionally duplicated rather than
 * shared, since there's no existing shared "arena backdrop" piece to factor
 * it into. Strikes swing/flash in place — no lunge/knockback vector, since
 * there's no fixed opposite side to lunge toward the way 1v1/2v2 have.
 */
export default function DuelArenaFFA({ fighters, strike }: DuelArenaFFAProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const bodyRefs = useRef(new Map<string, SVGSVGElement>());
  const swordRefs = useRef(new Map<string, SVGGElement>());

  const petals = useMemo(
    () =>
      Array.from({ length: PETAL_COUNT }, () => ({
        left: Math.random() * 100,
        drift: Math.random() * 80 - 40,
        duration: 7 + Math.random() * 6,
        delay: Math.random() * -12,
        opacity: 0.4 + Math.random() * 0.5,
      })),
    [],
  );

  // Setup: sword rest angle + a gently staggered idle sway per fighter, so a
  // 3-4 person lineup doesn't bob in unison. Depends on the fighter *count*
  // (not their live hp), so it only re-runs if someone joins/leaves the fight.
  useGSAP(
    () => {
      const swords = [...swordRefs.current.values()];
      if (swords.length === 0) return;
      gsap.set(swords, { rotation: REST_ANGLE, transformOrigin: '0px 0px' });

      if (!prefersReducedMotion()) {
        [...bodyRefs.current.entries()].forEach(([id, body], i) => {
          gsap.to(body, { y: -4, duration: 2.1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.35 });
          void id;
        });
      }
    },
    { scope: scopeRef, dependencies: [fighters.length] },
  );

  // One strike: the attacker's blade swings in place; at the swing's apex the
  // defender flashes and gives a small in-place recoil wobble, and the whole
  // arena shakes — the same primitives DuelArena uses, just without a
  // lunge/knockback vector between two arbitrary lineup positions.
  useGSAP(
    () => {
      if (!strike) return;
      const atkSword = swordRefs.current.get(strike.strikerId);
      const atkBody = bodyRefs.current.get(strike.strikerId);
      const defBody = strike.targetId ? bodyRefs.current.get(strike.targetId) : undefined;
      if (!atkSword || !atkBody) return;

      const reduce = prefersReducedMotion();
      const t = reduce ? 0.01 : 1;

      gsap
        .timeline()
        .to(atkSword, { rotation: REST_ANGLE - 46, duration: 0.11 * t, ease: 'power1.out' }, 0)
        .to(atkSword, { rotation: REST_ANGLE + 96, duration: 0.13 * t, ease: 'power4.in' }, 0.11 * t)
        .call(
          () => {
            if (defBody) {
              defBody.classList.remove('swordsman--hit-flash');
              void defBody.getBoundingClientRect();
              defBody.classList.add('swordsman--hit-flash');
              gsap
                .timeline()
                .to(defBody, { rotation: -6, duration: reduce ? 0.01 : 0.07, ease: 'power4.out' })
                .to(defBody, { rotation: 0, duration: reduce ? 0.01 : 0.32, ease: 'elastic.out(1, 0.5)' });
            }
            if (scopeRef.current) {
              scopeRef.current.classList.remove('duel-arena-ffa--shake');
              void scopeRef.current.offsetWidth;
              scopeRef.current.classList.add('duel-arena-ffa--shake');
            }
          },
          undefined,
          0.22 * t,
        )
        .to(atkSword, { rotation: REST_ANGLE, duration: 0.34 * t, ease: 'power2.out' }, 0.26 * t);
    },
    { scope: scopeRef, dependencies: [strike?.seq] },
  );

  if (fighters.length === 0) return null;

  return (
    <div className="duel-arena-ffa" ref={scopeRef}>
      <div className="duel-arena-ffa__kanji" aria-hidden="true">
        乱
      </div>
      <div className="duel-arena-ffa__moon" />

      <svg className="duel-arena-ffa__torii" viewBox="0 0 200 90" fill="none" aria-hidden="true">
        <rect x="18" y="18" width="8" height="60" fill="#f3f0e4" />
        <rect x="174" y="18" width="8" height="60" fill="#f3f0e4" />
        <rect x="4" y="8" width="192" height="10" rx="2" fill="#f3f0e4" />
        <rect x="0" y="22" width="200" height="6" rx="2" fill="#f3f0e4" />
      </svg>

      <div className="duel-arena-ffa__mist" />
      <div className="duel-arena-ffa__mist duel-arena-ffa__mist--low" />
      <div className="duel-arena-ffa__ground" />

      <div className="duel-arena-ffa__petals" aria-hidden="true">
        {petals.map((p, i) => (
          <div
            key={i}
            className="duel-arena-ffa__petal"
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

      <div className="duel-arena-ffa__lineup" data-count={fighters.length}>
        {fighters.map((f) => (
          <div
            key={f.id}
            className={`duel-arena-ffa__fighter${f.isYou ? ' duel-arena-ffa__fighter--you' : ''}${f.eliminated ? ' duel-arena-ffa__fighter--out' : ''}`}
          >
            <div className="duel-arena-ffa__plate">
              <span className="duel-arena-ffa__plate-name">
                {f.nickname}
                {f.isYou ? ' (you)' : ''}
              </span>
              <span className="duel-arena-ffa__plate-hp">
                <span className="duel-arena-ffa__plate-hp-fill" style={{ width: `${Math.max(0, f.hp) * 100}%` }} />
              </span>
            </div>
            <Swordsman
              index={f.avatarIndex}
              bodyRef={(el) => {
                if (el) bodyRefs.current.set(f.id, el);
                else bodyRefs.current.delete(f.id);
              }}
              swordRef={(el) => {
                if (el) swordRefs.current.set(f.id, el);
                else swordRefs.current.delete(f.id);
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
