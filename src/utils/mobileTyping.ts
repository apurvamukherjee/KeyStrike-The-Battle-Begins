export const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const LETTER_RE = /^[A-Z]$/;

/**
 * Wires a hidden, always-focused <input>'s value diff to a letter callback —
 * mobile virtual keyboards don't reliably fire usable keydown.key values
 * (iOS Safari especially), so touch devices drive typing this way instead of
 * physical key events. Mirrors the pattern originally built for GameplayScreen.
 * Returns a cleanup that removes the listener.
 */
export function attachMobileTypingInput(input: HTMLInputElement | null, onLetter: (letter: string) => void): () => void {
  if (!input) return () => {};
  function onInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    target.value = '';
    if (value.length === 0) return;
    const letter = value[value.length - 1].toUpperCase();
    if (!LETTER_RE.test(letter)) return;
    onLetter(letter);
  }
  input.addEventListener('input', onInput);
  return () => input.removeEventListener('input', onInput);
}
