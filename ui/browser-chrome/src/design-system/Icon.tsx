import { createElement, type ReactElement } from 'react';
import { ICONS, type IconName, type SvgNode } from '../generated/icons';

export type { IconName };

function render(node: SvgNode, key: number): ReactElement {
  const [tag, attrs, children] = node;
  return createElement(tag, { ...attrs, key }, ...children.map(render));
}

/**
 * Renders a registry icon (Nucleo glyph or theSVG brand mark) as real SVG
 * elements. Glyphs inherit `currentColor`; brand marks keep official colours.
 * Decorative by default; pass `label` only when the icon is the sole content
 * of something that has no other accessible name.
 */
export function Icon({ name, size, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  const def = ICONS[name];
  // `size` is a square box (Figma frames icons in 12/14/16/18 boxes); keep the
  // mark's aspect ratio and fit its longer side, e.g. Netflix 10×18 in 18.
  const k = size ? size / Math.max(def.width, def.height) : 1;
  const w = Math.round(def.width * k * 100) / 100;
  const h = Math.round(def.height * k * 100) / 100;
  return createElement(
    'svg',
    {
      ...def.root, viewBox: def.viewBox, width: w, height: h, className, focusable: 'false',
      'data-icon': name,
      ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }),
    },
    ...def.children.map(render),
  );
}

export function hasIcon(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}
