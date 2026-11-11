# letterhead-print

A small library for printing HTML (offers, invoices, reports, often Arabic/RTL) with a letterhead image as the background of every printed page, plus an A4 page preview on screen. Plain HTML, server templates and React.

## Layout

- `src/` — the library (what users copy into their projects as `letterhead/`)
  - `letterhead.css` — print layout (`.lh-root`, `.lh-bg`, `.lh-doc`, `.lh-top`/`.lh-bottom` spacers), screen A4 sheets, `lh-print-sheets` mode, `lh-guides`, settings panel styles
  - `letterhead.js` — `window.Letterhead.{paginate, auto, settings}`. **Keep it ES5**, with no `:scope`, arrow functions or modules, so it runs in old engines (wkhtmltopdf) and can be imported as a side effect from React bundles.
  - `react/LetterheadDocument.jsx` — React wrapper (MutationObserver re-pagination; props `background`, `top`, `bottom`, `side`, `preview`, `printMode`, `guides`, `dir`)
  - `react/LetterheadSettings.jsx` — `useLetterheadSettings(key, defaults)` hook + `<LetterheadSettings>` panel (same CSS classes as the vanilla panel)
- `examples/` — `basic.html`, `offer-ar.html` (real Arabic offer with Bootstrap; needs the `.lh-root .container` override), `react/` (built with esbuild into `examples/react/dist/`, which is git-ignored), `assets/letterhead.png` (sample "Water Maker" letterhead, 1055×1491; header line at ≈46 mm, footer wave peak ≈52 mm from the bottom, so the examples use `--lh-top: 52mm; --lh-bottom: 58mm`)
- `docs/guide.md` — the full guide; `docs/images/` — generated screenshots. Update both when behavior changes.
- `scripts/screenshots.mjs` — Playwright (uses the installed Chrome through `channel: "chrome"`): writes `docs/images/*.jpg` and `output/*.pdf`
- `backup/` — the user's personal tests and old versions. **Git-ignored; don't use them or reference them in docs.**

## How the technique works (short)

- Print: a `position: fixed` A4 `<img class="lh-bg">` is repeated on every page by Chrome/Edge. Empty `<thead>`/`<tfoot>` spacer rows repeat on every page and keep the text out of the image's header and footer. `@page { size: A4; margin: 0 }`.
- Screen: `letterhead.js` copies `.lh-content` into 210×297 mm `.lh-sheet`s with the image as their background. UL/OL/TABLE/TBODY and `.container`/`.section`/`.lh-split` may split; tables repeat their thead; headings move along with the next block; empty shells move to the next page whole.
- Settings: `Letterhead.settings` saves only the values that differ from the page's defaults, in localStorage.

## Gotchas

- An ancestor with `transform`, `filter` or `perspective` breaks the fixed background (it prints on the first page only); use `lh-print-sheets` instead.
- Use an `<img>` for the print background, not a CSS background. An `<img>` prints even when "Background graphics" is off.
- Only Chrome/Edge are verified. Firefox, Safari and wkhtmltopdf are untested.
- Print fits slightly more per page than the screen preview (the browser's own breaks); the `sheets` mode matches the screen exactly.

## Commands

```bash
npm install
npm run build:example   # React example bundle
npm run screenshots     # build + regenerate docs/images and output/*.pdf
npm run pdf             # PDFs only
```

To verify a change: run `npm run screenshots`, then look at the images and at every page of the PDFs. Check that the letterhead is on every page and that no text overlaps its header or footer. Chrome may write crashpad noise to `debug.log` (git-ignored).
