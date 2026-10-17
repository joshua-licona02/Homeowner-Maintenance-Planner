(function () {
  "use strict";

  APP.Dom = {
    refs: {},
    toastTimer: null,

    init: function () {
      APP.Dom.refs = {
        viewRoot: document.getElementById("view-root"),
        sheetRoot: document.getElementById("sheet-root"),
        toast: document.getElementById("toast"),
        printRoot: document.getElementById("print-root"),
        backupImport: document.getElementById("backup-import")
      };
    },

    setHTML: function (key, html) {
      if (APP.Dom.refs[key]) {
        APP.Dom.refs[key].innerHTML = html;
      }
    },

    queryAll: function (selector, root) {
      return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    },

    closest: function (event, selector) {
      return event.target && event.target.closest ? event.target.closest(selector) : null;
    },

    setActiveNav: function (view) {
      APP.Dom.queryAll("[data-nav]").forEach(function (link) {
        link.classList.toggle("is-active", link.getAttribute("data-nav") === view);
      });
    },

    openSheet: function (html) {
      var root = APP.Dom.refs.sheetRoot;
      root.innerHTML = '<div class="sheet-backdrop" data-action="close-sheet"></div>' +
        '<div class="sheet" role="dialog" aria-modal="true">' + html + "</div>";
      root.classList.add("is-open");
      document.body.classList.add("sheet-open");

      var first = root.querySelector("input:not([type=hidden]):not([type=checkbox]), select, textarea");
      if (first && window.matchMedia("(min-width: 760px)").matches) {
        first.focus();
      }
    },

    closeSheet: function () {
      var root = APP.Dom.refs.sheetRoot;
      root.classList.remove("is-open");
      root.innerHTML = "";
      document.body.classList.remove("sheet-open");
      APP.State.ui.sheet = null;
    },

    toast: function (message, type) {
      var el = APP.Dom.refs.toast;
      if (!el || !message) {
        return;
      }
      el.textContent = message;
      el.className = "toast is-visible " + (type ? "toast-" + type : "");
      clearTimeout(APP.Dom.toastTimer);
      APP.Dom.toastTimer = setTimeout(function () {
        el.className = "toast";
      }, 2800);
    },

    download: function (filename, content, mimeType) {
      var blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }
  };
}());
