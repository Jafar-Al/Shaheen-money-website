/**
 * A monospace figure sets "." and "," in a full-width cell, which reads as
 * "6 . 36%" at display sizes. Wrapping punctuation lets CSS pull it in
 * (.fig-punct in global.css). Used by the server render and by the
 * count-up (src/lib/motion/count.ts), so the two produce the same markup.
 */
export function figureHTML(text: string): string {
  return text
    .replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)
    .replace(/([.,])/g, '<span class="fig-punct">$1</span>');
}
