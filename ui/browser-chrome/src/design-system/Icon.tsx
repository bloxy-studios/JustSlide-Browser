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
  const w = size ?? def.width;
  const h = size ? Math.round((size * def.height) / def.width * 100) / 100 : def.height;
  return createElement(
    'svg',
    {
      viewBox: def.viewBox, width: w, height: h, fill: 'none', className, focusable: 'false',
      'data-icon': name,
      ...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true }),
    },
    ...def.children.map(render),
  );
}

export function hasIcon(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}
