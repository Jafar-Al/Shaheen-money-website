/**
 * Small DOM helpers for the console's client code.
 *
 * Every piece of data reaches the page as text (textContent, attributes),
 * never as HTML: a name or a failure reason from the API cannot inject
 * markup. Styles are classes from admin.css; the few computed values
 * (a bar's width, a tooltip's position) are custom properties set through
 * CSSOM, which the site's CSP allows (it forbids style="" attributes).
 */
type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined>;

function applyAttrs(el: Element, attrs: Attrs | undefined): void {
  if (!attrs) return;
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.setAttribute('class', String(v));
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}

function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  applyAttrs(el, attrs);
  append(el, children);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function s<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Attrs, ...children: Child[]): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  applyAttrs(el, attrs);
  append(el, children);
  return el;
}

export const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
export const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

/** Required element: a missing one is a markup bug, so say which. */
export function need<T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}

export function clear(el: Element): void {
  el.replaceChildren();
}

/** Sets a custom property through CSSOM (allowed by the CSP, unlike style=""). */
export function setVar(el: Element, name: string, value: string | number): void {
  (el as HTMLElement | SVGElement).style.setProperty(name, String(value));
}

/** Fills every [data-slot="name"] inside root with text. */
export function slots(root: ParentNode, values: Record<string, string | number | null | undefined>): void {
  for (const [name, value] of Object.entries(values)) {
    for (const el of root.querySelectorAll(`[data-slot="${name}"]`)) el.textContent = value === null || value === undefined ? '' : String(value);
  }
}

/** Puts a figure's text into an element, pulling in its . and , (src/lib/figure.ts). */
export function figure(el: Element, text: string): void {
  el.replaceChildren();
  for (const part of text.split(/([.,])/)) {
    if (part === '.' || part === ',') el.append(h('span', { class: 'fig-punct' }, part));
    else if (part) el.append(document.createTextNode(part));
  }
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number): (...args: A) => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
