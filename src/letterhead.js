/*
 * letterhead.js — flows .lh-content into A4 sheets with the
 * letterhead image as each sheet's background (screen preview, and print in
 * "sheets" mode). Plain ES5, no dependencies, safe to load in old engines.
 *
 *   Letterhead.paginate(rootEl [, options])   -> number of sheets
 *   Letterhead.auto([options])                -> paginates every .lh-root on load
 *
 * options:
 *   image         background URL (default: src of the root's .lh-bg <img>)
 *   splitClasses  extra class names of containers that may break across pages
 *                 (default ["container", "section", "lh-split"])
 *
 * Content rules:
 *   - UL/OL/TABLE/TBODY and the split classes may continue on the next page;
 *     everything else moves to the next page whole.
 *   - A table that continues repeats its <thead>.
 *   - A heading (H1-H6) is never left alone at the bottom of a page.
 *   - An element with class "lh-break-before" always starts a new page.
 *
 * The sheets are copies: event handlers on the original content are not kept.
 */
(function (root) {
  "use strict";
  if (!root || !root.document) return; // SSR / non-browser: do nothing

  var SPLIT_TAGS = { UL: 1, OL: 1, TABLE: 1, TBODY: 1 };

  function hasClass(el, name) {
    return (" " + el.className + " ").indexOf(" " + name + " ") > -1;
  }
  function childByTag(el, tag) {
    for (var i = 0; i < el.children.length; i++)
      if (el.children[i].tagName === tag) return el.children[i];
    return null;
  }
  function childByClass(el, cls) {
    for (var i = 0; i < el.children.length; i++)
      if (hasClass(el.children[i], cls)) return el.children[i];
    return null;
  }

  function paginate(rootEl, options) {
    options = options || {};
    var splitClasses = options.splitClasses || ["container", "section", "lh-split"];

    var doc = childByClass(rootEl, "lh-doc");
    var out = childByClass(rootEl, "lh-pages");
    var source = doc && doc.querySelector(".lh-content");
    if (!source || !out) return 0;

    var image = options.image;
    if (!image) {
      var bg = childByClass(rootEl, "lh-bg");
      image = bg && bg.getAttribute("src");
    }

    out.innerHTML = "";
    if (!hasClass(rootEl, "lh-paged")) rootEl.className += " lh-paged";

    var area, cur, hasContent, count = 0;
    var stack = []; // source elements of the containers currently open

    function splittable(el) {
      if (el.nodeType !== 1) return false;
      if (SPLIT_TAGS[el.tagName]) return true;
      for (var i = 0; i < splitClasses.length; i++)
        if (hasClass(el, splitClasses[i])) return true;
      return false;
    }
    function isHeading(el) {
      return !!el && /^H[1-6]$/.test(el.tagName);
    }
    function isEmptyShell(el, ignore) {
      for (var i = 0; i < el.children.length; i++) {
        var ch = el.children[i];
        if (ch !== ignore && ch.tagName !== "THEAD") return false;
      }
      return true;
    }
    function overflow() {
      return area.scrollHeight > area.clientHeight + 1;
    }
    function shell(src) {
      var el = src.cloneNode(false);
      if (src.tagName === "TABLE") {
        var th = childByTag(src, "THEAD");
        if (th) el.appendChild(th.cloneNode(true)); // repeat table header
      }
      return el;
    }
    function newPage() {
      var sheet = document.createElement("div");
      sheet.className = "lh-sheet";
      if (image) sheet.style.backgroundImage = 'url("' + image + '")';
      area = document.createElement("div");
      area.className = "lh-sheet-area";
      sheet.appendChild(area);
      out.appendChild(sheet);
      count++;
      var p = area;
      for (var i = 0; i < stack.length; i++) {
        var el = shell(stack[i]);
        p.appendChild(el);
        p = el;
      }
      cur = p;
      hasContent = false;
    }

    // Move to a new page, taking along empty containers and a trailing heading.
    function breakPage() {
      var depth = stack.length, node = cur, empty = null;
      while (node !== area && isEmptyShell(node, empty)) {
        empty = node;
        node = node.parentNode;
        depth--;
      }
      var holder = empty ? node : cur;
      if (empty) holder.removeChild(empty);
      var prev = holder.lastElementChild;
      var carry = isHeading(prev) ? prev : null;
      if (carry) holder.removeChild(carry);
      newPage();
      if (carry) {
        var lvl = area;
        for (var i = 0; i < depth; i++) lvl = lvl.lastElementChild;
        lvl.insertBefore(carry, lvl.firstChild);
      }
    }

    function add(src) {
      if (src.nodeType === 3 && !/\S/.test(src.nodeValue)) return;
      if (src.nodeType !== 1 && src.nodeType !== 3) return;
      if (src.nodeType === 1 && src.tagName === "THEAD") return; // added by shell()

      if (src.nodeType === 1 && hasContent && hasClass(src, "lh-break-before"))
        breakPage();

      var c = src.cloneNode(true);
      cur.appendChild(c);
      if (!overflow()) {
        hasContent = true;
        return;
      }
      cur.removeChild(c);

      if (splittable(src)) {
        var s = shell(src);
        cur.appendChild(s);
        stack.push(src);
        cur = s;
        for (var i = 0; i < src.childNodes.length; i++) add(src.childNodes[i]);
        stack.pop();
        cur = cur.parentNode;
        return;
      }

      if (hasContent) breakPage();
      cur.appendChild(c); // (if taller than a whole page it is clipped)
      hasContent = true;
    }

    newPage();
    for (var i = 0; i < source.childNodes.length; i++) add(source.childNodes[i]);
    return count;
  }

  function auto(options) {
    function run() {
      var roots = document.querySelectorAll(".lh-root");
      for (var i = 0; i < roots.length; i++) paginate(roots[i], options);
    }
    function whenFonts() {
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
      else run();
    }
    if (document.readyState === "complete") whenFonts();
    else root.addEventListener("load", whenFonts);
  }

  /* ------------------------------------------------------------------
   * Settings panel (screen only): background image + top/bottom/side
   * margins in mm, remembered in localStorage.
   *
   *   var ctl = Letterhead.settings(rootEl, {
   *     storageKey: "letterhead-settings", // one key per letterhead/document type
   *     labels: { title: "Page settings", ... },  // override any label (e.g. Arabic)
   *     open: false                         // start with the panel expanded
   *   });
   *   ctl.get()                 -> { image, top, bottom, side, guides }
   *   ctl.set({ top: 70 })      apply + save + re-paginate
   *   ctl.reset()               back to the values written in the page
   *
   * Defaults are read from the page: the .lh-bg src and the --lh-* values.
   * ------------------------------------------------------------------ */
  var LABELS = {
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

  function extend(a, b) {
    var o = {}, k;
    for (k in a) if (a.hasOwnProperty(k)) o[k] = a[k];
    if (b) for (k in b) if (b.hasOwnProperty(k) && b[k] !== undefined) o[k] = b[k];
    return o;
  }
  function readMm(el, name, fallback) {
    var v = parseFloat(root.getComputedStyle(el).getPropertyValue(name));
    return isNaN(v) ? fallback : v;
  }

  function settings(rootEl, options) {
    options = options || {};
    var key = options.storageKey || "letterhead-settings";
    var L = extend(LABELS, options.labels);
    var bg = childByClass(rootEl, "lh-bg");

    var defaults = {
      image: bg ? bg.getAttribute("src") : "",
      top: readMm(rootEl, "--lh-top", 58),
      bottom: readMm(rootEl, "--lh-bottom", 40),
      side: readMm(rootEl, "--lh-side", 15),
      guides: false,
    };
    var saved = null;
    try {
      saved = JSON.parse(root.localStorage.getItem(key) || "null");
    } catch (e) {}
    var s = extend(defaults, saved);

    var timer = null;
    function apply(repaginate) {
      rootEl.style.setProperty("--lh-top", s.top + "mm");
      rootEl.style.setProperty("--lh-bottom", s.bottom + "mm");
      rootEl.style.setProperty("--lh-side", s.side + "mm");
      if (bg && s.image) bg.setAttribute("src", s.image);
      if (s.guides) {
        if (!hasClass(rootEl, "lh-guides")) rootEl.className += " lh-guides";
      } else {
        rootEl.className = (" " + rootEl.className + " ").replace(" lh-guides ", " ").replace(/^\s+|\s+$/g, "");
      }
      if (repaginate && hasClass(rootEl, "lh-paged")) {
        clearTimeout(timer);
        timer = setTimeout(function () {
          paginate(rootEl);
        }, 120);
      }
    }
    function save() {
      var changed = {}, any = false;
      for (var k in s)
        if (s.hasOwnProperty(k) && s[k] !== defaults[k]) {
          changed[k] = s[k];
          any = true;
        }
      try {
        if (any) root.localStorage.setItem(key, JSON.stringify(changed));
        else root.localStorage.removeItem(key);
        status.textContent = "";
      } catch (e) {
        status.textContent = L.notSaved;
      }
    }

    // ---- panel ----
    var panel = document.createElement("div");
    panel.className = "lh-settings";
    panel.innerHTML =
      '<button type="button" class="lh-settings-toggle"></button>' +
      '<div class="lh-settings-body">' +
      '<div class="lh-settings-title"></div>' +
      '<label class="lh-f-image"><span></span><input type="file" accept="image/*"></label>' +
      '<label class="lh-f-top"><span></span><input type="number" min="0" max="200" step="1"></label>' +
      '<label class="lh-f-bottom"><span></span><input type="number" min="0" max="200" step="1"></label>' +
      '<label class="lh-f-side"><span></span><input type="number" min="0" max="80" step="1"></label>' +
      '<label class="lh-f-guides lh-check"><input type="checkbox"><span></span></label>' +
      '<p class="lh-settings-hint"></p>' +
      '<p class="lh-settings-status"></p>' +
      '<div class="lh-settings-actions"><button type="button" class="lh-reset"></button>' +
      '<button type="button" class="lh-close"></button></div>' +
      "</div>";

    function q(sel) {
      return panel.querySelector(sel);
    }
    var toggle = q(".lh-settings-toggle");
    var status = q(".lh-settings-status");
    toggle.textContent = "⚙ " + L.title;
    toggle.setAttribute("aria-expanded", "false");
    q(".lh-settings-title").textContent = L.title;
    q(".lh-f-image span").textContent = L.image;
    q(".lh-f-top span").textContent = L.top;
    q(".lh-f-bottom span").textContent = L.bottom;
    q(".lh-f-side span").textContent = L.side;
    q(".lh-f-guides span").textContent = L.guides;
    q(".lh-settings-hint").textContent = L.hint;
    q(".lh-reset").textContent = L.reset;
    q(".lh-close").textContent = L.close;

    var inputs = {
      top: q(".lh-f-top input"),
      bottom: q(".lh-f-bottom input"),
      side: q(".lh-f-side input"),
      guides: q(".lh-f-guides input"),
      image: q(".lh-f-image input"),
    };
    function fill() {
      inputs.top.value = s.top;
      inputs.bottom.value = s.bottom;
      inputs.side.value = s.side;
      inputs.guides.checked = !!s.guides;
    }
    function setOpen(open) {
      if (open) panel.className += " lh-open";
      else panel.className = panel.className.replace(/\s*lh-open/g, "");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    }

    function onNumber(name) {
      return function () {
        var v = parseFloat(inputs[name].value);
        if (isNaN(v) || v < 0) return;
        s[name] = v;
        apply(true);
        save();
      };
    }
    inputs.top.oninput = onNumber("top");
    inputs.bottom.oninput = onNumber("bottom");
    inputs.side.oninput = onNumber("side");
    inputs.guides.onchange = function () {
      s.guides = inputs.guides.checked;
      apply(false);
      save();
    };
    inputs.image.onchange = function () {
      var file = inputs.image.files && inputs.image.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        s.image = reader.result; // data: URL, so it prints and can be remembered
        apply(true);
        save();
      };
      reader.readAsDataURL(file);
    };
    toggle.onclick = function () {
      setOpen(!hasClass(panel, "lh-open"));
    };
    q(".lh-close").onclick = function () {
      setOpen(false);
    };
    q(".lh-reset").onclick = function () {
      s = extend(defaults, null);
      inputs.image.value = "";
      fill();
      apply(true);
      save();
    };

    fill();
    apply(false); // pagination runs later (auto) or on the next change
    setOpen(!!options.open);
    document.body.appendChild(panel);

    return {
      panel: panel,
      get: function () {
        return extend(s, null);
      },
      set: function (values) {
        s = extend(s, values);
        fill();
        apply(true);
        save();
      },
      reset: function () {
        q(".lh-reset").onclick();
      },
    };
  }

  root.Letterhead = { paginate: paginate, auto: auto, settings: settings };
})(typeof window !== "undefined" ? window : undefined);
