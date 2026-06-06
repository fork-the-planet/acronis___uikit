// Font-family transform units: a design token carries only the preferred family
// (Figma can't express a stack), so CSS generation appends a web-safe fallback
// chain. These pin that behaviour for both the standalone `scalar/css` path and
// the `typography/css-class` composite path.

import type { TransformedToken } from 'style-dictionary/types';
import { describe, expect, it } from 'vitest';

import { formatFontFamily, scalarCss } from '../transforms/scalar-css';
import { typographyCssClass } from '../transforms/typography-css-class';

const token = (over: Partial<TransformedToken>): TransformedToken =>
  ({ name: 'x', path: ['x'], ...over }) as TransformedToken;

describe('formatFontFamily', () => {
  it('appends the sans fallback chain to a known family', () => {
    expect(formatFontFamily('Inter')).toBe('Inter, system-ui, sans-serif');
  });

  it('quotes a multi-word family and uses its monospace fallback', () => {
    expect(formatFontFamily('IBM Plex Mono')).toBe('"IBM Plex Mono", ui-monospace, monospace');
  });

  it('uses the generic sans fallback for an unmapped family', () => {
    expect(formatFontFamily('Foo Sans')).toBe('"Foo Sans", sans-serif');
  });

  it('trims surrounding whitespace before mapping', () => {
    expect(formatFontFamily('  Inter  ')).toBe('Inter, system-ui, sans-serif');
  });

  it('strips quotes a prior scalar pass added before mapping', () => {
    expect(formatFontFamily('"IBM Plex Mono"')).toBe('"IBM Plex Mono", ui-monospace, monospace');
  });
});

describe('scalar/css transform', () => {
  // The fallback chain lives only in the typography transform; scalar/css must
  // leave a referenced fontFamily primitive untouched, or the composite that
  // references it would apply the fallback twice.
  it('leaves a fontFamily primitive as a bare family name', () => {
    const out = scalarCss.transform(
      token({ $type: 'fontFamily', $value: 'Inter' }),
      {} as never,
      {} as never
    );
    expect(out).toBe('Inter');
  });
});

describe('typography/css-class transform', () => {
  it('renders the fontFamily field as a full stack inside the block', () => {
    const out = typographyCssClass.transform(
      token({
        $type: 'typography',
        $value: { fontFamily: 'Inter', fontSize: '14px', fontWeight: 400 },
      }),
      {} as never,
      {} as never
    );
    expect(out).toContain('font-family: Inter, system-ui, sans-serif;');
    expect(out).toContain('font-size: 14px;');
  });
});
