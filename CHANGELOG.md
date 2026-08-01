# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.4] - 2026-08-01

### Security (P0)
- **Fix SVG theme/font parameter injection.** `bg`/`fg`/`line`/`accent`/`muted`/
  `surface`/`border` and `font` render options are now treated as untrusted input.
  - A centralized sanitizer (`src/sanitize.ts`) validates CSS colors against a
    strict whitelist, enforces a safe font-name charset, and XML-escapes the SVG
    `style` attribute and `<style>` block.
  - Malicious values (e.g. `onload`, `<script>`, `</style>` breakout, `url()`)
    are rejected and fall back to safe defaults. Output can no longer carry
    injected event handlers or markup — important when inserting SVG via
    `dangerouslySetInnerHTML`.
  - New tests: `src/__tests__/security.test.ts`, `src/__tests__/svg-integrity.test.ts`.

### Compatibility (P0)
- **Support top-level semicolon-separated statements** (`graph LR; A --> B`) and
  **no-space arrows** (`A-->B`, `A--label-->B`) on a par with spaced syntax.
  - The parser now splits statements with a quote/paren-aware scanner so
    semicolons inside labels, quoted strings, or node brackets are preserved.
  - New tests: `src/__tests__/syntax-compat.test.ts`.

### Robustness (P1)
- **Harden the synchronous ELK adapter.** Global `setTimeout`/`self` mutations
  are now restored with `try/finally`; the private `dispatcher.saveDispatch()`
  interface is validated at init with clear errors; `elkjs` is pinned to `0.11.0`.
  - New tests: `src/__tests__/elk-robustness.test.ts`.

### Tooling & CI
- **Pin Bun to 1.3.14** and add a **Node 18/20/22 compatibility matrix**
  (type-check, build, and consume the ESM artifact with Node itself).
- **README examples are now executable tests** — every diagram in the docs is
  rendered and checked for safety (`src/__tests__/readme-examples.test.ts`).
- **Add a packed-package consumer smoke test** (`npm run test:pack`) that
  installs the actual npm tarball in an isolated offline consumer and renders
  SVG/ASCII/async in Node ESM.

### Quality
- Test suite grew from 711 to **765 passing tests**; public API surface
  unchanged (package `exports`/`main`/`types` and all render function signatures
  are identical); no performance regression observed.
