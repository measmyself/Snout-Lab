/* palette.js -- Ctrl+K command palette over the collection index. Vanilla.
 *
 * WHY THIS IS NOT ninja-keys, cmdk OR kbar.
 * Those were the named candidates and all three were measured out, 2026-10-03:
 *   - cmdk, kbar: React. The collection is 127 standalone HTML files with no
 *     package.json and no node_modules. Adopting them means adding a build step
 *     to a tree whose whole virtue is that any file opens and runs.
 *   - ninja-keys: a Web Component, so it looked like the fit, but its published
 *     dist/ninja-keys.js imports lit, lit-html and hotkeys-js, and jsdelivr's
 *     +esm build still fans out to 11 further network fetches. Vendoring it
 *     offline requires a bundler. These pages are served from a laptop that
 *     sleeps; a palette that needs a CDN is a palette that dies with the wifi.
 * So: no dependencies, no build, no network. Drop two <script> tags in.
 *
 * It degrades to nothing. If palette-index.js is missing or empty the key does
 * nothing at all rather than opening an empty box -- an empty palette and a
 * broken palette look identical, and that is worth avoiding.
 */
(function () {
  "use strict";
  var IDX = (window.PALETTE_INDEX || []).filter(function (e) { return e && e.t && e.u; });
  if (!IDX.length) return;            // nothing to navigate: stay silent.
  if (window.__paletteLoaded) return; // two script tags on one page is a no-op.
  window.__paletteLoaded = true;

  /* Subsequence match, the behaviour people expect from Spotlight: "snl" finds
   * "Snout Lab". Score rewards early and consecutive hits so exact prefixes win. */
  function score(needle, hay) {
    if (!needle) return 1;
    var n = needle.toLowerCase(), h = hay.toLowerCase();
    var i = 0, s = 0, last = -2, hit = [];
    for (var j = 0; j < h.length && i < n.length; j++) {
      if (h[j] === n[i]) {
        s += (j === last + 1) ? 12 : 4;     // consecutive beats scattered
        if (j === 0 || /[^a-z0-9]/.test(h[j - 1])) s += 8; // word start
        last = j; hit.push(j); i++;
      }
    }
    if (i < n.length) return 0;             // not all characters present
    return s + Math.max(0, 30 - hit[0]);    // earlier first-hit beats later
  }

  var el = {}, items = [], cur = 0;

  function build() {
    var css = document.createElement("style");
    css.textContent = [
      ".pal-wrap{position:fixed;inset:0;z-index:2147483000;display:none;",
      "background:rgba(10,10,14,.62);backdrop-filter:blur(3px);}",
      ".pal-wrap[data-open]{display:block}",
      ".pal-box{position:absolute;top:12vh;left:50%;transform:translateX(-50%);",
      "width:min(680px,92vw);background:#1e1f29;color:#f8f8f2;border:1px solid #44475a;",
      "border-radius:12px;box-shadow:0 24px 64px rgba(0,0,0,.55);overflow:hidden;",
      "font:14px/1.45 ui-sans-serif,system-ui,sans-serif;}",
      ".pal-box input{width:100%;box-sizing:border-box;padding:16px 18px;border:0;",
      "border-bottom:1px solid #44475a;background:transparent;color:#f8f8f2;",
      "font:16px/1.3 inherit;outline:none}",
      ".pal-list{max-height:52vh;overflow:auto;margin:0;padding:6px;list-style:none}",
      ".pal-list li{display:flex;gap:10px;align-items:baseline;padding:9px 12px;",
      "border-radius:8px;cursor:pointer;white-space:nowrap}",
      ".pal-list li[aria-selected=true]{background:#44475a}",
      ".pal-t{flex:1;overflow:hidden;text-overflow:ellipsis}",
      ".pal-s{color:#bd93f9;font-size:11px;letter-spacing:.06em;text-transform:uppercase}",
      ".pal-none{padding:18px;color:#6272a4}",
      ".pal-foot{display:flex;gap:14px;padding:8px 14px;border-top:1px solid #44475a;",
      "color:#6272a4;font-size:11px}"
    ].join("");
    document.head.appendChild(css);

    var w = document.createElement("div");
    w.className = "pal-wrap";
    w.innerHTML =
      '<div class="pal-box" role="dialog" aria-modal="true" aria-label="Go to page">' +
      '<input type="text" placeholder="Go to page…" aria-label="Filter pages"' +
      ' autocomplete="off" spellcheck="false">' +
      '<ul class="pal-list" role="listbox"></ul>' +
      '<div class="pal-foot"><span>↑↓ move</span><span>↵ open</span>' +
      '<span>esc close</span><span>' + IDX.length + ' pages</span></div></div>';
    document.body.appendChild(w);
    el.wrap = w;
    el.input = w.querySelector("input");
    el.list = w.querySelector(".pal-list");

    el.input.addEventListener("input", function () { render(el.input.value); });
    w.addEventListener("mousedown", function (ev) { if (ev.target === w) close(); });
    el.list.addEventListener("click", function (ev) {
      var li = ev.target.closest("li[data-i]");
      if (li) go(items[+li.dataset.i]);
    });
  }

  function render(q) {
    items = IDX.map(function (e) {
      return { e: e, s: Math.max(score(q, e.t), score(q, (e.s || "") + " " + e.u) - 6) };
    }).filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.e.t.localeCompare(b.e.t); })
      .slice(0, 50).map(function (r) { return r.e; });
    cur = 0;
    if (!items.length) {
      el.list.innerHTML = '<li class="pal-none">No page matches that.</li>';
      return;
    }
    el.list.innerHTML = items.map(function (e, i) {
      return '<li data-i="' + i + '" role="option" aria-selected="' + (i === 0) + '">' +
        '<span class="pal-t"></span>' +
        (e.s ? '<span class="pal-s"></span>' : '') + '</li>';
    }).join("");
    // Titles are set as text, never as HTML: a page title is data and some of
    // these are machine-generated.
    Array.prototype.forEach.call(el.list.children, function (li, i) {
      li.querySelector(".pal-t").textContent = items[i].t;
      var s = li.querySelector(".pal-s");
      if (s) s.textContent = items[i].s;
    });
  }

  function move(d) {
    if (!items.length) return;
    var ch = el.list.children;
    if (ch[cur]) ch[cur].setAttribute("aria-selected", "false");
    cur = (cur + d + items.length) % items.length;
    ch[cur].setAttribute("aria-selected", "true");
    ch[cur].scrollIntoView({ block: "nearest" });
  }

  function go(e) { if (e) window.location.href = e.u; }
  function open_() {
    if (!el.wrap) build();
    el.wrap.setAttribute("data-open", "");
    el.input.value = ""; render(""); el.input.focus();
  }
  function close() { if (el.wrap) el.wrap.removeAttribute("data-open"); }
  function isOpen() { return el.wrap && el.wrap.hasAttribute("data-open"); }

  document.addEventListener("keydown", function (ev) {
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === "k" || ev.key === "K")) {
      ev.preventDefault(); isOpen() ? close() : open_(); return;
    }
    if (!isOpen()) return;
    if (ev.key === "Escape") { ev.preventDefault(); close(); }
    else if (ev.key === "ArrowDown") { ev.preventDefault(); move(1); }
    else if (ev.key === "ArrowUp") { ev.preventDefault(); move(-1); }
    else if (ev.key === "Enter") { ev.preventDefault(); go(items[cur]); }
  });

  window.Palette = { open: open_, close: close, size: IDX.length };
})();
