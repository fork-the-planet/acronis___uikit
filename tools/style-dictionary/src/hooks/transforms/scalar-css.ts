// Value transform: remaining scalar leaf values → a CSS-ready string. Catches
// standalone numeric/string tokens that aren't a color, dimension, typography, or
// gradient. Strings containing whitespace (font-family stacks) are quoted;
// everything else is stringified. The `typography/css-class` transform reuses
// `formatScalar` for its number/string sub-fields, and `formatFontFamily` (which
// appends the web-safe fallback chain) for the `fontFamily` field.

import type { Transform } from 'style-dictionary/types';
import { transformTypes } from 'style-dictionary/enums';

export const SCALAR_CSS = 'scalar/css';

// Types handled by their own transform or skipped by the format, never here.
const HANDLED_ELSEWHERE = new Set(['color', 'dimension', 'typography', 'gradient']);

// Generic CSS fallback families appended to a design font-family when emitting
// CSS. The design tokens carry only the preferred family (e.g. "Inter") — that
// is all Figma's font-family variables express — so the web-safe fallback chain
// is a platform (web/CSS) concern, applied here at generation time rather than
// stored in the token. Keyed by the preferred family; unknown families fall back
// to the generic `sans-serif`.
const FONT_FAMILY_FALLBACKS: Readonly<Record<string, string>> = {
  Inter: 'system-ui, sans-serif',
  'IBM Plex Mono': 'ui-monospace, monospace',
};

// Generic family used when a preferred family has no explicit fallback mapping.
const GENERIC_FONT_FALLBACK = 'sans-serif';

// Quote a single family name only when CSS requires it (whitespace in the name).
const quoteFamily = (name: string): string => (/\s/.test(name) ? JSON.stringify(name) : name);

/**
 * A resolved scalar (number or string) → a CSS-ready string. Whitespace-bearing
 * strings (font-family stacks) are quoted; everything else is stringified.
 */
export const formatScalar = (v: number | string): string =>
  typeof v === 'string' ? (/\s/.test(v) ? JSON.stringify(v) : v) : String(v);

/**
 * A design font-family (a single preferred family such as `Inter` or
 * `IBM Plex Mono`) → a full CSS font stack with a web-safe fallback chain, each
 * family quoted as needed, e.g. `Inter, system-ui, sans-serif`.
 */
export const formatFontFamily = (value: string): string => {
  // Strip any surrounding quotes a prior scalar pass may have added so the
  // fallback lookup keys on the bare family name.
  const primary = value.trim().replace(/^"(.*)"$/, '$1');
  const fallback = FONT_FAMILY_FALLBACKS[primary] ?? GENERIC_FONT_FALLBACK;
  return `${quoteFamily(primary)}, ${fallback}`;
};

export const scalarCss: Transform = {
  name: SCALAR_CSS,
  type: transformTypes.value,
  transitive: false,
  filter: (token) =>
    !HANDLED_ELSEWHERE.has(token.$type as string) &&
    (typeof token.$value === 'number' || typeof token.$value === 'string'),
  transform: (token) => formatScalar(token.$value as number | string),
};
