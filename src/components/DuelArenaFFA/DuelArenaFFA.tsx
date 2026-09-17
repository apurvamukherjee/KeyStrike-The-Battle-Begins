import { useRef } from 'react';
import { usePetals } from '../DuelArena/usePetals';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Swordsman, { SWORDSMAN_PART } from '../Swordsman/Swordsman';
import type { DuelStrike } from '../DuelArena/DuelArena';
import { pickAttack } from '../DuelArena/attacks';
import { resetFighter } from '../DuelArena/strikeTimeline';
import { prefersReducedMotion } from '../../utils/motion';
import '../DuelArena/duelBackdrop.css';
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
/**
 * The 3-4 fighter sibling to DuelArena (which is built entirely around a
 * fixed mirrored left/right pair — a shape that can't stretch to a variable
 * arc of independents without tangling every GSAP calculation in
 * conditionals). The night-dojo scenery comes from the shared
 * DuelArena/duelBackdrop.css, and strikes use the same typing-driven attack
 * set — but swung in place, since there's no fixed opposite side to lunge
 * toward the way 1v1/2v2 have.
 */
export default function DuelArenaFFA({ fighters, strike }: DuelArenaFFAProps) {
  const scopeRef = useRef<HTMLDivElement>(null);
  const bodyRefs = useRef(new Map<string, SVGSVGElement>());
  const swordRefs = useRef(new Map<string, SVGGElement>());
  // In-flight strike per fighter — a new one cancels the old rather than
  // letting two timelines fight over the same limbs (see DuelArena).
  const activeStrikes = useRef(new Map<string, gsap.core.Timeline>());

  const petals = usePetals();

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

  // One strike: the same typing-driven attack set as 1v1/2v2 (see attacks.ts),
  // but swung in place — there's no fixed opposite side to lunge toward, so the
  // spec's lunge is spent on a short step-and-return rather than a charge.
  useGSAP(
    () => {
      if (!strike) return;
      const atkSword = swordRefs.current.get(strike.strikerId);
      const atkBody = bodyRefs.current.get(strike.strikerId);
      const defBody = strike.targetId ? bodyRefs.current.get(strike.targetId) : undefined;
      if (!atkSword || !atkBody) return;

      const reduce = prefersReducedMotion();
      const spec = pickAttack(strike.judgement, strike.combo ?? 0, strike.seq);
      const t = reduce ? 0.01 : 1;
      const windup = spec.windup * t;
      const travel = spec.travel * t;

      const arm = atkBody.querySelector<SVGGraphicsElement>(`.${SWORDSMAN_PART.swordArm}`);
      const torso = atkBody.querySelector<SVGGraphicsElement>(`.${SWORDSMAN_PART.torso}`);
      const hair = atkBody.querySelector<SVGGraphicsElement>(`.${SWORDSMAN_PART.hair}`);
      const sash = atkBody.querySelector<SVGGraphicsElement>(`.${SWORDSMAN_PART.sash}`);
      const trail = atkSword.querySelector<SVGPathElement>(`.${SWORDSMAN_PART.trail}`);
      const cloth = [hair, sash].filter(Boolean);

      const inFlight = activeStrikes.current.get(strike.strikerId);
      if (inFlight) {
        inFlight.kill();
        resetFighter(atkBody, atkSword, REST_ANGLE);
      }

      const tl = gsap.timeline();
      activeStrikes.current.set(strike.strikerId, tl);

      tl.to(atkSword, { rotation: REST_ANGLE + spec.windupRotation, duration: windup, ease: 'power2.out' }, 0);
      if (!reduce) {
        tl.to(arm, { rotation: -spec.armRotation * 0.5, duration: windup, ease: 'power2.out' }, 0)
          .to(torso, { rotation: -5, duration: windup, ease: 'power2.out' }, 0)
          .to(cloth, { rotation: 14, duration: windup, ease: 'power2.out' }, 0);
      }

      tl.to(atkSword, { rotation: REST_ANGLE + spec.strikeRotation, duration: travel, ease: 'power4.in' }, windup)
        // A brace forward rather than a lunge, scaled to the attack's reach.
        .to(atkBody, { x: spec.lunge * 0.18, duration: travel, ease: 'power4.in' }, windup);
      if (!reduce) {
        tl.to(arm, { rotation: spec.armRotation, duration: travel, ease: 'power4.in' }, windup)
          .to(torso, { rotation: 8, duration: travel, ease: 'power3.in' }, windup)
          .to(cloth, { rotation: -24, duration: travel, ease: 'power3.in' }, windup);
        if (trail) {
          tl.to(trail, { opacity: 0.85, duration: travel * 0.6, ease: 'power2.in' }, windup).to(
            trail,
            { opacity: 0, duration: 0.18, ease: 'power2.out' },
            windup + travel + spec.hitstop,
          );
        }
      }

      const contact = windup + travel;
      tl.call(
        () => {
          if (defBody) {
            defBody.classList.remove('swordsman--hit-flash');
            void defBody.getBoundingClientRect();
            defBody.classList.add('swordsman--hit-flash');
          }
          if (scopeRef.current) {
            scopeRef.current.style.setProperty('--shake-weight', String(spec.weight));
            scopeRef.current.classList.remove('duel-backdrop--shake');
            void scopeRef.current.offsetWidth;
            scopeRef.current.classList.add('duel-backdrop--shake');
            if (!reduce && spec.flash) {
              scopeRef.current.classList.remove('duel-backdrop--flash');
              void scopeRef.current.offsetWidth;
              scopeRef.current.classList.add('duel-backdrop--flash');
            }
          }
        },
        undefined,
        contact,
      );

      // On this timeline, not a nested one built inside the callback above —
      // nested timelines escape useGSAP's cleanup and outlive the arena.
      if (defBody) {
        tl.to(defBody, { rotation: -6 * spec.weight, duration: reduce ? 0.01 : 0.07, ease: 'power4.out' }, contact).to(
          defBody,
          { rotation: 0, duration: reduce ? 0.01 : 0.32, ease: 'elastic.out(1, 0.5)' },
          contact + (reduce ? 0.01 : 0.07),
        );
      }

      // A real freeze-frame: pausing the timeline is what holds the pose. An
      // empty placeholder tween would pad the schedule while motion continued.
      const hitstop = reduce ? 0 : spec.hitstop;
      if (hitstop > 0) {
        tl.call(
          () => {
            tl.pause();
            gsap.delayedCall(hitstop, () => tl.resume());
          },
          undefined,
          contact,
        );
      }

      const recover = contact + (reduce ? 0.01 : 0.06);
      const recoverDur = reduce ? 0.01 : 0.36;
      tl.to(atkSword, { rotation: REST_ANGLE, duration: recoverDur, ease: 'power2.out' }, recover).to(
        atkBody,
        { x: 0, duration: recoverDur, ease: 'power2.out' },
        recover,
      );
      if (!reduce) {
        tl.to([arm, torso, ...cloth], { rotation: 0, duration: recoverDur, ease: 'power2.out' }, recover);
      }
    },
    { scope: scopeRef, dependencies: [strike?.seq] },
  );

  if (fighters.length === 0) return null;

  return (
    <div className="duel-arena-ffa duel-backdrop" ref={scopeRef}>
      <div className="duel-backdrop__kanji" aria-hidden="true">
        乱
      </div>
      <div className="duel-backdrop__moon" />

      <svg className="duel-backdrop__torii" viewBox="0 0 200 90" fill="none" aria-hidden="true">
        <rect x="18" y="18" width="8" height="60" fill="#f3f0e4" />
        <rect x="174" y="18" width="8" height="60" fill="#f3f0e4" />
        <rect x="4" y="8" width="192" height="10" rx="2" fill="#f3f0e4" />
        <rect x="0" y="22" width="200" height="6" rx="2" fill="#f3f0e4" />
      </svg>

      <div className="duel-backdrop__mist" />
      <div className="duel-backdrop__mist duel-backdrop__mist--low" />
      <div className="duel-backdrop__ground" />

      <div className="duel-backdrop__petals" aria-hidden="true">
        {petals.map((p, i) => (
          <div
            key={i}
            className="duel-backdrop__petal"
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
