/*
 * QuieTools analytics helpers (typing.quietools.com)
 * - qtEvent(name, params): thin gtag('event') wrapper, safe if gtag missing
 * - tool_nav: delegated click listener on internal tool cards / tagged nav links
 * Test pages call qtEvent directly for test_start / test_complete / copy_result.
 * Loaded via <script src="/assets/analytics.js" defer></script> after gtag.
 */
(function () {
  "use strict";

  function qtEvent(name, params) {
    if (typeof window.gtag === "function") {
      try { window.gtag("event", name, params || {}); } catch (e) { /* no-op */ }
    }
  }
  window.qtEvent = qtEvent;

  // tool_nav: fire when a user clicks a tool card or a tagged nav link.
  function onDocClick(e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    if (a.classList.contains("card") || a.hasAttribute("data-nav")) {
      qtEvent("tool_nav", { to: a.getAttribute("href") || "" });
    }
  }

  function init() {
    document.addEventListener("click", onDocClick, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
