// Entry point and the only non-hook module: it declares the shared design data
// (sources, views, brands, themes), constructs the Style Dictionary instances,
// and exposes the CLI. All translation logic lives under `hooks/`.
//
// There are two Style Dictionary stages, named after their output platform keys:
//   1. `<filter>-dtcg` (buildDtcg) — read the Acronis token files and emit six
//      per-mode, 100%-DTCG JSON files. Serialized from `normalizeTree` directly,
//      NOT via an SD format: SD's init normalization relocates `$type`, which
//      would break the intermediate's "every token self-describing, references
//      intact" contract. See context/pipeline.md.
//   2. `<filter>-css` (buildCss) — resolve those views per brand into one CSS
//      file each, zipping light/dark colors into `light-dark()`.
// `<filter>-assets` (buildAssets) is a separate domain (its source is the
// design-assets SVG packs, not tokens) and is a placeholder today.
//
// `filter` is the design-tokens `platforms` enum value (PD today; WEB coming);
// the platform key is `${filter}-${output}` (e.g. `pd-css`), which is also the
// dist dir name and the CLI selector. Usage:
//   tsx src/index.ts                                  all filters, all outputs
//   tsx src/index.ts pd-css                           one platform (runs its dtcg dep first)
//   tsx src/index.ts pd-assets --pack=icons-solid-mono   one asset pack only
//   tsx src/index.ts --filter=pd                      restrict to one filter

import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import StyleDictionary from 'style-dictionary';
import type { Config, File } from 'style-dictionary/types';

import { STATIC_HOOKS } from './hooks';
import { CSS_LIGHT_DARK, type CssLightDarkOptions } from './hooks/formats/css-light-dark';
import { SEMANTIC_ONLY } from './hooks/filters/semantic-only';
import { normalizeTree } from './hooks/preprocessors/acronis-dtcg';
import { ACRONIS_CSS_GROUP } from './hooks/transforms';

// ── Platform keys ──────────────────────────────────────────────────────────────
// A build target is `${filter}-${output}`. `filter` maps to the design-tokens
// `platforms` enum and is threaded into normalization; `output` is the artifact
// kind. Adding WEB = add `'web'` to FILTERS once WEB-scoped tokens exist.

export type Filter = 'pd' | 'web';
export type Output = 'dtcg' | 'css' | 'assets';
export type PlatformKey = `${Filter}-${Output}`;

/** Filter slug → the design-tokens `platforms` enum value kept by normalization. */
const FILTER_ENUM: Record<Filter, 'PD' | 'WEB'> = { pd: 'PD', web: 'WEB' };

/** Filters that actually have source data today. WEB lands here when it exists. */
const FILTERS: Filter[] = ['pd'];

const OUTPUTS: Output[] = ['dtcg', 'css', 'assets'];

/** Tool root (`tools/style-dictionary/`). */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Gitignored build output dir for a platform key (`dist/pd-css/`). */
const distDir = (key: PlatformKey): string => path.join(ROOT, 'dist', key);

const rel = (p: string): string => path.relative(process.cwd(), p);

// ── Sources ──────────────────────────────────────────────────────────────────
// Where the design data lives and how it is read.

/** A raw token tree (a DTCG-shaped JSON object). */
type TokenTree = Record<string, unknown>;

/** The three source token files, addressed via the package's `exports`. */
const TOKEN_SOURCES = {
  primitives: '@acronis-platform/design-tokens/tokens/primitives.json',
  semantic: '@acronis-platform/design-tokens/tokens/semantic.json',
  components: '@acronis-platform/design-tokens/tokens/components.json',
} as const;

type TokenSourceName = keyof typeof TOKEN_SOURCES;

/** Read and parse one source token file by name. */
function readTokenSource(name: TokenSourceName): TokenTree {
  const url = import.meta.resolve(TOKEN_SOURCES[name]);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as TokenTree;
}

/** The assets package, addressed via its `exports`. */
const DESIGN_ASSETS_PACKAGE = '@acronis-platform/design-assets';

/** Enumerate the asset pack names (`packs/*.json` stems, = each pack's `name`). */
function availablePacks(): string[] {
  const url = import.meta.resolve(`${DESIGN_ASSETS_PACKAGE}/package.json`);
  const packsDir = path.join(path.dirname(fileURLToPath(url)), 'packs');
  return readdirSync(packsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

// ── Shared design data ─────────────────────────────────────────────────────────

/**
 * Stage-1 outputs. `primitives` carries the Theme axis (light/dark); `semantic`
 * and `components` carry the Brand axis (acronis/brand-b). `mode` is the key to
 * pick out of each token's `values` dict; single-value tokens (units, font,
 * typography composites) are mode-invariant and emitted into every view of their
 * source file unchanged.
 */
interface DtcgView {
  out: string;
  source: TokenSourceName;
  mode: string;
}

const VIEWS: DtcgView[] = [
  { out: 'primitives-light', source: 'primitives', mode: 'light' },
  { out: 'primitives-dark', source: 'primitives', mode: 'dark' },
  { out: 'semantic-acronis', source: 'semantic', mode: 'acronis' },
  { out: 'semantic-brand-b', source: 'semantic', mode: 'brand-b' },
  { out: 'components-acronis', source: 'components', mode: 'acronis' },
  { out: 'components-brand-b', source: 'components', mode: 'brand-b' },
];

/**
 * Stage-2 brands. Each CSS file resolves its brand's semantic + component view
 * against both theme views of the primitives, zipping colors into `light-dark()`.
 */
interface Brand {
  name: string;
  semantic: string;
  components: string;
}

const BRANDS: Brand[] = [
  { name: 'acronis', semantic: 'semantic-acronis', components: 'components-acronis' },
  { name: 'brand-b', semantic: 'semantic-brand-b', components: 'components-brand-b' },
];

type Theme = 'light' | 'dark';

// ── Style Dictionary factory ─────────────────────────────────────────────────
// Every instance shares this tool's static hooks (transforms, transform group,
// format, filter). Stage 2 (css) is the only stage that runs through SD; stage 1
// (dtcg) writes normalized trees directly (see file header).

const makeSd = (config: Config): StyleDictionary =>
  new StyleDictionary({
    usesDtcg: true,
    log: { verbosity: 'silent', warnings: 'disabled' },
    hooks: STATIC_HOOKS,
    ...config,
  });

// ── Stage 1: dtcg ──────────────────────────────────────────────────────────────

function buildDtcg(filter: Filter): void {
  const outDir = distDir(`${filter}-dtcg`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Each source feeds several views (primitives → light + dark, etc.), so read
  // each file once up front rather than re-reading it per view.
  const sources = {} as Record<TokenSourceName, TokenTree>;
  for (const name of Object.keys(TOKEN_SOURCES) as TokenSourceName[]) {
    sources[name] = readTokenSource(name);
  }

  for (const view of VIEWS) {
    const tree = normalizeTree(sources[view.source], view.mode, FILTER_ENUM[filter]);
    const dest = path.join(outDir, `${view.out}.json`);
    writeFileSync(dest, `${JSON.stringify(tree, null, 2)}\n`);
    console.log(`✓ ${rel(dest)}`);
  }
}

// ── Stage 2: css ─────────────────────────────────────────────────────────────

const readView = (filter: Filter, name: string): Config['tokens'] =>
  JSON.parse(readFileSync(path.join(distDir(`${filter}-dtcg`), `${name}.json`), 'utf8'));

/** Merge a brand's semantic + component views with one theme of the primitives. */
const mergeViews = (filter: Filter, brand: Brand, theme: Theme): Config['tokens'] => ({
  ...readView(filter, `primitives-${theme}`),
  ...readView(filter, brand.semantic),
  ...readView(filter, brand.components),
});

const cssConfig = (
  filter: Filter,
  brand: Brand,
  theme: Theme,
  files: File[] = []
): Config => {
  const key: PlatformKey = `${filter}-css`;
  return {
    tokens: mergeViews(filter, brand, theme),
    platforms: {
      [key]: {
        transformGroup: ACRONIS_CSS_GROUP,
        buildPath: `${distDir(key)}${path.sep}`,
        files,
      },
    },
  };
};

/** Resolve a theme to a `path → value` map of its color tokens (already `rgb()` strings). */
async function resolveColorMap(
  filter: Filter,
  brand: Brand,
  theme: Theme
): Promise<Map<string, string>> {
  const sd = makeSd(cssConfig(filter, brand, theme));
  const { allTokens } = await sd.getPlatformTokens(`${filter}-css`);
  return new Map(
    allTokens
      .filter((t) => t.$type === 'color')
      .map((t) => [t.path.join('.'), t.$value as string])
  );
}

async function buildCss(filter: Filter): Promise<void> {
  const outDir = distDir(`${filter}-css`);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  for (const brand of BRANDS) {
    const darkTokens = await resolveColorMap(filter, brand, 'dark');
    const destination = `${brand.name}.css`;
    const options: CssLightDarkOptions & { showFileHeader: boolean } = {
      darkTokens,
      brand: brand.name,
      label: rel(path.join(outDir, destination)),
      showFileHeader: false,
    };

    const sd = makeSd(
      cssConfig(filter, brand, 'light', [
        { destination, format: CSS_LIGHT_DARK, filter: SEMANTIC_ONLY, options },
      ])
    );
    await sd.buildAllPlatforms();
  }
}

// ── Assets (placeholder) ───────────────────────────────────────────────────────
// PLACEHOLDER peer of dtcg/css. Its source is @acronis-platform/design-assets (SVG
// packs), NOT the design tokens — so it is its own step, not an SD platform peer
// of `pd-css`. Resolving packs (variants → source binaries or scale/stroke
// derivation plans) needs an SVG transform step; specified in
// packages/design-assets/context/spec.md. `packs` selects a subset (CI rebuilds
// only the packs that changed); undefined = all packs.

function buildAssets(filter: Filter, packs?: string[]): void {
  const outDir = distDir(`${filter}-assets`);
  mkdirSync(outDir, { recursive: true });
  const selected = packs ?? availablePacks();
  console.warn(
    `⚠ ${rel(outDir)} — assets build not implemented yet ` +
      `(${DESIGN_ASSETS_PACKAGE}; see packages/design-assets/context/spec.md). ` +
      `Packs: ${selected.join(', ')}.`
  );
}

// ── CLI ────────────────────────────────────────────────────────────────────────

/** One requested build target, split into its two axes. */
type Pair = { filter: Filter; output: Output };

const validKeys = (): PlatformKey[] =>
  FILTERS.flatMap((f) => OUTPUTS.map((o): PlatformKey => `${f}-${o}`));

function parseKey(key: string): Pair {
  // Neither a filter (pd/web) nor an output (dtcg/css/assets) contains a dash,
  // so the last dash is always the boundary between them.
  const dash = key.lastIndexOf('-');
  const filter = key.slice(0, dash) as Filter;
  const output = key.slice(dash + 1) as Output;
  if (!FILTERS.includes(filter) || !OUTPUTS.includes(output)) {
    throw new Error(`Unknown platform: ${key}. Known: ${validKeys().join(', ')}.`);
  }
  return { filter, output };
}

interface ParsedArgs {
  filters: Filter[];
  packs: string[] | undefined;
  pairs: Pair[];
}

/** Turn `process.argv` into the filters, packs, and build pairs to run. */
function parseArgs(args: string[]): ParsedArgs {
  const filterArg = args
    .find((a) => a.startsWith('--filter='))
    ?.slice('--filter='.length) as Filter | undefined;
  if (filterArg && !FILTERS.includes(filterArg)) {
    throw new Error(`Unknown filter: ${filterArg}. Known: ${FILTERS.join(', ')}.`);
  }
  const filters = filterArg ? [filterArg] : FILTERS;

  const packArgs = args
    .filter((a) => a.startsWith('--pack='))
    .flatMap((a) => a.slice('--pack='.length).split(','))
    .map((s) => s.trim())
    .filter(Boolean);
  const packs = packArgs.length ? packArgs : undefined;
  if (packs) {
    const known = availablePacks();
    const unknown = packs.filter((p) => !known.includes(p));
    if (unknown.length) {
      throw new Error(`Unknown pack(s): ${unknown.join(', ')}. Known: ${known.join(', ')}.`);
    }
  }

  const requestedKeys = args.filter((a) => !a.startsWith('-'));
  const pairs = requestedKeys.length
    ? requestedKeys.map(parseKey).filter((p) => filters.includes(p.filter))
    : filters.flatMap((f) => OUTPUTS.map((o): Pair => ({ filter: f, output: o })));

  return { filters, packs, pairs };
}

async function main(): Promise<void> {
  const { filters, packs, pairs } = parseArgs(process.argv.slice(2));

  const outputsByFilter = new Map<Filter, Set<Output>>();
  for (const { filter, output } of pairs) {
    const set = outputsByFilter.get(filter) ?? new Set<Output>();
    set.add(output);
    outputsByFilter.set(filter, set);
  }

  for (const filter of filters) {
    const outputs = outputsByFilter.get(filter);
    if (!outputs) continue;
    // css reads the dtcg files, so dtcg runs first as its dependency.
    if (outputs.has('dtcg') || outputs.has('css')) buildDtcg(filter);
    if (outputs.has('css')) await buildCss(filter);
    if (outputs.has('assets')) buildAssets(filter, packs);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
