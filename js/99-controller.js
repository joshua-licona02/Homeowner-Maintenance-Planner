(function () {
  "use strict";

  var D = function () { return APP.State.data; };
  var U = APP.Utils;

  var ROUTES = {
    dashboard: function (m) { return APP.Views.dashboard(m); },
    locations: function (m, r) { return r.id ? APP.Views.location(m, r.id) : APP.Views.locations(m); },
    inventory: function (m, r) { return r.id ? APP.Views.item(m, r.id) : APP.Views.inventory(m); },
    maintenance: function (m) { return APP.Views.maintenance(m); },
    warranties: function (m) { return APP.Views.warranties(m); },
    paints: function (m) { return APP.Views.paints(m); },
    projects: function (m, r) { return r.id ? APP.Views.project(m, r.id) : APP.Views.projects(m); },
    settings: function (m, r) {
      var sub = { home: "settingsHome", notifications: "settingsNotifications", users: "settingsUsers", data: "settingsData", activity: "settingsActivity" }[r.id];
      return sub ? APP.Views[sub](m) : APP.Views.settings(m);
    }
  };

  // Which bottom-nav tab is highlighted for each route.
  var NAV_FOR = { maintenance: "dashboard", warranties: "dashboard", paints: "locations" };

  APP.Controller = {
    init: function () {
      APP.Dom.init();
      APP.Dom.queryAll("[data-icon]").forEach(function (el) {
        el.innerHTML = APP.Icons.svg(el.getAttribute("data-icon"));
      });
      APP.Core.load();
      APP.Controller.applyTheme();
      APP.Controller.bindEvents();
      APP.Controller.route();
      APP.Core.save();
      APP.Reminders.start();
      APP.Controller.registerServiceWorker();
    },

    // Enables "Add to Home Screen" and offline use. Browsers only allow this on https:// or localhost.
    registerServiceWorker: function () {
      if (!("serviceWorker" in navigator) || !/^https:|^http:\/\/(localhost|127\.0\.0\.1)/.test(location.href)) {
        return;
      }
      navigator.serviceWorker.register("sw.js").catch(function (error) {
        APP.Core.addAudit("warning", "Offline mode unavailable: " + error.message);
      });
    },

    bindEvents: function () {
      document.addEventListener("click", APP.Controller.handleClick);
      document.addEventListener("submit", APP.Controller.handleSubmit);
      document.addEventListener("input", APP.Controller.handleInput);
      document.addEventListener("change", APP.Controller.handleChange);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && APP.State.ui.sheet) {
          APP.Dom.closeSheet();
        }
      });
      window.addEventListener("hashchange", function () {
        APP.Controller.route();
        window.scrollTo(0, 0);
      });
      if (window.matchMedia) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", APP.Controller.applyTheme);
      }
    },

    route: function () {
      var parts = (location.hash || "#/dashboard").replace(/^#\/?/, "").split("/");
      var view = ROUTES[parts[0]] ? parts[0] : "dashboard";
      APP.State.route = { view: view, id: parts[1] || "" };

      if (view === "maintenance") {
        APP.State.ui.taskFilter = parts[1] === "history" ? "history"
          : APP.State.ui.taskFilter === "history" ? "upcoming" : APP.State.ui.taskFilter;
      }
      APP.Controller.render();
    },

    render: function () {
      var model = APP.Model.build(D());
      var r = APP.State.route;

      APP.Dom.setHTML("viewRoot", ROUTES[r.view](model, r));
      APP.Dom.setActiveNav(NAV_FOR[r.view] || r.view);
      document.body.classList.toggle("read-only", !APP.Core.canEdit());

      var badge = model.overdueTasks.length;
      APP.Dom.queryAll("[data-overdue-badge]").forEach(function (el) {
        el.textContent = badge || "";
        el.hidden = !badge;
      });

      APP.Dom.queryAll("img[data-thumb]").forEach(function (img) {
        APP.Files.thumbnail(img.getAttribute("data-thumb"), img);
      });
    },

    commit: function (auditMessage, toast) {
      if (auditMessage) {
        APP.Core.addAudit("info", auditMessage);
      }
      APP.Core.save();
      APP.Dom.closeSheet();
      APP.Controller.render();
      if (toast) {
        APP.Dom.toast(toast);
      }
    },

    applyTheme: function () {
      var theme = APP.State.data ? APP.State.data.settings.theme : "system";
      if (theme === "light" || theme === "dark") {
        document.documentElement.setAttribute("data-theme", theme);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    },

    guard: function () {
      if (APP.Core.canEdit()) {
        return true;
      }
      APP.Dom.toast("You're in view-only mode. Switch users in Settings › Users to make changes.", "warning");
      return false;
    },

    // ---------- clicks ----------

    handleClick: function (event) {
      var el = APP.Dom.closest(event, "[data-action]");

      if (!APP.Dom.closest(event, ".menu-wrap")) {
        APP.Dom.queryAll(".menu").forEach(function (m) { m.hidden = true; });
      }

      if (!el || el.tagName === "SELECT" || el.tagName === "INPUT") {
        return;
      }

      var action = el.getAttribute("data-action");
      var id = el.getAttribute("data-id") || "";
      var handler = APP.Controller.actions[action];

      if (handler) {
        event.preventDefault();
        handler(id, el);
      }
    },

    actions: {
      "close-sheet": function () { APP.Dom.closeSheet(); },

      "toggle-menu": function (id, el) {
        var menu = el.parentNode.querySelector(".menu");
        menu.hidden = !menu.hidden;
      },

      "task-filter": function (id) {
        APP.State.ui.taskFilter = id;
        if (location.hash !== "#/maintenance") {
          location.hash = "#/maintenance";
        } else {
          APP.Controller.render();
        }
      },

      "project-filter": function (id) {
        APP.State.ui.projectFilter = id;
        APP.Controller.render();
      },

      // add
      "add-location": function () { if (APP.Controller.guard()) { APP.Forms.open("location", null); } },
      "add-item": function (id, el) {
        if (!APP.Controller.guard()) { return; }
        var loc = el.getAttribute("data-location") || (APP.State.route.view === "locations" ? APP.State.route.id : "");
        APP.Forms.open("item", { category: "appliance", locationId: loc });
      },
      "add-paint": function (id, el) {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("paint", { locationId: el.getAttribute("data-location") || "", finish: "Flat/Matte", surface: "Walls" });
      },
      "add-task": function (id, el) {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("task", {
          itemId: el.getAttribute("data-item") || "", locationId: el.getAttribute("data-location") || "",
          scheduleType: "recurring", intervalCount: 1, intervalUnit: "year", nextDue: U.todayISO()
        });
      },
      "add-project": function (id, el) {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("project", { status: "Not Started", locationId: el.getAttribute("data-location") || "" });
      },
      "add-expense": function () {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("expense", { date: U.todayISO() }, { projectId: APP.State.route.id });
      },
      "add-supply": function () {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("supply", { qty: 1 }, { projectId: APP.State.route.id });
      },
      "add-user": function () { if (APP.Controller.guard()) { APP.Forms.open("user", { role: "Editor" }); } },

      // edit
      "edit-home": function () { if (APP.Controller.guard()) { APP.Forms.open("home", Object.assign({ id: "home" }, D().home)); } },
      "edit-location": function (id) { if (APP.Controller.guard()) { APP.Forms.open("location", APP.Core.find("locations", id), { deleteAction: "delete-location" }); } },
      "edit-item": function (id) { if (APP.Controller.guard()) { APP.Forms.open("item", APP.Core.find("items", id), { deleteAction: "delete-item" }); } },
      "edit-paint": function (id) { if (APP.Controller.guard()) { APP.Forms.open("paint", APP.Core.find("paints", id), { deleteAction: "delete-paint" }); } },
      "open-task": function (id) {
        if (!APP.Core.canEdit()) { return; }
        APP.Forms.open("task", APP.Core.find("tasks", id), { deleteAction: "delete-task" });
      },
      "edit-project": function (id) { if (APP.Controller.guard()) { APP.Forms.open("project", APP.Core.find("projects", id), { deleteAction: "delete-project" }); } },
      "edit-expense": function (id) {
        if (!APP.Controller.guard()) { return; }
        var p = APP.Core.find("projects", APP.State.route.id);
        APP.Forms.open("expense", p.expenses.filter(function (e) { return e.id === id; })[0], { projectId: p.id, deleteAction: "delete-expense", parentId: p.id });
      },
      "edit-supply": function (id) {
        if (!APP.Controller.guard()) { return; }
        var p = APP.Core.find("projects", APP.State.route.id);
        APP.Forms.open("supply", p.supplies.filter(function (s) { return s.id === id; })[0], { projectId: p.id, deleteAction: "delete-supply", parentId: p.id });
      },
      "edit-user": function (id) { if (APP.Controller.guard()) { APP.Forms.open("user", APP.Core.find("users", id), { deleteAction: "delete-user" }); } },

      // tasks & supplies
      "complete-task": function (id) {
        if (!APP.Controller.guard()) { return; }
        var me = APP.Core.currentUser();
        APP.Forms.open("complete", { date: U.todayISO(), by: me ? me.name : "" }, { taskId: id });
      },
      "toggle-supply": function (id) {
        if (!APP.Controller.guard()) { return; }
        var p = APP.Core.find("projects", APP.State.route.id);
        p.supplies.forEach(function (s) { if (s.id === id) { s.purchased = !s.purchased; } });
        APP.Controller.commit();
      },

      // delete
      "delete-location": function (id) {
        var loc = APP.Core.find("locations", id);
        if (!confirm("Delete “" + loc.name + "”? Items, paints, and tasks in it will be kept but unassigned.")) { return; }
        ["items", "paints", "tasks", "projects"].forEach(function (k) {
          D()[k].forEach(function (row) { if (row.locationId === id) { row.locationId = ""; } });
        });
        APP.Core.remove("locations", id);
        location.hash = "#/locations";
        APP.Controller.commit("Location deleted: " + loc.name, "Location deleted");
      },
      "delete-item": function (id) {
        var item = APP.Core.find("items", id);
        var tasks = D().tasks.filter(function (t) { return t.itemId === id; });
        if (!confirm("Delete “" + item.name + "”" + (tasks.length ? " and its " + tasks.length + " maintenance task(s)" : "") + "? This can't be undone.")) { return; }
        D().tasks = D().tasks.filter(function (t) { return t.itemId !== id; });
        APP.Core.remove("items", id);
        APP.Files.removeFor("item", id);
        location.hash = "#/inventory";
        APP.Controller.commit("Item deleted: " + item.name, "Item deleted");
      },
      "delete-paint": function (id) {
        if (!confirm("Delete this paint color?")) { return; }
        APP.Core.remove("paints", id);
        APP.Controller.commit("Paint color deleted.", "Paint deleted");
      },
      "delete-task": function (id) {
        var t = APP.Core.find("tasks", id);
        if (!confirm("Delete “" + t.name + "” and its history?")) { return; }
        APP.Core.remove("tasks", id);
        APP.Controller.commit("Task deleted: " + t.name, "Task deleted");
      },
      "delete-project": function (id) {
        var p = APP.Core.find("projects", id);
        if (!confirm("Delete “" + p.name + "” with its expenses, supplies, and attachments?")) { return; }
        APP.Core.remove("projects", id);
        APP.Files.removeFor("project", id);
        location.hash = "#/projects";
        APP.Controller.commit("Project deleted: " + p.name, "Project deleted");
      },
      "delete-expense": function (id, el) {
        var p = APP.Core.find("projects", el.getAttribute("data-parent"));
        p.expenses = p.expenses.filter(function (e) { return e.id !== id; });
        APP.Controller.commit("Expense removed from " + p.name, "Expense deleted");
      },
      "delete-supply": function (id, el) {
        var p = APP.Core.find("projects", el.getAttribute("data-parent"));
        p.supplies = p.supplies.filter(function (s) { return s.id !== id; });
        APP.Controller.commit("Supply removed from " + p.name, "Supply deleted");
      },
      "delete-user": function (id) {
        var u = APP.Core.find("users", id);
        var owners = D().users.filter(function (x) { return x.role === "Owner"; });
        if (u.role === "Owner" && owners.length === 1) {
          APP.Dom.toast("A home needs at least one Owner.", "warning");
          return;
        }
        if (!confirm("Remove " + u.name + " from this home?")) { return; }
        APP.Core.remove("users", id);
        D().tasks.forEach(function (t) { if (t.assigneeId === id) { t.assigneeId = ""; } });
        if (D().currentUserId === id) { D().currentUserId = D().users[0].id; }
        APP.Controller.commit("User removed: " + u.name, "User removed");
      },

      // files
      "open-file": function (id) {
        APP.Files.open(id).catch(function (err) { APP.Dom.toast(err.message, "danger"); });
      },
      "delete-file": function (id) {
        if (!APP.Controller.guard()) { return; }
        var meta = APP.Core.find("attachments", id);
        if (!confirm("Delete " + (meta ? meta.name : "this file") + "?")) { return; }
        APP.Files.remove(id).then(function () { APP.Controller.commit("Attachment deleted.", "File deleted"); });
      },

      // reports, reminders, data
      "open-report": function () {
        APP.Forms.open("report", { type: "full", includeTasks: true, includeWarranties: true, includeHistory: true, includePaints: true, includeExpenses: true });
      },
      "enable-notifications": function () {
        APP.Reminders.requestPermission().then(function (perm) {
          APP.Controller.render();
          if (perm === "granted") {
            APP.Reminders.check(true);
            APP.Dom.toast("Reminders on for " + U.time12(D().settings.notifyTime));
          } else {
            APP.Dom.toast(perm === "unsupported" ? "This browser doesn't support notifications." : "Notifications were blocked. You can allow them from the browser's site settings.", "warning");
          }
        });
      },
      "test-notification": function () {
        APP.Reminders.check(true);
        APP.Dom.toast("Test notification sent");
      },
      "export-calendar": function () {
        var model = APP.Model.build(D());
        APP.Dom.download(U.slugify(model.home.name) + "-maintenance.ics", APP.Reminders.buildICS(model), "text/calendar;charset=utf-8");
        APP.Dom.toast("Calendar file downloaded. Open it to add reminders to your calendar.");
      },
      "export-backup": function () {
        APP.Exports.backup(D());
        APP.Controller.commit("Full backup downloaded.", "Backup downloaded");
      },
      "export-share": function () {
        var copy = JSON.parse(JSON.stringify(D()));
        copy.attachments = [];
        copy.auditLog = [];
        copy.shareFile = true;
        APP.Dom.download(U.slugify(copy.home.name) + "-household-" + U.todayISO() + ".json", JSON.stringify(copy, null, 2), "application/json");
        APP.Dom.toast("Household file downloaded");
      },
      "export-table": function (id, el) {
        var result = APP.Exports.exportRows(id, APP.Exports.tableData(id, APP.Model.build(D())), el.getAttribute("data-format"));
        APP.Dom.toast(result.message, result.success ? "" : "warning");
      },
      "reset-demo": function () {
        if (!confirm("Replace everything with example data?")) { return; }
        APP.State.data = APP.Core.defaultData();
        location.hash = "#/dashboard";
        APP.Controller.commit("", "Example data loaded");
      },
      "clear-all": function () {
        if (!confirm("Erase ALL data in this browser? Download a backup first if you might need it.")) { return; }
        var ids = D().attachments.map(function (a) { return a.id; });
        ids.forEach(function (fid) { APP.Files.remove(fid); });
        APP.State.data = APP.Core.emptyData();
        APP.Core.addAudit("info", "All data erased.");
        location.hash = "#/settings";
        APP.Controller.commit("", "All data erased");
      },
      "clear-log": function () {
        D().auditLog = [];
        APP.Controller.commit();
      }
    },

    // ---------- inputs ----------

    handleInput: function (event) {
      var search = APP.Dom.closest(event, "[data-search]");
      if (search) {
        var pos = search.selectionStart;
        APP.State.ui.search = search.value;
        APP.Controller.render();
        var next = document.querySelector("[data-search]");
        if (next) {
          next.focus();
          next.setSelectionRange(pos, pos);
        }
      }
    },

    handleChange: function (event) {
      var t = event.target;
      var s = D().settings;

      if (t.form && t.form.hasAttribute("data-form")) {
        APP.Forms.applyVisibility(t.form);
        return;
      }

      if (t.hasAttribute("data-setting")) {
        if (!APP.Controller.guard()) { APP.Controller.render(); return; }
        var key = t.getAttribute("data-setting");
        s[key] = t.type === "checkbox" ? t.checked : t.type === "number" ? Math.max(0, Number(t.value) || 0) : t.value;
        if (key === "notifyTime") {
          s.lastNotified = "";
        }
        APP.Controller.commit("", "Saved");
        return;
      }

      var action = t.getAttribute("data-action");

      if (action === "set-theme") {
        s.theme = t.value;
        APP.Controller.applyTheme();
        APP.Controller.commit();
      } else if (action === "switch-user") {
        D().currentUserId = t.value;
        APP.Controller.commit("", "Now acting as " + APP.Core.currentUser().name);
      } else if (action === "project-status") {
        var p = APP.Core.find("projects", t.getAttribute("data-id"));
        p.status = t.value;
        APP.Controller.commit("Project " + p.name + " set to " + p.status, "Status updated");
      } else if (t.hasAttribute("data-attach-type")) {
        APP.Controller.attach(t.getAttribute("data-attach-type"), t.getAttribute("data-attach-id"), t.files);
      } else if (action === "import-xlsx") {
        APP.Controller.importXlsx(t.files[0]);
      } else if (action === "import-merge") {
        APP.Controller.readJSON(t.files[0], function (parsed) {
          var added = APP.Exports.merge(APP.Core.normalize(parsed));
          APP.Controller.commit("Household file merged (" + added + " new records).", added + " new record(s) merged");
        });
      } else if (t.id === "backup-import") {
        APP.Controller.readJSON(t.files[0], function (parsed) {
          if (!confirm("Replace all data in this browser with this backup?")) { return; }
          APP.State.data = parsed.rooms && !parsed.locations ? APP.Core.normalize(APP.Core.migrateV1(parsed)) : APP.Core.normalize(parsed);
          APP.Controller.applyTheme();
          APP.Controller.commit("Backup restored.", "Backup restored");
        });
      }
    },

    attach: function (type, id, files) {
      if (!files || !files.length || !APP.Controller.guard()) {
        return;
      }
      APP.Dom.toast("Saving " + files.length + " file(s)…");
      APP.Files.add(type, id, files).then(function (n) {
        APP.Controller.commit(n + " attachment(s) added.", n + " file(s) attached");
      }).catch(function (err) {
        APP.Dom.toast(err.message || "Files could not be saved.", "danger");
      });
    },

    readJSON: function (file, onData) {
      if (!file) {
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var parsed;
        try {
          parsed = JSON.parse(e.target.result);
        } catch (err) {
          APP.Dom.toast("That file isn't a valid HomeOps JSON file.", "danger");
          return;
        }
        if (!parsed || !parsed.home || !(Array.isArray(parsed.items) || Array.isArray(parsed.inventory))) {
          APP.Dom.toast("That file doesn't look like a HomeOps backup.", "danger");
          return;
        }
        onData(parsed);
      };
      reader.onerror = function () { APP.Dom.toast("File could not be read.", "danger"); };
      reader.readAsText(file);
    },

    // ---------- forms ----------

    handleSubmit: function (event) {
      var form = APP.Dom.closest(event, "form[data-form]");
      if (!form) {
        return;
      }
      event.preventDefault();

      var type = form.getAttribute("data-form");
      var sheet = APP.State.ui.sheet || { context: {} };

      if (type !== "report" && !APP.Controller.guard()) {
        return;
      }

      var missing = APP.Forms.validate(type, form);
      if (missing.length) {
        APP.Dom.toast("Please fill in: " + missing.join(", "), "warning");
        return;
      }

      var v = APP.Forms.read(type, form);
      var save = APP.Controller.savers[type];
      save(v, sheet.id, sheet.context);
    },

    upsert: function (collection, id, values, prefix) {
      var row = id ? APP.Core.find(collection, id) : null;
      if (row) {
        Object.assign(row, values);
        return { row: row, created: false };
      }
      row = Object.assign({ id: APP.Core.createId(prefix) }, values);
      D()[collection].push(row);
      return { row: row, created: true };
    },

    savers: {
      home: function (v) {
        Object.assign(D().home, v);
        APP.Controller.commit("Home details updated.", "Saved");
      },
      location: function (v, id) {
        var r = APP.Controller.upsert("locations", id, v, "loc");
        APP.Controller.commit((r.created ? "Location added: " : "Location updated: ") + v.name, r.created ? "Location added" : "Saved");
      },
      item: function (v, id) {
        var r = APP.Controller.upsert("items", id, v, "item");
        if (r.created) {
          location.hash = "#/inventory/" + r.row.id;
        }
        APP.Controller.commit((r.created ? "Item added: " : "Item updated: ") + v.name, r.created ? "Item added" : "Saved");
      },
      paint: function (v, id) {
        var r = APP.Controller.upsert("paints", id, v, "paint");
        APP.Controller.commit((r.created ? "Paint added: " : "Paint updated: ") + v.name, r.created ? "Paint added" : "Saved");
      },
      task: function (v, id) {
        if (v.itemId) {
          v.locationId = "";
        }
        v.intervalCount = Math.max(1, Number(v.intervalCount) || 1);
        if (!id) {
          v.history = [];
        }
        var r = APP.Controller.upsert("tasks", id, v, "task");
        if (r.row.scheduleType === "recurring") {
          r.row.completedDate = "";
        }
        APP.Controller.commit((r.created ? "Task added: " : "Task updated: ") + v.name, r.created ? "Task scheduled for " + U.date(v.nextDue) : "Saved");
      },
      complete: function (v, id, ctx) {
        var task = APP.Core.find("tasks", ctx.taskId);
        task.history.push({ date: v.date, cost: v.cost, note: v.note, by: v.by });
        task.history.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
        var msg;
        if (task.scheduleType === "recurring") {
          task.nextDue = U.addInterval(v.date, task.intervalCount, task.intervalUnit);
          msg = task.name + " done · next due " + U.date(task.nextDue);
        } else {
          task.completedDate = v.date;
          msg = task.name + " completed";
        }
        APP.Controller.commit("Completed: " + task.name, msg);
      },
      project: function (v, id) {
        if (!id) {
          v.expenses = [];
          v.supplies = [];
        }
        var r = APP.Controller.upsert("projects", id, v, "project");
        if (r.created) {
          location.hash = "#/projects/" + r.row.id;
        }
        APP.Controller.commit((r.created ? "Project added: " : "Project updated: ") + v.name, r.created ? "Project added" : "Saved");
      },
      expense: function (v, id, ctx) {
        APP.Controller.child(ctx.projectId, "expenses", id, v, "exp", "Expense");
      },
      supply: function (v, id, ctx) {
        APP.Controller.child(ctx.projectId, "supplies", id, v, "sup", "Supply");
      },
      user: function (v, id) {
        if (id) {
          var existing = APP.Core.find("users", id);
          var owners = D().users.filter(function (u) { return u.role === "Owner"; });
          if (existing.role === "Owner" && v.role !== "Owner" && owners.length === 1) {
            APP.Dom.toast("A home needs at least one Owner.", "warning");
            return;
          }
        }
        var r = APP.Controller.upsert("users", id, v, "user");
        APP.Controller.commit((r.created ? "User added: " : "User updated: ") + v.name, r.created ? v.name + " added" : "Saved");
      },
      report: function (v) {
        APP.Dom.closeSheet();
        APP.Reports.print(APP.Model.build(D()), v);
      }
    },

    child: function (projectId, key, id, values, prefix, label) {
      var p = APP.Core.find("projects", projectId);
      var row = id ? p[key].filter(function (x) { return x.id === id; })[0] : null;
      if (row) {
        Object.assign(row, values);
      } else {
        p[key].push(Object.assign({ id: APP.Core.createId(prefix) }, values));
      }
      APP.Controller.commit(label + (row ? " updated" : " added") + " on " + p.name, label + (row ? " saved" : " added"));
    },

    importXlsx: function (file) {
      if (!file || !APP.Controller.guard()) {
        return;
      }
      APP.Dom.toast("Importing spreadsheet…");

      APP.IngestXlsx.readFile(file).then(function (result) {
        var cleaned = APP.Clean.cleanInventoryImport(result);
        var locByName = {};
        D().locations.forEach(function (l) { locByName[l.name.toLowerCase()] = l.id; });

        cleaned.rows.forEach(function (row) {
          var locId = "";
          if (row.room) {
            locId = locByName[row.room.toLowerCase()];
            if (!locId) {
              locId = APP.Core.createId("loc");
              D().locations.push({ id: locId, name: row.room, notes: "" });
              locByName[row.room.toLowerCase()] = locId;
            }
          }
          D().items.push({
            id: APP.Core.createId("item"), name: row.name, category: APP.Icons.guessCategory(row.category + " " + row.name),
            locationId: locId, brand: row.brand, model: row.model, serial: row.serial,
            purchaseDate: row.receivedDate || row.installDate, purchasePrice: "", store: "",
            warrantyEnd: row.warrantyEnd, warrantyProvider: "", notes: row.notes
          });
        });

        cleaned.warnings.slice(0, 15).forEach(function (w) { APP.Core.addAudit("warning", w); });
        if (cleaned.skipped) {
          APP.Core.addAudit("warning", cleaned.skipped + " blank or invalid row(s) skipped during import.");
        }
        APP.Controller.commit("Spreadsheet import: " + cleaned.rows.length + " item(s) added.", cleaned.rows.length + " item(s) imported" + (cleaned.warnings.length ? " — see Activity Log for warnings" : ""));
      }).catch(function (error) {
        APP.Dom.toast(error.message, "danger");
      });
    }
  };

  APP.Controller.init();
}());
