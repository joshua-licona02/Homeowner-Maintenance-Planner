(function () {
  "use strict";

  APP.Dom = {
    refs: {},

    init: function () {
      APP.Dom.refs = {
        viewRoot: document.getElementById("view-root"),
        pageTitle: document.getElementById("page-title"),
        alerts: document.getElementById("app-alerts"),
        auditLog: document.getElementById("audit-log"),
        saveStatus: document.getElementById("save-status"),
        backupImport: document.getElementById("backup-import")
      };
    },

    setHTML: function (key, html) {
      if (APP.Dom.refs[key]) {
        APP.Dom.refs[key].innerHTML = html;
      }
    },

    setText: function (key, text) {
      if (APP.Dom.refs[key]) {
        APP.Dom.refs[key].textContent = text;
      }
    },

    queryAll: function (selector) {
      return Array.prototype.slice.call(document.querySelectorAll(selector));
    },

    closest: function (event, selector) {
      return event.target && event.target.closest ? event.target.closest(selector) : null;
    },

    getFormData: function (form) {
      return new FormData(form);
    },

    getFiles: function (event) {
      return event.target && event.target.files ? event.target.files : [];
    },

    setActiveNav: function (view) {
      APP.Dom.queryAll(".nav-btn").forEach(function (button) {
        button.classList.toggle("is-active", button.getAttribute("data-view") === view);
      });
    },

    onDocumentClick: function (handler) {
      document.addEventListener("click", handler);
    },

    onDocumentSubmit: function (handler) {
      document.addEventListener("submit", handler);
    },

    onDocumentInput: function (handler) {
      document.addEventListener("input", handler);
    },

    onDocumentChange: function (handler) {
      document.addEventListener("change", handler);
    },

    download: function (filename, content, mimeType) {
      var blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    },

    print: function () {
      window.print();
    }
  };
}());