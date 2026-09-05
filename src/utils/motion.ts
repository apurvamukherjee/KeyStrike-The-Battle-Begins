/**
 * Respects both the OS-level setting and the app's own in-Settings toggle
 * (utils/settings.ts sets `data-reduce-motion` on the root) — every CSS
 * animation in the app already checks both via a paired media query and
 * `:root[data-reduce-motion='true']` selector; this is the JS-side (GSAP)
 * equivalent for code that can't just let CSS decide.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.reduceMotion === 'true'
  );
}
