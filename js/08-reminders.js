(function () {
  "use strict";

  // Two reminder paths:
  //  1. Browser notifications, fired once per day at the chosen time while the app is open.
  //  2. A calendar (.ics) feed export so phone/desktop calendars remind you even when the app is closed.
  APP.Reminders = {
    timer: null,

    digest: function (model) {
      var s = model.settings;
      var out = [];

      if (s.notifyTasks) {
        model.overdueTasks.concat(model.soonTasks).forEach(function (t) {
          out.push({ kind: "task", id: t.id, title: t.name + " · " + t.subject, detail: APP.Utils.relativeDue(t.nextDue), urgent: t.dueStatus === "overdue" });
        });
      }

      if (s.notifyProjects) {
        APP.Model.projectAlerts(model).forEach(function (p) {
          var startDays = APP.Utils.daysUntil(p.startDate);
          var label = p.status === "Not Started" && startDays !== null && startDays <= s.taskLeadDays
            ? (startDays < 0 ? "Start date passed " + APP.Utils.date(p.startDate) : "Starts " + APP.Utils.date(p.startDate))
            : "Target end " + APP.Utils.date(p.endDate);
          out.push({ kind: "project", id: p.id, title: p.name, detail: label, urgent: false });
        });
      }

      if (s.notifyWarranties) {
        model.expiringWarranties.forEach(function (w) {
          out.push({ kind: "warranty", id: w.id, title: w.name + " warranty", detail: "Expires " + APP.Utils.date(w.warrantyEnd), urgent: w.warrantyDays <= 30 });
        });
      }

      return out;
    },

    supported: function () {
      return "Notification" in window;
    },

    permission: function () {
      return APP.Reminders.supported() ? Notification.permission : "unsupported";
    },

    requestPermission: function () {
      if (!APP.Reminders.supported()) {
        return Promise.resolve("unsupported");
      }
      return Promise.resolve(Notification.requestPermission());
    },

    start: function () {
      APP.Reminders.check();
      clearInterval(APP.Reminders.timer);
      APP.Reminders.timer = setInterval(APP.Reminders.check, 60000);
    },

    check: function (force) {
      var data = APP.State.data;
      var s = data.settings;
      var today = APP.Utils.todayISO();
      var now = new Date();
      var hhmm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

      if (!force && (s.lastNotified === today || hhmm < s.notifyTime)) {
        return false;
      }

      if (APP.Reminders.permission() !== "granted") {
        return false;
      }

      var items = APP.Reminders.digest(APP.Model.build(data));
      if (!items.length && !force) {
        s.lastNotified = today;
        APP.Core.save();
        return false;
      }

      var body = items.length
        ? items.slice(0, 4).map(function (i) { return "• " + i.title + " — " + i.detail; }).join("\n") +
          (items.length > 4 ? "\n+" + (items.length - 4) + " more" : "")
        : "Nothing due right now. You're all caught up!";

      var title = data.home.name + ": " + items.length + " reminder" + (items.length === 1 ? "" : "s");
      var options = { body: body, tag: "homeops-daily", icon: "icons/icon-192.png", badge: "icons/icon-192.png" };

      // Phones (Android Chrome, installed iPhone web apps) only allow notifications via the service worker.
      APP.Reminders.show(title, options);

      s.lastNotified = today;
      APP.Core.save();
      return true;
    },

    show: function (title, options) {
      var direct = function () {
        try {
          var n = new Notification(title, options);
          n.onclick = function () {
            window.focus();
            location.hash = "#/maintenance";
            n.close();
          };
        } catch (error) {
          return null;
        }
      };

      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(function (reg) {
          return reg.showNotification(title, options);
        }).catch(direct);
      } else {
        direct();
      }
    },

    icsEscape: function (text) {
      return String(text || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    },

    icsDate: function (iso, hhmm) {
      return iso.replace(/-/g, "") + "T" + String(hhmm || "09:00").replace(":", "") + "00";
    },

    buildICS: function (model) {
      var R = APP.Reminders;
      var s = model.settings;
      var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
      var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//HomeOps Planner//EN", "CALSCALE:GREGORIAN", "X-WR-CALNAME:" + R.icsEscape(model.home.name + " Maintenance")];
      var freq = { day: "DAILY", week: "WEEKLY", month: "MONTHLY", year: "YEARLY" };

      function event(uid, date, summary, description, rrule) {
        var endTime = s.notifyTime.split(":");
        var endH = String(Math.min(23, Number(endTime[0]) + 1)).padStart(2, "0") + ":" + endTime[1];
        lines.push("BEGIN:VEVENT", "UID:" + uid + "@homeops", "DTSTAMP:" + stamp,
          "DTSTART:" + R.icsDate(date, s.notifyTime), "DTEND:" + R.icsDate(date, endH),
          "SUMMARY:" + R.icsEscape(summary), "DESCRIPTION:" + R.icsEscape(description));
        if (rrule) {
          lines.push("RRULE:" + rrule);
        }
        lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + R.icsEscape(summary), "TRIGGER:PT0M", "END:VALARM", "END:VEVENT");
      }

      model.openTasks.forEach(function (t) {
        if (!t.nextDue) {
          return;
        }
        var rule = t.scheduleType === "recurring" ? "FREQ=" + freq[t.intervalUnit] + ";INTERVAL=" + (Number(t.intervalCount) || 1) : "";
        event(t.id, t.nextDue, t.name + " — " + t.subject, (t.notes || "") + "\n" + t.scheduleLabel, rule);
      });

      model.warranties.forEach(function (w) {
        if (w.warrantyDays !== null && w.warrantyDays >= 0) {
          event("warranty-" + w.id, w.warrantyEnd, w.name + " warranty expires", [w.brand, w.model, w.warrantyProvider].filter(Boolean).join(" · "));
        }
      });

      model.projects.forEach(function (p) {
        if (!p.isActive) {
          return;
        }
        if (p.startDate) {
          event("project-start-" + p.id, p.startDate, "Project start: " + p.name, p.notes || "");
        }
        if (p.endDate) {
          event("project-end-" + p.id, p.endDate, "Project target end: " + p.name, p.notes || "");
        }
      });

      lines.push("END:VCALENDAR");
      return lines.join("\r\n");
    }
  };
}());
