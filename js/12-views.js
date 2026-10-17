(function () {
  "use strict";

  var U = APP.Utils;
  var I = APP.Icons;
  var E = function (v) { return U.escapeHTML(v); };

  // ---------- building blocks ----------

  function page(opts) {
    var left = opts.back
      ? '<a class="circle-btn" href="' + opts.back + '" aria-label="Back">' + I.svg("back") + "</a>"
      : "<span></span>";
    var right = opts.actions ? '<div class="head-actions">' + opts.actions + "</div>" : "";
    return '<div class="page">' +
      '<div class="page-head">' + left + right + "</div>" +
      '<h1 class="large-title">' + E(opts.title) + "</h1>" +
      (opts.subtitle ? '<p class="page-sub">' + opts.subtitle + "</p>" : "") +
      opts.body + "</div>";
  }

  function group(title, rows, opts) {
    opts = opts || {};
    return '<section class="group-wrap' + (opts.cls ? " " + opts.cls : "") + '">' +
      (title ? '<h4 class="group-title">' + E(title) + (opts.titleAction || "") + "</h4>" : "") +
      '<div class="group">' + rows + "</div>" +
      (opts.footer ? '<p class="group-foot">' + opts.footer + "</p>" : "") + "</section>";
  }

  function kv(label, value, opts) {
    opts = opts || {};
    var tag = opts.href ? "a" : opts.action ? "button" : "div";
    var attrs = opts.href ? ' href="' + opts.href + '"' : opts.action ? ' type="button" data-action="' + opts.action + '"' + (opts.id ? ' data-id="' + E(opts.id) + '"' : "") : "";
    return "<" + tag + ' class="row' + (tag !== "div" ? " row-link" : "") + '"' + attrs + '><span class="row-label">' + E(label) + "</span>" +
      '<span class="row-value' + (opts.valueCls ? " " + opts.valueCls : "") + '">' + (opts.html ? value : E(value === "" || value === null || value === undefined ? "—" : value)) + "</span>" +
      (tag !== "div" ? I.svg("chevron", "chev") : "") + "</" + tag + ">";
  }

  function linkRow(label, href, icon, aside) {
    return '<a class="row row-link" href="' + href + '">' + (icon ? '<span class="row-icon">' + I.svg(icon) + "</span>" : "") +
      '<span class="row-label">' + E(label) + "</span>" + (aside ? '<span class="row-value">' + aside + "</span>" : "") + I.svg("chevron", "chev") + "</a>";
  }

  function actionRow(label, action, icon, extra) {
    return '<button type="button" class="row row-link row-action" data-action="' + action + '"' + (extra || "") + ">" +
      (icon ? '<span class="row-icon accent">' + I.svg(icon) + "</span>" : "") + '<span class="row-label accent">' + E(label) + "</span></button>";
  }

  function empty(text) {
    return '<div class="row row-empty">' + E(text) + "</div>";
  }

  function addBtn(action, label, extra) {
    if (!APP.Core.canEdit()) {
      return "";
    }
    return '<button type="button" class="circle-btn" data-action="' + action + '" aria-label="' + E(label) + '" title="' + E(label) + '"' + (extra || "") + ">" + I.svg("plus") + "</button>";
  }

  function textBtn(action, label, extra) {
    if (!APP.Core.canEdit()) {
      return "";
    }
    return '<button type="button" class="pill-btn pill-light" data-action="' + action + '"' + (extra || "") + ">" + E(label) + "</button>";
  }

  function dueClass(t) {
    return t.dueStatus === "overdue" ? "text-danger" : t.dueStatus === "soon" ? "text-warning" : "muted";
  }

  function taskRow(t, opts) {
    opts = opts || {};
    var can = APP.Core.canEdit();
    var check = t.isDone
      ? '<span class="check-circle is-done">' + I.svg("check") + "</span>"
      : '<button type="button" class="check-circle" data-action="complete-task" data-id="' + t.id + '" aria-label="Mark ' + E(t.name) + ' complete"' + (can ? "" : " disabled") + "></button>";
    var dueText = t.isDone ? "Completed " + U.date(t.completedDate) : U.date(t.nextDue) + (t.dueStatus === "overdue" || t.dueStatus === "soon" ? " · " + U.relativeDue(t.nextDue) : "");
    return '<div class="row task-row">' + check +
      '<button type="button" class="row-main" data-action="open-task" data-id="' + t.id + '">' +
        "<strong>" + E(t.name) + "</strong>" +
        '<span class="' + dueClass(t) + '">' + E(dueText) + "</span>" +
      "</button>" +
      (opts.hideSubject ? "" : '<span class="row-aside">' + E(t.subject) + "</span>") +
      (t.assigneeName && !opts.hideAssignee ? '<span class="avatar" title="' + E(t.assigneeName) + '">' + E(t.assigneeName.charAt(0)) + "</span>" : "") +
      "</div>";
  }

  function paintRow(p, showLocation) {
    var loc = APP.State.data.locations.filter(function (l) { return l.id === p.locationId; })[0];
    return '<button type="button" class="row paint-row" data-action="edit-paint" data-id="' + p.id + '">' +
      '<span class="swatch-bar" style="background:' + E(p.hex || "#e5e5ea") + '"></span>' +
      '<span class="row-main"><strong>' + E(p.name) + "</strong>" +
      "<span>" + E([p.brand, p.code].filter(Boolean).join(" · ")) + "</span>" +
      '<span class="muted">' + E(p.finish || "") + "</span></span>" +
      '<span class="row-aside strong">' + E(p.surface || "") + (showLocation && loc ? '<small class="muted">' + E(loc.name) + "</small>" : "") + "</span></button>";
  }

  function itemRow(i) {
    return '<a class="row row-link" href="#/inventory/' + i.id + '"><span class="row-icon accent">' + I.svg(i.category) + "</span>" +
      '<span class="row-label">' + E(i.name) + "</span>" + I.svg("chevron", "chev") + "</a>";
  }

  function projectRow(p) {
    var bar = p.budget ? '<span class="bar"><span class="' + (p.isOverBudget ? "bg-danger" : "") + '" style="width:' + Math.min(100, p.percentSpent) + '%"></span></span>' : "";
    var when = p.status === "Not Started" && p.startDate ? "Starting " + U.monthYear(p.startDate)
      : p.status === "Complete" ? "Completed" + (p.endDate ? " " + U.monthYear(p.endDate) : "")
      : p.endDate ? "Target " + U.monthYear(p.endDate) : p.status;
    return '<a class="row row-link project-row" href="#/projects/' + p.id + '">' +
      '<span class="row-main"><strong>' + E(p.name) + "</strong>" +
      '<span class="muted">' + E(when) + (p.locationName ? " · " + E(p.locationName) : "") + "</span>" +
      (p.budget ? '<span class="budget-line">' + bar + '<small class="' + (p.isOverBudget ? "text-danger" : "muted") + '">' + U.currency(p.spent) + " of " + U.currency(p.budget) + "</small></span>" : "") +
      "</span>" + '<span class="badge badge-' + U.slugify(p.status) + '">' + E(p.status) + "</span>" + I.svg("chevron", "chev") + "</a>";
  }

  function attachmentsGroup(parentType, parentId) {
    var list = APP.Model.attachmentsFor(APP.State.data, parentType, parentId);
    var rows = list.map(function (a) {
      var isImg = /^image\//.test(a.type);
      return '<div class="row attach-row">' +
        (isImg ? '<img class="thumb" alt="" data-thumb="' + a.id + '">' : '<span class="row-icon accent">' + I.svg(/pdf/.test(a.type) ? "report" : "file") + "</span>") +
        '<button type="button" class="row-main" data-action="open-file" data-id="' + a.id + '"><strong>' + E(a.name) + "</strong>" +
        '<span class="muted">' + U.bytes(a.size) + " · " + U.date(a.createdAt.slice(0, 10)) + "</span></button>" +
        (APP.Core.canEdit() ? '<button type="button" class="icon-btn" data-action="delete-file" data-id="' + a.id + '" aria-label="Delete ' + E(a.name) + '">' + I.svg("trash") + "</button>" : "") +
        "</div>";
    }).join("");

    var add = APP.Core.canEdit()
      ? '<label class="row row-link row-action"><span class="row-icon accent">' + I.svg("clip") + '</span><span class="row-label accent">Add Photos or Files</span>' +
        '<input type="file" multiple hidden data-attach-type="' + parentType + '" data-attach-id="' + parentId + '" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"></label>'
      : "";

    return group("Attachments", rows + add || empty("No attachments."), { footer: "Receipts, manuals, warranty cards, photos. Stored in this browser." });
  }

  function addMenu(items) {
    return '<div class="menu-wrap">' + addBtn("toggle-menu", "Add") +
      '<div class="menu" hidden>' + items.map(function (it) {
        return '<button type="button" data-action="' + it[0] + '"' + (it[2] || "") + ">" + I.svg(it[3] || "plus") + E(it[1]) + "</button>";
      }).join("") + "</div></div>";
  }

  // ---------- views ----------

  APP.Views = {
    dashboard: function (m) {
      var tasks = m.openTasks.slice(0, 5);
      var digest = APP.Reminders.digest(m);
      var activeProjects = m.projects.filter(function (p) { return p.isActive; });
      var perm = APP.Reminders.permission();

      var stats = '<div class="stats">' +
        '<a class="stat" href="#/maintenance"><b class="' + (m.overdueTasks.length ? "text-danger" : "") + '">' + m.overdueTasks.length + "</b><span>Overdue</span></a>" +
        '<a class="stat" href="#/maintenance"><b class="' + (m.soonTasks.length ? "text-warning" : "") + '">' + m.soonTasks.length + "</b><span>Due in " + m.settings.taskLeadDays + " days</span></a>" +
        '<a class="stat" href="#/projects"><b>' + activeProjects.length + "</b><span>Active projects</span></a>" +
        '<a class="stat" href="#/inventory"><b>' + m.items.length + "</b><span>Items tracked</span></a></div>";

      var notice = perm === "default" && digest.length
        ? '<div class="notice"><span>' + I.svg("bell") + " Turn on reminders so you get a heads-up at " + E(U.time12(m.settings.notifyTime)) + ".</span>" +
          '<button type="button" class="pill-btn" data-action="enable-notifications">Enable</button></div>'
        : "";

      var maint = (tasks.map(function (t) { return taskRow(t); }).join("") || empty("No maintenance tasks yet.")) +
        linkRow("View All Maintenance Tasks", "#/maintenance");

      var warr = m.expiringWarranties.length
        ? m.expiringWarranties.slice(0, 4).map(function (w) {
          return '<a class="row row-link" href="#/inventory/' + w.id + '"><span class="row-icon text-warning">' + I.svg("shield") + '</span><span class="row-main"><strong>' + E(w.name) +
            '</strong><span class="text-warning">Expires ' + U.date(w.warrantyEnd) + " · " + w.warrantyDays + " days</span></span>" + I.svg("chevron", "chev") + "</a>";
        }).join("")
        : '<div class="row covered"><span class="ok-dot">' + I.svg("check") + "</span><span class=\"muted\">You're covered! No warranties are expiring in the next " +
          Math.round(m.settings.warrantyLeadDays / 30) + " months.</span></div>";

      var proj = (activeProjects.slice(0, 3).map(projectRow).join("") || empty("No active projects.")) + linkRow("View All Projects", "#/projects");

      var body = notice + stats + '<div class="dash-grid"><div>' +
        group("Maintenance", maint) +
        group("Warranties", warr + linkRow("View All Warranties", "#/warranties")) +
        "</div><div>" +
        group("Projects", proj) +
        group("Quick Actions", actionRow("Create Report", "open-report", "report") + linkRow("Paint Colors", "#/paints", "palette") +
          linkRow("Notifications", "#/settings/notifications", "bell") + linkRow("Household", "#/settings/users", "users")) +
        "</div></div>";

      return page({
        title: "Dashboard",
        subtitle: E(m.home.name) + (m.home.address ? " · " + E(m.home.address) : ""),
        actions: addMenu([["add-task", "Maintenance Task", "", "wrench"], ["add-item", "Inventory Item", "", "inventory"], ["add-project", "Project", "", "projects"], ["add-paint", "Paint Color", "", "palette"]]),
        body: body
      });
    },

    locations: function (m) {
      var rows = m.locations.map(function (l) {
        var items = m.items.filter(function (i) { return i.locationId === l.id; }).length;
        var paints = m.paints.filter(function (p) { return p.locationId === l.id; }).length;
        var aside = [items ? items + " item" + (items === 1 ? "" : "s") : "", paints ? paints + " paint" + (paints === 1 ? "" : "s") : ""].filter(Boolean).join(" · ");
        return linkRow(l.name, "#/locations/" + l.id, "locations", E(aside));
      }).join("");
      return page({
        title: "Locations",
        actions: addBtn("add-location", "Add Location"),
        body: group("", rows || empty("Add rooms and areas like Kitchen, Basement, or Outside."), { footer: "Group inventory, paint colors, and tasks by room or area." })
      });
    },

    location: function (m, id) {
      var loc = m.locationMap[id];
      if (!loc) {
        return APP.Views.notFound("Location", "#/locations");
      }
      var items = m.items.filter(function (i) { return i.locationId === id; }).sort(U.byName);
      var paints = m.paints.filter(function (p) { return p.locationId === id; });
      var tasks = m.tasks.filter(function (t) { return t.locationId === id && !t.isDone; });
      var projects = m.projects.filter(function (p) { return p.locationId === id; });
      var can = APP.Core.canEdit();

      return page({
        title: loc.name,
        back: "#/locations",
        actions: addMenu([["add-item", "Inventory Item", ' data-location="' + id + '"', "inventory"], ["add-paint", "Paint Color", ' data-location="' + id + '"', "palette"], ["add-task", "Maintenance Task", ' data-location="' + id + '"', "wrench"], ["add-project", "Project", ' data-location="' + id + '"', "projects"]]) +
          (can ? '<button type="button" class="circle-btn" data-action="edit-location" data-id="' + id + '" aria-label="Edit location">' + I.svg("more") + "</button>" : ""),
        body: group("Inventory", items.map(itemRow).join("") || empty("No items in this location.")) +
          group("Paints", paints.map(function (p) { return paintRow(p); }).join("") || empty("No paint colors recorded.")) +
          group("Maintenance", tasks.map(function (t) { return taskRow(t); }).join("") || empty("No open tasks.")) +
          (projects.length ? group("Projects", projects.map(projectRow).join("")) : "") +
          (loc.notes ? group("Notes", '<div class="row notes">' + E(loc.notes) + "</div>") : "")
      });
    },

    inventory: function (m) {
      var q = APP.State.ui.search.toLowerCase();
      var items = m.items.filter(function (i) {
        return !q || [i.name, i.brand, i.model, i.serial, i.locationName].join(" ").toLowerCase().indexOf(q) > -1;
      });
      var groups = m.locations.concat([{ id: "__none", name: "Unassigned" }]).map(function (l) {
        var list = items.filter(function (i) { return l.id === "__none" ? !m.locationMap[i.locationId] : i.locationId === l.id; }).sort(U.byName);
        if (!list.length) {
          return "";
        }
        return '<section class="tile-section"><div class="tile-head">' +
          (l.id === "__none" ? "<h3>" + E(l.name) + "</h3>" : '<a href="#/locations/' + l.id + '"><h3>' + E(l.name) + "</h3>" + I.svg("chevron", "chev") + "</a>") +
          '</div><div class="tiles">' + list.map(function (i) {
            return '<a class="tile" href="#/inventory/' + i.id + '">' + I.svg(i.category, "tile-icon") + "<span>" + E(i.name) + "</span>" +
              (i.warrantyStatus === "expiring" ? '<i class="dot dot-warning" title="Warranty expiring"></i>' : "") + "</a>";
          }).join("") + "</div></section>";
      }).join("");

      return page({
        title: "Inventory",
        actions: addBtn("add-item", "Add Item"),
        body: '<label class="search"><span>' + I.svg("search") + '</span><input type="search" placeholder="Search" data-search value="' + E(APP.State.ui.search) + '" aria-label="Search inventory"></label>' +
          (groups || '<div class="empty-card">' + (q ? "No items match “" + E(q) + "”." : "Track appliances, systems, and equipment. Tap + to add your first item.") + "</div>")
      });
    },

    item: function (m, id) {
      var i = m.items.filter(function (x) { return x.id === id; })[0];
      if (!i) {
        return APP.Views.notFound("Item", "#/inventory");
      }
      var tasks = m.tasks.filter(function (t) { return t.itemId === id; });
      var wCls = i.warrantyStatus === "expired" ? "text-danger" : i.warrantyStatus === "expiring" ? "text-warning" : "";
      var wText = i.warrantyEnd ? U.date(i.warrantyEnd) + (i.warrantyStatus === "expired" ? " (expired)" : i.warrantyStatus === "expiring" ? " (" + i.warrantyDays + " days)" : "") : "";
      var history = [];
      tasks.forEach(function (t) { t.history.forEach(function (h) { history.push({ date: h.date, name: t.name, cost: h.cost, note: h.note }); }); });
      history = U.sortBy(history, "date").reverse();

      return page({
        title: i.name,
        back: "#/inventory",
        actions: textBtn("edit-item", "Edit", ' data-id="' + id + '"'),
        body: '<div class="hero-icon">' + I.svg(i.category) + "</div>" +
          group("", kv("Location", i.locationName, { href: m.locationMap[i.locationId] ? "#/locations/" + i.locationId : "" })) +
          group("Details", kv("Type", I.categoryLabel(i.category)) + kv("Brand", i.brand) + kv("Model", i.model) + kv("Serial Number", i.serial)) +
          group("Purchase Information", kv("Date", U.date(i.purchaseDate)) + kv("Price", i.purchasePrice !== "" && i.purchasePrice !== undefined ? U.currency(i.purchasePrice, true) : "") + kv("Store / Installer", i.store)) +
          group("Warranty", kv("Expires", wText, { valueCls: wCls }) + kv("Provider", i.warrantyProvider)) +
          group("Maintenance Tasks", tasks.map(function (t) { return taskRow(t, { hideSubject: true }); }).join("") +
            (APP.Core.canEdit() ? actionRow("Add Maintenance Task", "add-task", "plus", ' data-item="' + id + '"') : "") || empty("No tasks.")) +
          (history.length ? group("Service History", history.map(function (h) {
            return '<div class="row"><span class="row-main"><strong>' + E(h.name) + '</strong><span class="muted">' + E(h.note || "") + "</span></span>" +
              '<span class="row-aside">' + U.date(h.date) + (h.cost ? "<small>" + U.currency(h.cost, true) + "</small>" : "") + "</span></div>";
          }).join("")) : "") +
          attachmentsGroup("item", id) +
          (i.notes ? group("Notes", '<div class="row notes">' + E(i.notes) + "</div>") : "")
      });
    },

    maintenance: function (m) {
      var f = APP.State.ui.taskFilter;
      var seg = '<div class="segmented" role="tablist">' + [["upcoming", "Upcoming"], ["all", "All"], ["done", "Completed"], ["history", "History"]].map(function (s) {
        return '<button type="button" role="tab" aria-selected="' + (f === s[0]) + '" class="' + (f === s[0] ? "is-active" : "") + '" data-action="task-filter" data-id="' + s[0] + '">' + s[1] + "</button>";
      }).join("") + "</div>";

      var body;
      if (f === "history") {
        var rows = APP.Exports.tableData("history", m);
        body = group("Completion Log", rows.map(function (h) {
          return '<div class="row"><span class="row-main"><strong>' + E(h.Task) + '</strong><span class="muted">' + E(h.For) + (h.Notes ? " · " + E(h.Notes) : "") + (h["Completed By"] ? " · " + E(h["Completed By"]) : "") + "</span></span>" +
            '<span class="row-aside">' + U.date(h.Date) + (h.Cost ? "<small>" + U.currency(h.Cost, true) + "</small>" : "") + "</span></div>";
        }).join("") || empty("Completed tasks will be logged here."));
      } else if (f === "done") {
        body = group("Completed One-Time Tasks", m.tasks.filter(function (t) { return t.isDone; }).map(function (t) { return taskRow(t); }).join("") || empty("Nothing here yet."));
      } else {
        var open = m.openTasks;
        var buckets = [
          ["Overdue", open.filter(function (t) { return t.dueStatus === "overdue"; })],
          ["Due Soon", open.filter(function (t) { return t.dueStatus === "soon"; })],
          ["Later", open.filter(function (t) { return t.dueStatus === "upcoming" || t.dueStatus === "nodate"; })]
        ];
        if (f === "upcoming") {
          var limit = U.addInterval(U.todayISO(), 3, "month");
          buckets[2][0] = "Next 3 Months";
          buckets[2][1] = buckets[2][1].filter(function (t) { return t.nextDue && t.nextDue <= limit; });
        }
        body = buckets.map(function (b) {
          return b[1].length ? group(b[0], b[1].map(function (t) { return taskRow(t); }).join(""), { cls: b[0] === "Overdue" ? "group-danger" : "" }) : "";
        }).join("") || '<div class="empty-card">All caught up. Tap + to schedule recurring maintenance like filter changes, gutter cleaning, or HVAC tune-ups.</div>';
      }

      return page({
        title: "Maintenance",
        back: "#/dashboard",
        actions: '<button type="button" class="circle-btn" data-action="export-calendar" aria-label="Add to calendar" title="Download calendar (.ics)">' + I.svg("calendar") + "</button>" + addBtn("add-task", "Add Task"),
        body: seg + body
      });
    },

    warranties: function (m) {
      var groups = [["Expiring Soon", "expiring"], ["Active", "active"], ["Expired", "expired"]].map(function (g) {
        var list = m.warranties.filter(function (w) { return w.warrantyStatus === g[1]; });
        if (!list.length) {
          return "";
        }
        return group(g[0], list.map(function (w) {
          var cls = g[1] === "expired" ? "text-danger" : g[1] === "expiring" ? "text-warning" : "muted";
          return '<a class="row row-link" href="#/inventory/' + w.id + '"><span class="row-icon accent">' + I.svg(w.category) + '</span><span class="row-main"><strong>' + E(w.name) + "</strong>" +
            '<span class="' + cls + '">' + (g[1] === "expired" ? "Expired " : "Expires ") + U.date(w.warrantyEnd) + "</span></span>" +
            '<span class="row-aside">' + E(w.warrantyProvider || w.brand || "") + "</span>" + I.svg("chevron", "chev") + "</a>";
        }).join(""));
      }).join("");
      return page({
        title: "Warranties",
        back: "#/dashboard",
        body: groups || '<div class="empty-card">Add a warranty expiration date to any inventory item to track it here.</div>'
      });
    },

    paints: function (m) {
      var body = m.locations.concat([{ id: "", name: "Unassigned" }]).map(function (l) {
        var list = m.paints.filter(function (p) { return l.id ? p.locationId === l.id : !m.locationMap[p.locationId]; });
        return list.length ? group(l.name, list.map(function (p) { return paintRow(p); }).join("")) : "";
      }).join("");
      return page({
        title: "Paint Colors",
        back: "#/dashboard",
        actions: addBtn("add-paint", "Add Paint"),
        body: body || '<div class="empty-card">Record colors, brands, and finishes for each room so touch-ups are easy.</div>'
      });
    },

    projects: function (m) {
      var f = APP.State.ui.projectFilter;
      var seg = '<div class="segmented">' + [["active", "Active"], ["done", "Completed"], ["all", "All"]].map(function (s) {
        return '<button type="button" class="' + (f === s[0] ? "is-active" : "") + '" data-action="project-filter" data-id="' + s[0] + '">' + s[1] + "</button>";
      }).join("") + "</div>";
      var list = m.projects.filter(function (p) { return f === "all" || (f === "active" ? p.isActive : !p.isActive); });
      var active = m.projects.filter(function (p) { return p.isActive; });
      var budget = active.reduce(function (s, p) { return s + U.safeNumber(p.budget); }, 0);
      var spent = active.reduce(function (s, p) { return s + p.spent; }, 0);

      return page({
        title: "Projects",
        actions: addBtn("add-project", "Add Project"),
        body: '<div class="stats stats-3"><div class="stat"><b>' + active.length + "</b><span>Active</span></div>" +
          '<div class="stat"><b>' + U.currency(budget) + "</b><span>Active budget</span></div>" +
          '<div class="stat"><b class="' + (spent > budget && budget ? "text-danger" : "") + '">' + U.currency(spent) + "</b><span>Spent so far</span></div></div>" +
          seg + group("", list.map(projectRow).join("") || empty(f === "done" ? "No completed projects yet." : "No projects. Tap + to plan one."))
      });
    },

    project: function (m, id) {
      var p = m.projects.filter(function (x) { return x.id === id; })[0];
      if (!p) {
        return APP.Views.notFound("Project", "#/projects");
      }
      var can = APP.Core.canEdit();
      var expenses = U.sortBy(p.expenses, "date").reverse();

      var budgetRows = kv("Total", U.currency(p.budget, true)) +
        kv("Spent", U.currency(p.spent, true), { valueCls: p.isOverBudget ? "text-danger" : "" }) +
        kv("Remaining", U.currency(p.remaining, true), { valueCls: p.remaining < 0 ? "text-danger" : "text-success" }) +
        (p.suppliesToBuy ? kv("Supplies Still To Buy", U.currency(p.suppliesToBuy, true)) : "") +
        (p.budget ? '<div class="row"><span class="bar bar-lg"><span class="' + (p.isOverBudget ? "bg-danger" : "") + '" style="width:' + Math.min(100, p.percentSpent) + '%"></span></span><small class="muted">' + p.percentSpent + "%</small></div>" : "");

      var expenseRows = expenses.map(function (e) {
        return '<button type="button" class="row" data-action="edit-expense" data-id="' + e.id + '"><span class="row-main"><strong>' + E(e.description) + '</strong><span class="muted">' +
          U.date(e.date) + (e.vendor ? " · " + E(e.vendor) : "") + '</span></span><span class="row-aside strong">' + U.currency(e.amount, true) + "</span></button>";
      }).join("") + (can ? actionRow("Add Expense", "add-expense", "plus") : "");

      var supplyRows = p.supplies.map(function (s) {
        return '<div class="row supply-row"><button type="button" class="check-box' + (s.purchased ? " is-done" : "") + '" data-action="toggle-supply" data-id="' + s.id + '" aria-label="Toggle purchased"' + (can ? "" : " disabled") + ">" + (s.purchased ? I.svg("check") : "") + "</button>" +
          '<button type="button" class="row-main" data-action="edit-supply" data-id="' + s.id + '"><strong class="' + (s.purchased ? "struck" : "") + '">' + E(s.name) + '</strong><span class="muted">' +
          E([s.qty ? "Qty " + s.qty : "", s.store].filter(Boolean).join(" · ")) + '</span></button><span class="row-aside">' + U.currency(U.safeNumber(s.qty || 1) * U.safeNumber(s.cost), true) + "</span></div>";
      }).join("") + (can ? actionRow("Add Supply", "add-supply", "plus") : "");

      var statusSel = can
        ? '<label class="row"><span class="row-label">Status</span><span class="row-control"><select data-action="project-status" data-id="' + id + '">' +
          ["Not Started", "In Progress", "On Hold", "Complete"].map(function (s) { return "<option" + (s === p.status ? " selected" : "") + ">" + s + "</option>"; }).join("") + "</select></span></label>"
        : kv("Status", p.status);

      return page({
        title: p.name,
        back: "#/projects",
        actions: textBtn("edit-project", "Edit", ' data-id="' + id + '"'),
        body: group("Info", statusSel + (p.locationName ? kv("Location", p.locationName, { href: "#/locations/" + p.locationId }) : "")) +
          group("Timeline", kv("Start Date", U.date(p.startDate)) + kv("End Date", U.date(p.endDate))) +
          group("Budget", budgetRows) +
          (p.notes ? group("Notes", '<div class="row notes">' + E(p.notes) + "</div>") : "") +
          group("Expenses", expenseRows || empty("No expenses recorded.")) +
          group("Supplies", supplyRows || empty("No supplies listed.")) +
          attachmentsGroup("project", id)
      });
    },

    settings: function (m) {
      var user = APP.Core.currentUser();
      var used = APP.Files.usedBytes();
      return page({
        title: "Settings",
        body: group("Home", linkRow(m.home.name, "#/settings/home", "home", E(m.home.address || ""))) +
          group("Household", linkRow("Users & Sharing", "#/settings/users", "users", m.users.length + " member" + (m.users.length === 1 ? "" : "s")) +
            kv("Acting As", E(user.name) + ' <span class="badge">' + E(user.role) + "</span>", { html: true })) +
          group("Planning", linkRow("Notifications", "#/settings/notifications", "bell", E(U.time12(m.settings.notifyTime))) +
            actionRow("Create Report (PDF)", "open-report", "report") +
            linkRow("Warranties", "#/warranties", "shield") + linkRow("Paint Colors", "#/paints", "palette") +
            linkRow("Maintenance History", "#/maintenance/history", "history")) +
          group("Data", linkRow("Backup, Import & Export", "#/settings/data", "database") +
            kv("Attachment Storage", U.bytes(used) + " of 1 GB") +
            linkRow("Activity Log", "#/settings/activity", "list")) +
          group("Appearance", '<label class="row"><span class="row-label">Theme</span><span class="row-control"><select data-action="set-theme">' +
            [["system", "Match System"], ["light", "Light"], ["dark", "Dark"]].map(function (o) {
              return '<option value="' + o[0] + '"' + (m.settings.theme === o[0] ? " selected" : "") + ">" + o[1] + "</option>";
            }).join("") + "</select></span></label>", { footer: "HomeOps Planner · all features unlocked · data saved in this browser" })
      });
    },

    settingsHome: function (m) {
      var h = m.home;
      return page({
        title: "Home Details",
        back: "#/settings",
        actions: textBtn("edit-home", "Edit"),
        body: group("", kv("Name", h.name) + kv("Address", h.address) + kv("Year Built", h.yearBuilt) + kv("Square Feet", h.squareFeet ? U.number(h.squareFeet) : "")) +
          group("At a Glance", kv("Locations", m.locations.length) + kv("Inventory Items", m.items.length) + kv("Recorded Item Value", U.currency(m.totals.itemValue)) +
            kv("Open Tasks", m.openTasks.length) + kv("Projects", m.projects.length) + kv("All-Time Project Spend", U.currency(m.totals.spent))) +
          (h.notes ? group("Notes", '<div class="row notes">' + E(h.notes) + "</div>") : "")
      });
    },

    settingsNotifications: function (m) {
      var s = m.settings;
      var perm = APP.Reminders.permission();
      var can = APP.Core.canEdit();
      var permText = { granted: "Allowed", denied: "Blocked in browser settings", "default": "Not enabled yet", unsupported: "Not supported by this browser" }[perm];
      function toggle(name, label) {
        return '<label class="row"><span class="row-label">' + label + '</span><span class="switch"><input type="checkbox" data-setting="' + name + '"' + (s[name] ? " checked" : "") + (can ? "" : " disabled") + '><span class="switch-track"></span></span></label>';
      }
      function numberRow(name, label, suffix) {
        return '<label class="row"><span class="row-label">' + label + '</span><span class="row-control inline"><input type="number" min="0" max="365" data-setting="' + name + '" value="' + E(s[name]) + '"' + (can ? "" : " disabled") + '><span class="muted">' + suffix + "</span></span></label>";
      }
      return page({
        title: "Notifications",
        back: "#/settings",
        body: group("", '<label class="row"><span class="row-label">Time</span><span class="row-control"><input type="time" class="pill-input" data-setting="notifyTime" value="' + E(s.notifyTime) + '"' + (can ? "" : " disabled") + "></span></label>") +
          group("Notifications", toggle("notifyTasks", "Maintenance Tasks") + toggle("notifyProjects", "Projects") + toggle("notifyWarranties", "Warranties")) +
          group("Heads-Up Window", numberRow("taskLeadDays", "Tasks & projects due within", "days") + numberRow("warrantyLeadDays", "Warranties expiring within", "days")) +
          group("Browser Alerts", kv("Status", permText, { valueCls: perm === "granted" ? "text-success" : perm === "denied" ? "text-danger" : "" }) +
            (perm === "default" ? actionRow("Enable Browser Notifications", "enable-notifications", "bell") : "") +
            (perm === "granted" ? actionRow("Send Test Notification", "test-notification", "bell") : ""),
            { footer: "Browser alerts appear once a day at your chosen time while HomeOps is open in a tab." }) +
          group("Calendar Reminders", actionRow("Download Calendar File (.ics)", "export-calendar", "calendar"),
            { footer: "Import into Google, Apple, or Outlook Calendar to get reminders on your phone even when this app is closed. Recurring tasks repeat automatically. Re-download after big changes." })
      });
    },

    settingsUsers: function (m) {
      var me = APP.Core.currentUser();
      var isOwner = me.role === "Owner";
      var rows = m.users.map(function (u) {
        return '<div class="row"><span class="avatar avatar-lg">' + E(u.name.charAt(0)) + '</span><span class="row-main"><strong>' + E(u.name) + (u.id === me.id ? " (You)" : "") +
          '</strong><span class="muted">' + E(u.role) + (u.email ? " · " + E(u.email) : "") + "</span></span>" +
          (isOwner ? '<button type="button" class="icon-btn accent" data-action="edit-user" data-id="' + u.id + '" aria-label="Edit ' + E(u.name) + '">' + I.svg("edit") + "</button>" : "") + "</div>";
      }).join("");

      return page({
        title: "Users",
        back: "#/settings",
        body: group("Users", rows) +
          (isOwner ? group("", actionRow("Add User", "add-user", "plus")) : "") +
          group("Acting As", '<label class="row"><span class="row-label">Current user</span><span class="row-control"><select data-action="switch-user">' +
            m.users.map(function (u) { return '<option value="' + u.id + '"' + (u.id === me.id ? " selected" : "") + ">" + E(u.name) + " (" + E(u.role) + ")</option>"; }).join("") +
            "</select></span></label>", { footer: "Pick who is using this device. Completions are logged with their name; Viewers get a read-only view." }) +
          group("Share With Your Household", actionRow("Download Household File", "export-share", "download") +
            '<label class="row row-link row-action"><span class="row-icon accent">' + I.svg("upload") + '</span><span class="row-label accent">Merge a Household File</span><input type="file" accept=".json" hidden data-action="import-merge"></label>',
            { footer: "Send the file to your partner or roommate (text, email, shared drive). When they merge it, new items, tasks, projects, and completion history are combined — nothing is deleted." })
      });
    },

    settingsData: function (m) {
      var can = APP.Core.canEdit();
      return page({
        title: "Data",
        back: "#/settings",
        body: group("Backup", actionRow("Download Full Backup (.json)", "export-backup", "download") +
            (can ? '<label class="row row-link row-action"><span class="row-icon accent">' + I.svg("upload") + '</span><span class="row-label accent">Restore From Backup</span><input type="file" accept=".json" hidden id="backup-import"></label>' : ""),
            { footer: "Restoring replaces everything in this browser. Attachment files themselves stay in this browser and are not included in backups." }) +
          group("Export Spreadsheets", ["inventory", "maintenance", "history", "projects", "paints", "warranties"].map(function (k) {
            var label = { inventory: "Inventory", maintenance: "Maintenance Tasks", history: "Maintenance History", projects: "Projects", paints: "Paint Colors", warranties: "Warranties" }[k];
            return '<div class="row"><span class="row-label">' + label + '</span><span class="row-control gap">' +
              '<button type="button" class="pill-btn pill-light" data-action="export-table" data-id="' + k + '" data-format="csv">CSV</button>' +
              '<button type="button" class="pill-btn pill-light" data-action="export-table" data-id="' + k + '" data-format="xlsx">Excel</button></span></div>';
          }).join("")) +
          (can ? group("Import Inventory", '<label class="row row-link row-action"><span class="row-icon accent">' + I.svg("upload") + '</span><span class="row-label accent">Import From Spreadsheet (.xlsx)</span><input type="file" accept=".xlsx,.xls" hidden data-action="import-xlsx"></label>',
            { footer: "Columns like Name, Category, Room/Location, Brand, Model, Serial, Purchase Date, Warranty End, and Notes are detected automatically." }) : "") +
          (can ? group("Reset", actionRow("Load Example Data", "reset-demo", "history") + '<button type="button" class="row row-link row-action" data-action="clear-all"><span class="row-icon text-danger">' + I.svg("trash") + '</span><span class="row-label text-danger">Erase All Data</span></button>') : "")
      });
    },

    settingsActivity: function () {
      var rows = APP.State.data.auditLog.map(function (e) {
        return '<div class="row"><span class="row-main"><strong class="' + (e.type === "warning" ? "text-warning" : "") + '">' + E(e.message) + '</strong><span class="muted">' +
          E(new Date(e.time).toLocaleString()) + (e.user ? " · " + E(e.user) : "") + "</span></span></div>";
      }).join("");
      return page({
        title: "Activity Log",
        back: "#/settings",
        actions: textBtn("clear-log", "Clear"),
        body: group("", rows || empty("No activity yet."))
      });
    },

    notFound: function (what, back) {
      return page({ title: what + " not found", back: back, body: '<div class="empty-card">It may have been deleted.</div>' });
    }
  };
}());
