/*
 * <LetterheadDocument> — React wrapper around letterhead.css + letterhead.js.
 *
 *   import LetterheadDocument from "./letterhead/react/LetterheadDocument";
 *
 *   <LetterheadDocument background="/letterhead.png" top="58mm" bottom="40mm">
 *     <h1>Invoice</h1>
 *     ...
 *   </LetterheadDocument>
 *
 * Props
 *   background  URL of the full-page letterhead image (A4 proportions)  [required]
 *   top         space reserved for the image's header      (default "58mm")
 *   bottom      space reserved for the image's footer      (default "40mm")
 *   side        left/right text padding                   (default "15mm")
 *   preview     show A4 sheets on screen                   (default true)
 *   printMode   "fixed" (Chrome/Edge default) or "sheets" (print the sheets)
 *   guides      outline the text area on screen (to tune top/bottom)
 *
 * Let users choose the background and margins: see LetterheadSettings.jsx.
 *   dir         text direction, e.g. "rtl" for Arabic
 *
 * Client-only: in Next.js App Router put "use client" in the file that renders it.
 */
import { useEffect, useRef } from "react";
import "../letterhead.css";
import "../letterhead.js"; // defines window.Letterhead

export default function LetterheadDocument({
  background,
  top = "58mm",
  bottom = "40mm",
  side = "15mm",
  preview = true,
  printMode = "fixed",
  guides = false,
  dir,
  className = "",
  children,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !preview || !window.Letterhead) return undefined;

    const content = root.querySelector(".lh-content");
    let frame = 0;
    const run = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => window.Letterhead.paginate(root));
    };

    // first layout once web fonts are ready (text height depends on them)
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(run);

    // re-paginate whenever the content changes (data loaded, edits, ...)
    const mo = new MutationObserver(run);
    mo.observe(content, { childList: true, subtree: true, characterData: true, attributes: true });

    // and when images inside the content finish loading
    content.addEventListener("load", run, true);

    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      content.removeEventListener("load", run, true);
      // back to the un-paginated view; React owns .lh-doc, the sheets are ours
      root.classList.remove("lh-paged");
      const pages = root.querySelector(".lh-pages");
      if (pages) pages.innerHTML = "";
    };
  }, [preview, background, top, bottom, side]);

  const classes = [
    "lh-root",
    printMode === "sheets" ? "lh-print-sheets" : "",
    guides ? "lh-guides" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={rootRef}
      className={classes}
      dir={dir}
      style={{ "--lh-top": top, "--lh-bottom": bottom, "--lh-side": side }}
    >
      <img className="lh-bg" src={background} alt="" />
      <table className="lh-doc">
        <thead>
          <tr>
            <td>
              <div className="lh-top" />
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="lh-content">{children}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td>
              <div className="lh-bottom" />
            </td>
          </tr>
        </tfoot>
      </table>
      {/* filled by letterhead.js; React never renders children here */}
      <div className="lh-pages" />
    </div>
  );
}
