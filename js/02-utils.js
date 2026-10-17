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

    currency: function (value, cents) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: cents ? 2 : 0,
        maximumFractionDigits: cents ? 2 : 0
      }).format(Number(value || 0));
    },

    number: function (value) {
      return new Intl.NumberFormat("en-US").format(Number(value || 0));
    },

    parseISO: function (value) {
      if (!value) {
        return null;
      }
      var parsed = new Date(value + "T00:00:00");
      return isNaN(parsed.getTime()) ? null : parsed;
    },

    toISO: function (date) {
      var off = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - off).toISOString().slice(0, 10);
    },

    date: function (value) {
      var parsed = APP.Utils.parseISO(value);
      if (!parsed) {
        return "—";
      }
      return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(parsed);
    },

    monthYear: function (value) {
      var parsed = APP.Utils.parseISO(value);
      if (!parsed) {
        return "—";
      }
      return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(parsed);
    },

    time12: function (hhmm) {
      var parts = String(hhmm || "09:00").split(":");
      var h = Number(parts[0]);
      var m = parts[1] || "00";
      return ((h % 12) || 12) + ":" + m + " " + (h < 12 ? "AM" : "PM");
    },

    todayISO: function () {
      return APP.Utils.toISO(new Date());
    },

    daysUntil: function (isoDate) {
      var target = APP.Utils.parseISO(isoDate);
      if (!target) {
        return null;
      }
      var today = APP.Utils.parseISO(APP.Utils.todayISO());
      return Math.round((target.getTime() - today.getTime()) / 86400000);
    },

    relativeDue: function (isoDate) {
      var days = APP.Utils.daysUntil(isoDate);
      if (days === null) {
        return "No date";
      }
      if (days === 0) {
        return "Due today";
      }
      if (days === 1) {
        return "Due tomorrow";
      }
      if (days < 0) {
        return Math.abs(days) + " day" + (days === -1 ? "" : "s") + " overdue";
      }
      if (days < 45) {
        return "In " + days + " days";
      }
      return APP.Utils.date(isoDate);
    },

    addInterval: function (isoDate, count, unit) {
      var d = APP.Utils.parseISO(isoDate) || APP.Utils.parseISO(APP.Utils.todayISO());
      var n = Math.max(1, Number(count) || 1);

      if (unit === "day") {
        d.setDate(d.getDate() + n);
      } else if (unit === "week") {
        d.setDate(d.getDate() + n * 7);
      } else if (unit === "month") {
        var day = d.getDate();
        d.setDate(1);
        d.setMonth(d.getMonth() + n);
        var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(day, last));
      } else {
        var dd = d.getDate();
        var mm = d.getMonth();
        d.setDate(1);
        d.setFullYear(d.getFullYear() + n);
        d.setMonth(mm);
        d.setDate(Math.min(dd, new Date(d.getFullYear(), mm + 1, 0).getDate()));
      }

      return APP.Utils.toISO(d);
    },

    intervalLabel: function (count, unit) {
      var n = Number(count) || 1;
      var names = { day: "Day", week: "Week", month: "Month", year: "Year" };
      if (n === 1) {
        return "Every " + (names[unit] || "Year");
      }
      return "Every " + n + " " + (names[unit] || "Year") + "s";
    },

    percent: function (part, total) {
      if (!total || total <= 0) {
        return 0;
      }
      return Math.round((Number(part || 0) / Number(total)) * 100);
    },

    safeNumber: function (value) {
      var number = Number(String(value === null || value === undefined ? "" : value).replace(/[$,\s]/g, ""));
      return isNaN(number) ? 0 : number;
    },

    bytes: function (value) {
      var n = Number(value || 0);
      if (n < 1024) {
        return n + " B";
      }
      if (n < 1048576) {
        return (n / 1024).toFixed(1) + " KB";
      }
      if (n < 1073741824) {
        return (n / 1048576).toFixed(1) + " MB";
      }
      return (n / 1073741824).toFixed(2) + " GB";
    },

    slugify: function (value) {
      return String(value || "homeops")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    },

    sortBy: function (rows, key) {
      return rows.slice().sort(function (a, b) {
        var av = a[key] || "";
        var bv = b[key] || "";
        if (av === bv) {
          return 0;
        }
        if (!av) {
          return 1;
        }
        if (!bv) {
          return -1;
        }
        return av < bv ? -1 : 1;
      });
    },

    byName: function (a, b) {
      return String(a.name || "").localeCompare(String(b.name || ""));
    }
  };
}());
