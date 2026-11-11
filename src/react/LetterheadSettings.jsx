/*
 * Page settings for <LetterheadDocument>: background image + top/bottom/side
 * margins (mm), remembered in localStorage. Screen only (hidden in print).
 *
 *   const [settings, update, reset] = useLetterheadSettings("invoice-letterhead", {
 *     image: "/letterhead.png", top: 58, bottom: 40, side: 15,
 *   });
 *
 *   <LetterheadSettings settings={settings} onChange={update} onReset={reset} />
 *   <LetterheadDocument
 *     background={settings.image}
 *     top={settings.top + "mm"} bottom={settings.bottom + "mm"} side={settings.side + "mm"}
 *     guides={settings.guides}
 *   >…</LetterheadDocument>
 *
 * If settings must follow the user across devices or be shared by a company,
 * replace the localStorage part of the hook with your API (same shape).
 */
import { useCallback, useEffect, useState } from "react";

const DEFAULT_LABELS = {
  title: "Page settings",
  image: "Page background",
  top: "Top margin (mm)",
  bottom: "Bottom margin (mm)",
  side: "Side margin (mm)",
  guides: "Show margins",
  reset: "Reset",
  close: "Close",
  hint: "Set the top and bottom margins to the height of the background's header and footer.",
  notSaved: "Applied, but too large to remember in this browser.",
};

export function useLetterheadSettings(storageKey, defaults) {
  const base = { top: 58, bottom: 40, side: 15, guides: false, ...defaults };

  const [settings, setSettings] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      return { ...base, ...saved };
    } catch {
      return base;
    }
  });
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    // remember only what differs from the defaults
    const changed = {};
    Object.keys(settings).forEach((k) => {
      if (settings[k] !== base[k]) changed[k] = settings[k];
    });
    try {
      if (Object.keys(changed).length) window.localStorage.setItem(storageKey, JSON.stringify(changed));
      else window.localStorage.removeItem(storageKey);
      setSaveError(false);
    } catch {
      setSaveError(true); // e.g. a large uploaded image over the storage quota
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, storageKey]);

  const update = useCallback((values) => setSettings((s) => ({ ...s, ...values })), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reset = useCallback(() => setSettings(base), [storageKey]);

  return [settings, update, reset, saveError];
}

// number input that keeps what the user is typing (e.g. an empty field)
// and only reports valid values
function MmField({ label, value, max, onCommit }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (parseFloat(draft) !== value) setDraft(String(value)); // changed from outside (reset)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label>
      <span>{label}</span>
      <input
        type="number"
        min="0"
        max={max}
        step="1"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = parseFloat(e.target.value);
          if (!Number.isNaN(v) && v >= 0) onCommit(v);
        }}
      />
    </label>
  );
}

export default function LetterheadSettings({
  settings,
  onChange,
  onReset,
  saveError = false,
  labels,
  defaultOpen = false,
  dir,
}) {
  const L = { ...DEFAULT_LABELS, ...labels };
  const [open, setOpen] = useState(defaultOpen);

  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange({ image: reader.result }); // data: URL prints and can be saved
    reader.readAsDataURL(file);
  };

  return (
    <div className={"lh-settings" + (open ? " lh-open" : "")} dir={dir}>
      <button type="button" className="lh-settings-toggle" aria-expanded={open} onClick={() => setOpen(true)}>
        {"⚙ " + L.title}
      </button>
      <div className="lh-settings-body">
        <div className="lh-settings-title">{L.title}</div>
        <label>
          <span>{L.image}</span>
          <input type="file" accept="image/*" onChange={onFile} />
        </label>
        <MmField label={L.top} max={200} value={settings.top} onCommit={(v) => onChange({ top: v })} />
        <MmField label={L.bottom} max={200} value={settings.bottom} onCommit={(v) => onChange({ bottom: v })} />
        <MmField label={L.side} max={80} value={settings.side} onCommit={(v) => onChange({ side: v })} />
        <label className="lh-check">
          <input type="checkbox" checked={!!settings.guides} onChange={(e) => onChange({ guides: e.target.checked })} />
          <span>{L.guides}</span>
        </label>
        <p className="lh-settings-hint">{L.hint}</p>
        <p className="lh-settings-status">{saveError ? L.notSaved : ""}</p>
        <div className="lh-settings-actions">
          <button type="button" onClick={onReset}>{L.reset}</button>
          <button type="button" onClick={() => setOpen(false)}>{L.close}</button>
        </div>
      </div>
    </div>
  );
}
