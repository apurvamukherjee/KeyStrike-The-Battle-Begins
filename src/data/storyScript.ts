import { TOTAL_STORY_LEVELS } from './storyLevels';

/** Who is speaking — decides the dialog box's side, color and portrait. */
export type Speaker = 'hero' | 'enemy' | 'narrator';

export interface DialogLine {
  speaker: Speaker;
  /** Shown above the text. For 'hero'/'enemy' the screen substitutes the real names. */
  name?: string;
  text: string;
}

export interface LevelScript {
  /** Played on the way into the fight. */
  before: DialogLine[];
  /** Played after a win. Skipped entirely on a loss — losing replays `before`. */
  after: DialogLine[];
}

/**
 * The campaign's through-line, in five acts of ten levels. A duel game with a
 * 50-level ladder needs a reason to climb it, so the script gives one: the
 * blade you carry was your master's, and the man who took it from him is
 * waiting at the top.
 *
 * Grunt levels draw from the act's own pools rather than being hand-written
 * fifty times — the act's mood carries them, and the named milestones (every
 * 5th level, see storyLevels.ts) get bespoke scenes.
 */

interface Act {
  /** First level of the act. */
  from: number;
  title: string;
  /** Scene-setting line shown once, on the act's opening level. */
  opening: string;
  /** Grunt taunts for this act, cycled by level. */
  taunts: string[];
  /** The hero's replies, cycled by level. */
  replies: string[];
  /** Post-win lines for grunt fights. */
  victories: string[];
}

/**
 * Kaede — the rival. She appears on a fixed set of levels across the whole
 * campaign, never as a boss, always as the same person a little further along
 * her own road. Recurring faces are what make a 50-level ladder feel like a
 * story rather than a queue, so she gets her own scenes wherever she shows up.
 */
const RIVAL_NAME = 'Kaede';

const RIVAL_LEVELS: Record<number, LevelScript> = {
  7: {
    before: [
      { speaker: 'enemy', name: RIVAL_NAME, text: 'You’re the dojo boy. I was two provinces over when the smoke went up.' },
      { speaker: 'hero', text: 'And you came looking for me.' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'I came looking for whoever was left. Turns out it’s one underfed kid with a famous sword. Show me it wasn’t wasted on you.' },
    ],
    after: [
      { speaker: 'enemy', name: RIVAL_NAME, text: 'Hm. Not wasted. Sloppy, but not wasted.' },
      { speaker: 'hero', text: 'Are you going to keep following me?' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'I’m going the same way. That’s not the same thing.' },
    ],
  },
  18: {
    before: [
      { speaker: 'narrator', text: `${RIVAL_NAME} is waiting at the crossroads, and she has been in a fight recently that she did not clearly win.` },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'Don’t. I know what my face looks like.' },
      { speaker: 'hero', text: 'Who?' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'One of his. He didn’t even draw. Fight me — I need to know if I’ve gotten worse or he’s just that far ahead.' },
    ],
    after: [
      { speaker: 'enemy', name: RIVAL_NAME, text: 'You’ve gotten better. That’s the answer, isn’t it. It’s not that I slipped.' },
      { speaker: 'hero', text: 'Come with me.' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'No. You’d slow down for me, and then we’d both die politely. Go.' },
    ],
  },
  28: {
    before: [
      { speaker: 'enemy', name: RIVAL_NAME, text: 'They’re saying you know now. About your master. About what he made.' },
      { speaker: 'hero', text: 'I know.' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'Then this is the part where you either put the sword down or become insufferable about it. Let’s find out which.' },
    ],
    after: [
      { speaker: 'enemy', name: RIVAL_NAME, text: 'Insufferable. Definitely insufferable.' },
      { speaker: 'hero', text: 'You’re smiling.' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'I’m relieved. A man who’d put it down now was never going to reach him.' },
    ],
  },
  38: {
    before: [
      { speaker: 'narrator', text: `${RIVAL_NAME} does not greet you. She is sitting with her sword across her knees, facing the mountain.` },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'I got to the fourth gate. That’s further than anyone I know.' },
      { speaker: 'hero', text: 'That’s further than I’ve gotten.' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'You’ll pass it. That’s why I’m here — one last honest fight before you go somewhere I can’t follow.' },
    ],
    after: [
      { speaker: 'enemy', name: RIVAL_NAME, text: 'There. Now I’ve lost to the person who beats him. That’ll do.' },
      { speaker: 'hero', text: 'And if I don’t?' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'Then I’ll come up after you, and I’ll be furious the whole way. Don’t make me climb that thing.' },
    ],
  },
  48: {
    before: [
      { speaker: 'narrator', text: `The path narrows to a stair cut into the rock. ${RIVAL_NAME} is sitting on the bottom step.` },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'I’m not going to talk you out of it.' },
      { speaker: 'hero', text: 'Good.' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'But I’m not letting you up there cold, either. Warm your hands on me first.' },
    ],
    after: [
      { speaker: 'enemy', name: RIVAL_NAME, text: 'Go on, then. I’ll be at the bottom when you come down.' },
      { speaker: 'hero', text: 'And if I don’t come down?' },
      { speaker: 'enemy', name: RIVAL_NAME, text: 'Then I’ll sweep the floor myself. Somebody has to.' },
      { speaker: 'narrator', text: 'She does not watch you go. It seems to cost her something not to.' },
    ],
  },
};

/** Levels where the rival appears instead of an ordinary grunt. */
export function isRivalLevel(level: number): boolean {
  return level in RIVAL_LEVELS;
}

export { RIVAL_NAME };

const ACTS: Act[] = [
  {
    from: 1,
    title: 'The Road Out',
    opening:
      'They burned the dojo at first light. You walked out of the ash with one thing that still mattered — your master’s blade — and one name he spoke before the end.',
    taunts: [
      'The dojo’s gone, boy. Go home.',
      'You hold that sword like it owes you something.',
      'Another orphan with a famous blade. The road is full of you.',
      'Turn back. There’s nothing at the top of this road but better killers.',
      'I knew your master’s name. Knowing it never made anyone good.',
      'You haven’t slept. It shows in your grip.',
      'Six days on the road and you still stand like a student.',
    ],
    replies: [
      'It owes me nothing. I owe it.',
      'Then you won’t mind losing to one.',
      'I’m not going home. I’m going up.',
      'Then I’ll meet them.',
      'It doesn’t have to. I do.',
      'Then you should have struck while I was sleeping.',
      'I am a student. That’s the point.',
    ],
    victories: [
      'They stay down. You keep walking.',
      'One more name you won’t remember. One more mile.',
      'The blade is quiet again. You are not.',
      'You clean the edge on the grass, the way he taught you.',
      'Somewhere behind you, the ash is still settling.',
    ],
  },
  {
    from: 11,
    title: 'The Iron Road',
    opening:
      'Word travels faster than you do. By the second province they know the sword on your back, and the men who come for it are no longer amateurs.',
    taunts: [
      'That blade has a price on it. I’m here to collect.',
      'You’ve gotten faster. Not fast enough.',
      'Every school between here and the capital wants that sword.',
      'You fight like a student. Who’s left to teach you?',
      'Three of us tried for it last month. You won’t remember them either.',
      'The capital eats people like you and doesn’t chew.',
      'You’re not even carrying money. Just that sword.',
    ],
    replies: [
      'Come and take it.',
      'Keep talking. I’ll keep cutting.',
      'They can want. You first.',
      'Nobody. That’s why I’m here.',
      'Then bring more of you.',
      'I’m not going there to be eaten.',
      'It’s all I need.',
    ],
    victories: [
      'The road narrows. The names on it get heavier.',
      'You are getting better. That frightens you more than they do.',
      'Another blade in the dirt. The capital is closer.',
      'You are getting harder to stop. You notice it before they do.',
      'The bounty on the sword goes up. So does the caliber of the men.',
    ],
  },
  {
    from: 21,
    title: 'What the Blade Remembers',
    opening:
      'An old woman at a waystation recognizes the hilt. "He carried that when he came through here," she says. "Going the other way. Running."',
    taunts: [
      'Your master ran, you know. That’s the part they leave out.',
      'You’re chasing a ghost who wasn’t worth chasing.',
      'He begged. At the end. I heard it from someone who was there.',
      'What will you do when you learn what he did?',
      'Ask anyone on this road. They all tell it the same way.',
      'A coward’s blade in a stubborn boy’s hands.',
      'You’re not angry at me. You’re angry that it might be true.',
    ],
    replies: [
      'Then he ran for a reason.',
      'He was worth this much.',
      'You heard it from a liar.',
      'Find out with me.',
      'I’m asking. I keep asking.',
      'Say that again with your guard up.',
      'I can be both.',
    ],
    victories: [
      'You win, and the question stays exactly where it was.',
      'Their words follow you further than their blade did.',
      'Doubt is heavier than steel. You carry both.',
      'The answer gets closer and you want it less.',
      'Every mile costs you something you thought you knew.',
    ],
  },
  {
    from: 31,
    title: 'The Debt',
    opening:
      'The truth, when it comes, is plain: your master did run — from a student he had failed, who became the thing at the top of this ladder. The blade you carry was that student’s first.',
    taunts: [
      'So you know now. Still climbing?',
      'He made the monster. You’re just cleaning up.',
      'You carry a stolen sword to avenge a coward.',
      'Put it down. The debt isn’t yours.',
      'The debt died with him. Go home.',
      'You could put it down. Nobody would blame you.',
      'What’s left to avenge? He wasn’t wronged. He was outclassed.',
    ],
    replies: [
      'Now more than before.',
      'Then I’ll finish what he started.',
      'I carry it because no one else will.',
      'It is now.',
      'Debts don’t die. They get inherited.',
      'I’d blame me.',
      'He was afraid. That’s not the same as wrong.',
    ],
    victories: [
      'You don’t feel lighter. You didn’t expect to.',
      'The blade cuts the same whoever it belonged to first.',
      'Ten levels left. You stop counting them as enemies.',
      'You don’t feel righteous. You feel committed. It will have to do.',
      'The mountain is visible now, on clear mornings.',
    ],
  },
  {
    from: 41,
    title: 'The Sword Saint',
    opening:
      'The last stretch is silent. No bounty hunters, no schools — only the ones he kept, standing aside as you pass, as if they had been told to.',
    taunts: [
      'He’s expecting you. He has been for years.',
      'We were told to let you through. Do you understand what that means?',
      'You’re not the first to come this far.',
      'He wants to see what your master made.',
      'Nobody here will stop you. That should frighten you.',
      'He asked what you look like when you’re losing. I said I didn’t know yet.',
    ],
    replies: [
      'Good.',
      'It means he’s tired of waiting. So am I.',
      'I’ll be the last.',
      'So do I.',
      'Let him wait a little longer.',
      'Keep not knowing.',
    ],
    victories: [
      'They step aside. They were always going to.',
      'The air thins. The top is close.',
      'No one else stops you.',
      'Nobody cheers. They simply let you pass.',
      'The stair up is swept. Someone keeps it swept.',
    ],
  },
];

function actFor(level: number): Act {
  let found = ACTS[0];
  for (const act of ACTS) if (level >= act.from) found = act;
  return found;
}

/** The named milestone scenes — the story's actual beats. */
const MILESTONE_SCRIPTS: Record<number, LevelScript> = {
  5: {
    before: [
      { speaker: 'enemy', text: 'You’re the one from the burned dojo. I trained there too, once. Before I found better work.' },
      { speaker: 'hero', text: 'Then you know what you helped burn.' },
      { speaker: 'enemy', text: 'I know what it paid. Draw.' },
    ],
    after: [
      { speaker: 'enemy', text: 'He… he told us you were nothing. A sweeper. A boy with a broom.' },
      { speaker: 'hero', text: 'Who told you?' },
      { speaker: 'enemy', text: 'Ask the next one. I’m done.' },
    ],
  },
  10: {
    before: [
      { speaker: 'narrator', text: 'The provincial champion does not rise when you enter. He is already holding his sword.' },
      { speaker: 'enemy', text: 'Nine before you this month. None of them had that blade, though.' },
      { speaker: 'hero', text: 'Then you know whose it was.' },
      { speaker: 'enemy', text: 'I know whose it is. That’s a different question, and you won’t like the answer.' },
    ],
    after: [
      { speaker: 'enemy', text: 'Go to the capital, then. Ask about the student who broke his master’s hands.' },
      { speaker: 'hero', text: 'My master’s hands were fine.' },
      { speaker: 'enemy', text: 'Were they? Did he ever hold a sword in front of you? Even once?' },
      { speaker: 'narrator', text: 'You try to remember. You cannot.' },
    ],
  },
  15: {
    before: [
      { speaker: 'enemy', text: 'You’ve been asking questions in every village on this road.' },
      { speaker: 'hero', text: 'And getting the same answer. He ran.' },
      { speaker: 'enemy', text: 'He ran because staying would have killed everyone in that dojo a decade sooner. Think about that while you bleed.' },
    ],
    after: [
      { speaker: 'hero', text: 'Say the rest of it.' },
      { speaker: 'enemy', text: 'The rest costs more than I’m willing to pay. But you’re close now. He’ll tell you himself.' },
    ],
  },
  20: {
    before: [
      { speaker: 'narrator', text: 'The gatekeeper of the capital road has been beaten exactly once. She remembers the man who did it.' },
      { speaker: 'enemy', text: 'Same stance. Same grip. Same stubborn set to the jaw. You’re his, all right.' },
      { speaker: 'hero', text: 'You fought him.' },
      { speaker: 'enemy', text: 'I lost to him. Then I watched him lose to someone else, and I stopped wanting to be the best at anything.' },
    ],
    after: [
      { speaker: 'enemy', text: 'Beyond this gate, nobody will talk to you like a person. They’ll talk to the sword.' },
      { speaker: 'hero', text: 'Let them.' },
      { speaker: 'enemy', text: 'That’s what he said too. Go on.' },
    ],
  },
  25: {
    before: [
      { speaker: 'enemy', text: 'I kept his letters. All of them. Would you like to know what he wrote in the last one?' },
      { speaker: 'hero', text: 'Fight first.' },
      { speaker: 'enemy', text: 'As you like. It’s a short letter.' },
    ],
    after: [
      { speaker: 'enemy', text: '"I made something I could not unmake. If he ever comes for me, do not let the boy follow."' },
      { speaker: 'hero', text: 'The boy.' },
      { speaker: 'enemy', text: 'You. He knew you’d follow. He asked us to stop you, and not one of us has managed it.' },
      { speaker: 'narrator', text: 'She presses a sun-forged blade into your hands. "Then take a better sword."' },
    ],
  },
  30: {
    before: [
      { speaker: 'enemy', text: 'I was the second student. You’re looking for the first.' },
      { speaker: 'hero', text: 'Tell me his name.' },
      { speaker: 'enemy', text: 'Names are for people. Beat me and I’ll tell you what he is instead.' },
    ],
    after: [
      { speaker: 'enemy', text: 'He was better than our master at seventeen. Our master knew it, and taught him anyway.' },
      { speaker: 'hero', text: 'That’s not a crime.' },
      { speaker: 'enemy', text: 'It is when you teach a man to win and nothing else. He has never lost. He does not know how. That is the whole of him.' },
    ],
  },
  35: {
    before: [
      { speaker: 'narrator', text: 'This one waits in the ruin of a school that used to have three hundred students.' },
      { speaker: 'enemy', text: 'He came through here in a single afternoon. Not one of them landed a cut.' },
      { speaker: 'hero', text: 'And you?' },
      { speaker: 'enemy', text: 'I was late that day. I’ve been early ever since.' },
    ],
    after: [
      { speaker: 'enemy', text: 'You landed four on me. He would have allowed you one, to see what you did with it.' },
      { speaker: 'hero', text: 'Then I’ll need the one.' },
    ],
  },
  40: {
    before: [
      { speaker: 'enemy', text: 'Last gate. I don’t want to fight you, and I’m going to anyway.' },
      { speaker: 'hero', text: 'Why?' },
      { speaker: 'enemy', text: 'Because if you can’t beat me, he’ll kill you in one motion, and I’d rather be the one who sent you home.' },
    ],
    after: [
      { speaker: 'enemy', text: 'All right. All right. You’re ready — or you’re fast enough to die interestingly.' },
      { speaker: 'hero', text: 'I’ll take either.' },
      { speaker: 'enemy', text: 'He’s at the top of the mountain, in the old training hall. Your master’s hall.' },
      { speaker: 'narrator', text: 'You had not known it was still standing.' },
    ],
  },
  45: {
    before: [
      { speaker: 'narrator', text: 'The last of his keepers stands in the doorway of the hall where you learned to hold a sword.' },
      { speaker: 'enemy', text: 'He left instructions. If you reached this door, I was to ask you one question.' },
      { speaker: 'hero', text: 'Ask it.' },
      { speaker: 'enemy', text: 'When you win — and he believes you will — do you intend to become what he is?' },
    ],
    after: [
      { speaker: 'hero', text: 'Tell him no.' },
      { speaker: 'enemy', text: 'He’ll be disappointed. He’s been lonely a long time.' },
      { speaker: 'narrator', text: 'The door opens on its own. Inside, someone is sweeping the floor.' },
    ],
  },
  50: {
    before: [
      { speaker: 'narrator', text: 'He does not look up from the broom. The hall is spotless. It has been, for years.' },
      { speaker: 'enemy', text: 'He swept this floor every morning. I have kept it up. It seemed owed.' },
      { speaker: 'hero', text: 'You killed him.' },
      { speaker: 'enemy', text: 'I beat him. He died of it eleven years later, which he would have said was the same thing, and he would have been right.' },
      { speaker: 'enemy', text: 'He taught me one lesson, and taught you the other. Let’s see which one holds.' },
    ],
    after: [
      { speaker: 'narrator', text: 'He sits down in the middle of the clean floor, and for the first time in his life, does not get up to continue.' },
      { speaker: 'enemy', text: 'Ah. So that’s what it feels like.' },
      { speaker: 'hero', text: 'He taught you to win. He taught me to keep going. That’s all it was.' },
      { speaker: 'enemy', text: 'That’s all it ever is.' },
      { speaker: 'narrator', text: 'You leave the sun-forged blade with him, and carry your master’s sword back down the mountain. Somewhere below, a dojo needs sweeping.' },
    ],
  },
};

/**
 * The script for a level: a bespoke milestone scene, or an act-flavored grunt
 * exchange. Act openings are prepended on the first level of each act.
 */
export function getLevelScript(level: number): LevelScript {
  const milestone = MILESTONE_SCRIPTS[level] ?? RIVAL_LEVELS[level];
  const act = actFor(level);
  const isActOpening = ACTS.some((a) => a.from === level);

  if (milestone) {
    const before = isActOpening
      ? [{ speaker: 'narrator' as const, text: act.opening }, ...milestone.before]
      : milestone.before;
    return { before, after: milestone.after };
  }

  // Grunt levels rotate the act's pools so consecutive fights never repeat.
  const i = level - act.from;
  const before: DialogLine[] = [
    { speaker: 'enemy', text: act.taunts[i % act.taunts.length] },
    { speaker: 'hero', text: act.replies[i % act.replies.length] },
  ];
  if (isActOpening) before.unshift({ speaker: 'narrator', text: act.opening });

  return {
    before,
    after: [{ speaker: 'narrator', text: act.victories[i % act.victories.length] }],
  };
}

/** The act title shown on the ladder screen, so the campaign reads as chapters. */
export function getActTitle(level: number): string {
  return actFor(level).title;
}

export function getActRange(level: number): { from: number; to: number } {
  const act = actFor(level);
  const next = ACTS.find((a) => a.from > act.from);
  return { from: act.from, to: (next ? next.from - 1 : TOTAL_STORY_LEVELS) };
}
