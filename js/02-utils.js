(function () {
  "use strict";

  APP.Utils = {
    escapeHTML: function (value) {
      return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    currency: function (value) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(Number(value || 0));
    },

    number: function (value) {
      return new Intl.NumberFormat("en-US").format(Number(value || 0));
    },

    date: function (value) {
      if (!value) {
        return "—";
      }

      var parsed = new Date(value + "T00:00:00");
      if (isNaN(parsed.getTime())) {
        return "—";
      }

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      }).format(parsed);
    },

    todayISO: function () {
      var now = new Date();
      var offset = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - offset).toISOString().slice(0, 10);
    },

    daysUntil: function (isoDate) {
      if (!isoDate) {
        return null;
      }

      var today = new Date(APP.Utils.todayISO() + "T00:00:00");
      var target = new Date(isoDate + "T00:00:00");

      if (isNaN(target.getTime())) {
        return null;
      }

      return Math.ceil((target.getTime() - today.getTime()) / 86400000);
    },

    percent: function (part, total) {
      if (!total || total <= 0) {
        return 0;
      }

      return Math.round((Number(part || 0) / Number(total)) * 100);
    },

    safeNumber: function (value) {
      var number = Number(String(value || "").replace(/[$,]/g, ""));
      return isNaN(number) ? 0 : number;
    },

    slugify: function (value) {
      return String(value || "homeops")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    },

    truncate: function (value, max) {
      var text = String(value || "");
      return text.length > max ? text.slice(0, max - 1) + "…" : text;
    },

    statusBadge: function (value) {
      var lower = String(value || "").toLowerCase();

      if (lower.indexOf("over") > -1 || lower.indexOf("high") > -1 || lower.indexOf("late") > -1) {
        return "badge-danger";
      }

      if (lower.indexOf("progress") > -1 || lower.indexOf("medium") > -1 || lower.indexOf("soon") > -1) {
        return "badge-warning";
      }

      if (lower.indexOf("good") > -1 || lower.indexOf("complete") > -1 || lower.indexOf("open") > -1) {
        return "badge-success";
      }

      return "badge-neutral";
    }
  };
}());