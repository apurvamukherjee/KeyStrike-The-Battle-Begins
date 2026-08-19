/**
 * Live-typing variant of the server's sanitizeNickname() in server/index.js.
 * Only strips leading whitespace and disallowed characters — NOT trailing
 * whitespace, since this runs on every keystroke and trimming the trailing
 * space as soon as it's typed would make it impossible to type a second
 * word. The server (and this app's own submit handlers) do the final trim.
 */
export function sanitizeNickname(raw: string): string {
  const collapsed = raw.replace(/^\s+/, '').replace(/\s+/g, ' ');
  const allowed = collapsed.replace(/[^a-zA-Z0-9 .,'_-]/g, '');
  return allowed.slice(0, 16);
}
