import { useRef } from 'react';
import { usePetals } from './usePetals';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import Swordsman, { SWORDSMAN_PART } from '../Swordsman/Swordsman';
import type { Racer } from '../RaceTrack/RaceTrack';
import type { Judgement } from '../../types/game';
import { prefersReducedMotion } from '../../utils/motion';
import { pickAttack, type AttackSpec } from './attacks';
import { playStrike, resetFighter } from './strikeTimeline';
import './duelBackdrop.css';
import './DuelArena.css';

/** A one-shot strike to replay — bump `seq` (matching HudState's judgementSeq/milestoneSeq pattern elsewhere) to trigger it again for the same striker. */
export interface DuelStrike {
  /** Must match one of `racers[].id`. */
  strikerId: string;
  /** FFA Duel only — which fighter got hit, so DuelArenaFFA can play their hit-flash. Unused here since 1v1/2v2 always infer "the other side." */
  targetId?: string;
  seq: number;
  /** How the word that earned this strike was typed — picks the attack (see attacks.ts). Omitted for an opponent's swing, which falls back to the light slash. */
  judgement?: Judgement;
  /** Combo at the moment of the strike — at FINISHER_COMBO or above it becomes the spinning finisher. */
  combo?: number;
}

interface DuelArenaProps {
  /**
   * Exactly two racers/sides. For a Team Duel, each side is the single
   * team-combined `Racer` BattleScreen already builds for racing Team Mode
   * (id `team-A`/`team-B`, carProgress = the pair's summed progress) — its
   * optional `members` array is what tells this component to render a
   * second, unanimated teammate sprite alongside the primary fighter.
   */
  racers: Racer[];
  strike?: DuelStrike | null;
  /** Round wins so far this best-of-N match — omit for a single, non-match duel. Shown live, not just on the results screen, so the stakes of the current round are always visible. */
  matchScore?: { you: number; opponent: number };
}

type Side = 'left' | 'right';

const REST_ANGLE = -34;
const DIR: Record<Side, number> = { left: 1, right: -1 };

export default function DuelArena({ racers, strike, matchScore }: DuelArenaProps) {
  const [left, right] = racers;

  const scopeRef = useRef<HTMLDivElement>(null);
  const leftBodyRef = useRef<SVGSVGElement>(null);
  const rightBodyRef = useRef<SVGSVGElement>(null);
  const leftSwordRef = useRef<SVGGElement>(null);
  const rightSwordRef = useRef<SVGGElement>(null);
  const leftSlashRef = useRef<HTMLDivElement>(null);
  const rightSlashRef = useRef<HTMLDivElement>(null);
  const leftImpactRef = useRef<HTMLDivElement>(null);
  const rightImpactRef = useRef<HTMLDivElement>(null);

  const bodies = { left: leftBodyRef, right: rightBodyRef };
  const swords = { left: leftSwordRef, right: rightSwordRef };
  const slashes = { left: leftSlashRef, right: rightSlashRef };
  // Sparks spawn on the *defender's* side, where the blade actually lands.
  const impacts = { left: leftImpactRef, right: rightImpactRef };
  // The in-flight strike per side. At 80+ WPM a new word lands before the
  // previous animation finishes, so the old timeline is killed and its limbs
  // snapped back to guard — otherwise the two fight over the same properties
  // and the fighter drifts out of pose.
  const activeStrikes = useRef<Partial<Record<Side, gsap.core.Timeline>>>({});
  // The idle sway tweens that share `rotation` with a strike, per side.
  const idleSway = useRef<Partial<Record<Side, gsap.core.Tween[]>>>({});

  const petals = usePetals();

  // Setup: mirror the right-hand fighter and start the idle breathing loop.
  // Runs once on mount — GSAP owns the whole transform chain on these elements
  // from here on, so nothing else (CSS or otherwise) should set their transform.
  useGSAP(
    () => {
      if (!leftBodyRef.current || !rightBodyRef.current || !leftSwordRef.current || !rightSwordRef.current) return;
      gsap.set(rightBodyRef.current, { scaleX: -1, transformOrigin: '50% 50%' });
      gsap.set([leftSwordRef.current, rightSwordRef.current], { rotation: REST_ANGLE, transformOrigin: '0px 0px' });

      if (prefersReducedMotion()) return;

      // Idle: a slow breath plus a slight counter-sway of the blade and cloth,
      // offset per fighter so the two never bob in lockstep.
      for (const [side, body, delay] of [
        ['left', leftBodyRef.current, 0],
        ['right', rightBodyRef.current, 1.05],
      ] as const) {
        // Breathing stays on `y`, which no strike touches, so it runs
        // uninterrupted for the whole fight.
        gsap.to(body, { y: -4, duration: 2.1, repeat: -1, yoyo: true, ease: 'sine.inOut', delay });

        // The cloth/torso sway shares `rotation` with every strike, so these
        // are kept and paused while a strike plays — two tweens on the same
        // property would drag the swing back mid-arc and leave the idle
        // resuming from the wrong baseline.
        const torso = body.querySelector(`.${SWORDSMAN_PART.torso}`);
        const hair = body.querySelector(`.${SWORDSMAN_PART.hair}`);
        const sash = body.querySelector(`.${SWORDSMAN_PART.sash}`);
        const sway: gsap.core.Tween[] = [];
        if (torso) {
          sway.push(gsap.to(torso, { rotation: 1.6, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut', delay }));
        }
        const cloth = [hair, sash].filter(Boolean);
        if (cloth.length > 0) {
          sway.push(
            gsap.to(cloth, {
              rotation: 5,
              duration: 3.1,
              repeat: -1,
              yoyo: true,
              ease: 'sine.inOut',
              delay: delay + 0.4,
            }),
          );
        }
        idleSway.current[side] = sway;
      }
    },
    { scope: scopeRef },
  );

  // One strike, played by strikeTimeline: the attack is chosen from how the
  // word was typed (see attacks.ts), so a clean word visibly hits harder.
  useGSAP(
    () => {
      if (!strike) return;
      const attackerKey: Side | null = left?.id === strike.strikerId ? 'left' : right?.id === strike.strikerId ? 'right' : null;
      if (!attackerKey) return;
      const defenderKey: Side = attackerKey === 'left' ? 'right' : 'left';

      const atkBody = bodies[attackerKey].current;
      const atkSword = swords[attackerKey].current;
      const defBody = bodies[defenderKey].current;
      if (!atkBody || !atkSword || !defBody || !scopeRef.current) return;

      const spec: AttackSpec = pickAttack(strike.judgement, strike.combo ?? 0, strike.seq);

      const inFlight = activeStrikes.current[attackerKey];
      if (inFlight) {
        // kill() does not fire onComplete, so the interrupted strike's resume
        // never runs — this one's pause/resume pair takes over the same tweens.
        inFlight.kill();
        resetFighter(atkBody, atkSword, REST_ANGLE);
      }

      // Both fighters' sway is suspended: the attacker's limbs are driven by
      // the strike, and the defender's by the hit reaction. Pause is
      // idempotent, so interrupting a strike mid-pause is safe.
      const suspended = [...(idleSway.current[attackerKey] ?? []), ...(idleSway.current[defenderKey] ?? [])];
      for (const tween of suspended) tween.pause();

      activeStrikes.current[attackerKey] = playStrike(
        spec,
        {
          attacker: atkBody,
          sword: atkSword,
          defender: defBody,
          arena: scopeRef.current,
          streak: slashes[attackerKey].current,
          impact: impacts[defenderKey].current,
        },
        { dir: DIR[attackerKey], restAngle: REST_ANGLE, reduceMotion: prefersReducedMotion() },
      );

      // Hand the limbs back to the idle loop once the strike settles — but only
      // when no strike is still running on the other side, which in a fast
      // exchange would otherwise get its own swing dragged back by the
      // resumed sway. Tweens resume from where they paused, so the sway picks
      // up smoothly rather than snapping to a new phase.
      activeStrikes.current[attackerKey]?.eventCallback('onComplete', () => {
        activeStrikes.current[attackerKey] = undefined;
        if (activeStrikes.current[defenderKey]) return;
        for (const side of ['left', 'right'] as const) {
          for (const tween of idleSway.current[side] ?? []) tween.resume();
        }
      });
    },
    { scope: scopeRef, dependencies: [strike?.seq] },
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
    <div className="duel-arena duel-backdrop" ref={scopeRef}>
      <div className="duel-backdrop__kanji" aria-hidden="true">
        斬
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

      <div className="duel-arena__vs">VS</div>
      {matchScore && (
        <div className="duel-arena__match-score" aria-label="Match score">
          {matchScore.you} – {matchScore.opponent}
        </div>
      )}

      <div className="duel-arena__duel">
        <div
          className={`duel-arena__fighter duel-arena__fighter--left${leftIsVictor ? ' duel-arena__fighter--victor' : ''}${rightIsVictor ? ' duel-arena__fighter--defeated' : ''}`}
        >
          <div className="duel-arena__plate">
            <span className="duel-arena__plate-name">
              {left.members ? left.members.map((m) => m.nickname).join(' & ') : left.nickname}
            </span>
            <span className="duel-arena__plate-hp">
              <span className="duel-arena__plate-hp-fill" style={{ width: `${leftHp}%` }} />
            </span>
          </div>
          <div className="duel-arena__fighter-group">
            {left.members && left.members.length > 1 && (
              <Swordsman index={left.members[1].avatarIndex} className="duel-arena__ally" />
            )}
            <Swordsman index={left.avatarIndex} bodyRef={leftBodyRef} swordRef={leftSwordRef} />
            <div className="duel-arena__impact" ref={leftImpactRef} aria-hidden="true" />
          </div>
        </div>

        <div
          className={`duel-arena__fighter duel-arena__fighter--right${rightIsVictor ? ' duel-arena__fighter--victor' : ''}${leftIsVictor ? ' duel-arena__fighter--defeated' : ''}`}
        >
          <div className="duel-arena__plate">
            <span className="duel-arena__plate-name">
              {right.members ? right.members.map((m) => m.nickname).join(' & ') : right.nickname}
            </span>
            <span className="duel-arena__plate-hp">
              <span className="duel-arena__plate-hp-fill" style={{ width: `${rightHp}%` }} />
            </span>
          </div>
          <div className="duel-arena__fighter-group">
            {right.members && right.members.length > 1 && (
              <Swordsman index={right.members[1].avatarIndex} className="duel-arena__ally" />
            )}
            <Swordsman index={right.avatarIndex} bodyRef={rightBodyRef} swordRef={rightSwordRef} />
            <div className="duel-arena__impact" ref={rightImpactRef} aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="duel-arena__slash duel-arena__slash--left" ref={leftSlashRef} />
      <div className="duel-arena__slash duel-arena__slash--right" ref={rightSlashRef} />
    </div>
  );
}
