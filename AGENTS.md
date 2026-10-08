# AGENTS.md

## Commands

```bash
npm test                      # node --test (62 tests)
node --test test/signals.test.js   # run ONE test file
npm run build                 # esbuild → dist/ (4 targets)
npm run demo                  # static server → http://localhost:5173
```

- `node --test test/` FAILS on Windows (`test/` parsed as module → MODULE_NOT_FOUND). Always bare `node --test` or a specific file.
- No lint, typecheck, formatter, or CI is configured. Do not add tooling unless asked.
- `prepublishOnly` = `npm run build && npm test`.

## Build/test wiring (easy to get wrong)

- Unit tests import `../src/**` directly; `test/dist.test.js` loads the **built** `dist/trackwise.min.js`, and `demo/index.html` loads dist too. **After any `src/` edit, run `npm run build`** before testing/previewing, or dist-based tests exercise stale code.
- `dist/` is committed on purpose (script-tag users download it raw). Never gitignore it.
- Build output must keep the IIFE/CJS footers in `scripts/build.mjs` — the global `TrackWise` and `module.exports` merges happen there, not in `src/`.

## Architecture

- Entrypoints: `src/index.js` (public `TrackWise` object + auto-init), `src/core/tracker.js` (`createTracker(userConfig, env)` — composition root; `env` is injectable `{win, doc, scriptData, transport}`, which is how tests run in jsdom with a fake transport).
- Collectors (`src/collectors/*`) register on `start()` and return a destroy fn; `stop()`/`destroy()` relies on these — every collector must tear down its listeners.
- Config precedence: `DEFAULT_CONFIG` < `window.TRACKWISE_CONFIG` < `data-*` script attributes (`src/core/config.js`).

## Conventions & invariants

- Plain JavaScript + JSDoc only. **No comments except JSDoc** (project rule). No TypeScript, no build-time types.
- jsdom has no canvas/fetch/alert/sendBeacon: `renderHeatmap` returning `null` in tests is expected; inject a fake `transport` rather than polyfilling network APIs.
- Privacy behavior is contractually tested — form values never logged, keyboard limited to nav keys, PII/URL scrubbing (`src/privacy/sanitize.js`). Changes must keep `test/sanitize.test.js` + privacy assertions in `test/dom.test.js` green.
- README badge hardcodes the test count — update it when adding tests.
- `examples/node-receiver/data/` is gitignored (runtime NDJSON output); `package.json` `files` controls what npm ships (dist, src, docs only).

## More context

`PROJECT_STATE.md` holds the full design history, feature catalog, and pending work (GitHub push, npm publish, CI).
