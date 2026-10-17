(function () {
  "use strict";

  APP.Controller = {
    init: function () {
      APP.Dom.init();
      APP.Core.load();

      APP.Controller.bindEvents();
      APP.Controller.render();
      APP.Core.addAudit("info", "Application loaded.");
      APP.Core.save();
    },

    bindEvents: function () {
      APP.Dom.onDocumentClick(APP.Controller.handleClick);
      APP.Dom.onDocumentSubmit(APP.Controller.handleSubmit);
      APP.Dom.onDocumentInput(APP.Controller.handleInput);
      APP.Dom.onDocumentChange(APP.Controller.handleChange);
    },

    saveAndRender: function (message) {
      APP.Core.save();
      APP.Dom.setText("saveStatus", "Saved locally");
      if (message) {
        APP.Controller.addAlert("info", message);
      }
      APP.Controller.render();
    },

    addAlert: function (type, message) {
      APP.State.alerts = [{ type: type, message: message }];
    },

    renderAlerts: function () {
      var html = APP.State.alerts.map(function (alert) {
        return '<div class="alert alert-' + APP.Utils.escapeHTML(alert.type) + '">' +
          APP.Utils.escapeHTML(alert.message) + "</div>";
      }).join("");

      APP.Dom.setHTML("alerts", html);
      APP.State.alerts = [];
    },

    renderAudit: function () {
      var log = APP.State.data.auditLog.map(function (entry) {
        return '<div class="audit-entry">' +
          '<time>' + APP.Utils.escapeHTML(new Date(entry.time).toLocaleString()) + "</time>" +
          "<div>" + APP.Utils.escapeHTML(entry.message) + "</div>" +
          "</div>";
      }).join("");

      APP.Dom.setHTML("auditLog", log || '<div class="muted">No audit entries.</div>');
    },

    render: function () {
      var model = APP.Model.build(APP.State.data);
      var analytics = APP.Analytics.build(model);
      var view = APP.State.activeView;

      APP.Dom.setActiveNav(view);
      APP.Controller.renderAlerts();
      APP.Controller.renderAudit();

      var renderers = {
        dashboard: APP.Controller.renderDashboard,
        inventory: APP.Controller.renderInventory,
        rooms: APP.Controller.renderRooms,
        projects: APP.Controller.renderProjects,
        maintenance: APP.Controller.renderMaintenance,
        reports: APP.Controller.renderReports
      };

      renderers[view](model, analytics);
    },

    setView: function (view) {
      APP.State.activeView = view;
      APP.Controller.render();
    },

    renderDashboard: function (model, analytics) {
      APP.Dom.setText("pageTitle", "Home Dashboard");

      var findings = analytics.findings.map(function (finding) {
        return '<div class="finding ' + finding.type + '">' +
          "<strong>" + APP.Utils.escapeHTML(finding.title) + "</strong>" +
          "<span>" + APP.Utils.escapeHTML(finding.detail) + "</span>" +
          "</div>";
      }).join("");

      var taskList = analytics.dueTasks.map(function (task) {
        var urgency = task.isOverdue ? "danger" : "warning";
        var timing = task.isOverdue
          ? Math.abs(task.daysUntil) + " day(s) overdue"
          : "Due in " + task.daysUntil + " day(s)";

        return '<div class="timeline-item ' + urgency + '">' +
          "<strong>" + APP.Utils.escapeHTML(task.title) + "</strong>" +
          "<span>" + APP.Utils.escapeHTML(timing) + " · " +
          APP.Utils.escapeHTML(task.assetName) + "</span></div>";
      }).join("") || '<div class="empty-state">No upcoming maintenance tasks.</div>';

      var chartAvailable = window.Chart
        ? '<canvas id="project-spend-chart"></canvas>'
        : '<div class="chart-fallback">Chart.js is unavailable. Project budget totals remain available in the Projects tab.</div>';

      APP.Dom.setHTML("viewRoot",
        '<div class="grid metrics-grid">' +
          APP.Controller.metricCard("Home Assets", analytics.metrics.assetCount, "Tracked appliances, systems, and equipment", "text-info") +
          APP.Controller.metricCard("Open Tasks", analytics.metrics.openTaskCount, analytics.metrics.overdueTaskCount + " overdue", analytics.metrics.overdueTaskCount ? "text-danger" : "text-success") +
          APP.Controller.metricCard("Project Spending", APP.Utils.currency(analytics.metrics.projectSpent), "of " + APP.Utils.currency(analytics.metrics.projectBudget) + " planned", "text-warning") +
          APP.Controller.metricCard("Rooms Tracked", analytics.metrics.roomCount, "Paint colors, finishes, and notes", "text-info") +
        "</div>" +
        '<div class="grid dashboard-grid">' +
          '<section class="card"><div class="panel-toolbar"><div><p class="eyebrow">PRIORITY ITEMS</p><h3>Home Findings</h3></div>' +
          '<button class="btn btn-secondary btn-small" data-action="export-table" data-export="findings" data-format="csv">Export Findings</button></div>' +
          '<div class="findings-list">' + findings + "</div></section>" +
          '<section class="card"><p class="eyebrow">MAINTENANCE CALENDAR</p><h3>Upcoming Work</h3>' +
          '<div class="timeline-list">' + taskList + "</div></section>" +
        "</div>" +
        '<section class="card" style="margin-top:16px">' +
          '<div class="panel-toolbar"><div><p class="eyebrow">CAPITAL PLANNING</p><h3>Project Budget vs. Spending</h3></div>' +
          '<span class="table-meta">USD</span></div><div class="chart-wrap">' + chartAvailable + "</div></section>"
      );

      if (window.Chart) {
        APP.Charts.buildProjectSpend("project-spend-chart", analytics.projectSpend);
      }
    },

    metricCard: function (label, value, detail, className) {
      return '<section class="card metric-card"><p class="metric-label">' +
        APP.Utils.escapeHTML(label) + '</p><div class="metric-value">' +
        APP.Utils.escapeHTML(value) + '</div><div class="metric-trend ' +
        className + '">' + APP.Utils.escapeHTML(detail) + "</div></section>";
    },

    renderInventory: function (model) {
      APP.Dom.setText("pageTitle", "Home Inventory");

      var table = APP.Tables.render({
        id: "inventory-table",
        title: "Appliances, Systems & Equipment",
        subtitle: "Track purchase dates, installation details, warranties, and service information.",
        exportKey: "inventory",
        records: model.assets,
        columns: [
          { key: "name", label: "Asset" },
          { key: "category", label: "Category" },
          { key: "roomName", label: "Room" },
          { key: "brand", label: "Brand" },
          { key: "warrantyEnd", label: "Warranty End", render: function (r) { return APP.Utils.date(r.warrantyEnd); } },
          { key: "condition", label: "Condition", render: function (r) { return '<span class="badge ' + APP.Utils.statusBadge(r.condition) + '">' + APP.Utils.escapeHTML(r.condition) + "</span>"; } },
          { key: "id", label: "Actions", render: function (r) { return '<button class="btn btn-secondary btn-small" data-action="delete-asset" data-id="' + r.id + '">Delete</button>'; } }
        ]
      });

      APP.Dom.setHTML("viewRoot",
        '<div class="grid two-col">' +
          '<section class="card"><p class="eyebrow">ADD ASSET</p><h3>New Home Inventory Item</h3>' +
          APP.Controller.assetForm(model) + "</section>" +
          '<section class="card"><p class="eyebrow">SPREADSHEET IMPORT</p><h3>Import Inventory Workbook</h3>' +
          '<p class="form-help">Accepted headers include Name, Category, Room, Brand, Model, Serial, Received Date, Install Date, Warranty End, Condition, and Notes.</p>' +
          '<label class="btn btn-secondary file-label">Select .xlsx Inventory File<input type="file" data-action="import-xlsx" accept=".xlsx,.xls"></label>' +
          '<p class="form-help">The importer detects report header rows, normalizes aliases, and records date parsing warnings in the audit log.</p>' +
          "</section></div><section class=\"card\" style=\"margin-top:16px\">" + table + "</section>"
      );
    },

    assetForm: function (model) {
      var rooms = '<option value="">Whole Home / Unassigned</option>' +
        model.rooms.map(function (room) {
          return '<option value="' + room.id + '">' + APP.Utils.escapeHTML(room.name) + "</option>";
        }).join("");

      return '<form data-form="asset" class="form-grid three">' +
        APP.Controller.field("Name", "name", "text", true) +
        APP.Controller.field("Category", "category", "text", true) +
        '<div class="field"><label>Room</label><select name="roomId">' + rooms + "</select></div>" +
        APP.Controller.field("Brand", "brand", "text") +
        APP.Controller.field("Model", "model", "text") +
        APP.Controller.field("Serial Number", "serial", "text") +
        APP.Controller.field("Received Date", "receivedDate", "date") +
        APP.Controller.field("Install Date", "installDate", "date") +
        APP.Controller.field("Warranty End", "warrantyEnd", "date") +
        '<div class="field"><label>Condition</label><select name="condition"><option>Good</option><option>Fair</option><option>Needs Attention</option><option>Unknown</option></select></div>' +
        APP.Controller.field("Notes", "notes", "textarea", false, "full") +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Add Inventory Item</button></div></form>';
    },

    renderRooms: function (model) {
      APP.Dom.setText("pageTitle", "Rooms & Finishes");

      var cards = model.rooms.map(function (room) {
        var assets = model.assets.filter(function (asset) {
          return asset.roomName === room.name;
        });

        return '<section class="card room-card">' +
          '<div class="split-heading"><div><h3>' + APP.Utils.escapeHTML(room.name) + '</h3><p class="table-meta">' +
          APP.Utils.escapeHTML(room.floor || "Floor not recorded") + "</p></div>" +
          '<button class="btn btn-secondary btn-small" data-action="delete-room" data-id="' + room.id + '">Delete</button></div>' +
          '<div><span class="color-swatch" style="background:' + APP.Utils.escapeHTML(room.paintColor || "#777") + '"></span>' +
          APP.Utils.escapeHTML(room.paintColor || "Paint not recorded") +
          (room.paintCode ? " · " + APP.Utils.escapeHTML(room.paintCode) : "") + "</div>" +
          '<div class="muted">' + APP.Utils.escapeHTML(room.notes || "No room notes.") + "</div>" +
          '<div class="table-meta">Assets in room: ' + assets.length + "</div></section>";
      }).join("") || '<div class="empty-state">Add rooms to track paint colors, finishes, and room-specific assets.</div>';

      APP.Dom.setHTML("viewRoot",
        '<div class="grid two-col"><section class="card"><p class="eyebrow">ADD ROOM</p><h3>Room & Finish Details</h3>' +
        '<form data-form="room" class="form-grid">' +
        APP.Controller.field("Room Name", "name", "text", true) +
        APP.Controller.field("Floor / Area", "floor", "text") +
        APP.Controller.field("Paint Color", "paintColor", "text") +
        APP.Controller.field("Paint Code", "paintCode", "text") +
        APP.Controller.field("Notes", "notes", "textarea", false, "full") +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Add Room</button></div></form></section>' +
        '<section class="card"><p class="eyebrow">ROOM PLANNING</p><h3>Suggested Uses</h3><div class="findings-list">' +
        '<div class="finding"><strong>Paint tracking</strong><span>Record manufacturer, color name, sheen, and paint code in room notes.</span></div>' +
        '<div class="finding"><strong>Appliance mapping</strong><span>Assign inventory assets to rooms for quicker service and replacement planning.</span></div>' +
        "</div></section></div><div class=\"grid\" style=\"grid-template-columns:repeat(auto-fit,minmax(260px,1fr));margin-top:16px\">" + cards + "</div>"
      );
    },

    renderProjects: function (model) {
      APP.Dom.setText("pageTitle", "Projects & Budget");

      var table = APP.Tables.render({
        id: "projects-table",
        title: "Current and Planned Projects",
        subtitle: "Monitor scope, budget, current spending, and milestone dates.",
        exportKey: "projects",
        records: model.projects,
        columns: [
          { key: "name", label: "Project" },
          { key: "status", label: "Status", render: function (r) { return '<span class="badge ' + APP.Utils.statusBadge(r.status) + '">' + APP.Utils.escapeHTML(r.status) + "</span>"; } },
          { key: "budget", label: "Budget", render: function (r) { return APP.Utils.currency(r.budget); } },
          { key: "spent", label: "Spent", render: function (r) { return APP.Utils.currency(r.spent); } },
          { key: "remaining", label: "Remaining", render: function (r) { return '<span class="' + (r.remaining < 0 ? "text-danger" : "text-success") + '">' + APP.Utils.currency(r.remaining) + "</span>"; } },
          { key: "endDate", label: "Target End", render: function (r) { return APP.Utils.date(r.endDate); } },
          { key: "id", label: "Actions", render: function (r) { return '<button class="btn btn-secondary btn-small" data-action="delete-project" data-id="' + r.id + '">Delete</button>'; } }
        ]
      });

      APP.Dom.setHTML("viewRoot",
        '<div class="grid two-col"><section class="card"><p class="eyebrow">CREATE PROJECT</p><h3>Project Budget & Timeline</h3>' +
        '<form data-form="project" class="form-grid">' +
        APP.Controller.field("Project Name", "name", "text", true) +
        '<div class="field"><label>Status</label><select name="status"><option>Planned</option><option>In Progress</option><option>On Hold</option><option>Complete</option></select></div>' +
        APP.Controller.field("Budget", "budget", "number") +
        APP.Controller.field("Current Spend", "spent", "number") +
        APP.Controller.field("Start Date", "startDate", "date") +
        APP.Controller.field("Target End Date", "endDate", "date") +
        APP.Controller.field("Project Notes", "notes", "textarea", false, "full") +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Add Project</button></div></form></section>' +
        '<section class="card"><p class="eyebrow">BUDGET POSTURE</p><h3>Planning Guidance</h3><div class="findings-list">' +
        '<div class="finding"><strong>Budget baseline</strong><span>Enter approved budget before recording project expenses.</span></div>' +
        '<div class="finding"><strong>Timeline visibility</strong><span>Use target end dates to identify projects that need contractor or material follow-up.</span></div>' +
        "</div></section></div><section class=\"card\" style=\"margin-top:16px\">" + table + "</section>"
      );
    },

    renderMaintenance: function (model) {
      APP.Dom.setText("pageTitle", "Maintenance & Reminders");

      var table = APP.Tables.render({
        id: "maintenance-table",
        title: "Maintenance Schedule",
        subtitle: "Use due dates and frequencies to manage recurring home care.",
        exportKey: "maintenance",
        records: model.tasks,
        columns: [
          { key: "title", label: "Task" },
          { key: "dueDate", label: "Due Date", render: function (r) { return APP.Utils.date(r.dueDate); } },
          { key: "priority", label: "Priority", render: function (r) { return '<span class="badge ' + APP.Utils.statusBadge(r.priority) + '">' + APP.Utils.escapeHTML(r.priority) + "</span>"; } },
          { key: "status", label: "Status", render: function (r) { return '<span class="badge ' + APP.Utils.statusBadge(r.status) + '">' + APP.Utils.escapeHTML(r.status) + "</span>"; } },
          { key: "assetName", label: "Related Asset" },
          { key: "frequency", label: "Frequency" },
          { key: "id", label: "Actions", render: function (r) { return '<button class="btn btn-secondary btn-small" data-action="complete-task" data-id="' + r.id + '">Complete</button> <button class="btn btn-ghost btn-small" data-action="delete-task" data-id="' + r.id + '">Delete</button>'; } }
        ]
      });

      APP.Dom.setHTML("viewRoot",
        '<div class="grid two-col"><section class="card"><p class="eyebrow">SCHEDULE MAINTENANCE</p><h3>New Reminder</h3>' +
        APP.Controller.taskForm(model) + "</section>" +
        '<section class="card"><p class="eyebrow">REMINDER NOTE</p><h3>Browser-Local Planning</h3>' +
        '<p class="form-help">This no-backend version tracks reminders inside this browser. It does not send email, text, or push notifications. Export your maintenance schedule or create calendar reminders from your preferred device calendar.</p>' +
        "</section></div><section class=\"card\" style=\"margin-top:16px\">" + table + "</section>"
      );
    },

    taskForm: function (model) {
      var assets = '<option value="">No linked asset</option>' +
        model.assets.map(function (asset) {
          return '<option value="' + asset.id + '">' + APP.Utils.escapeHTML(asset.name) + "</option>";
        }).join("");

      var rooms = '<option value="">Whole Home</option>' +
        model.rooms.map(function (room) {
          return '<option value="' + room.id + '">' + APP.Utils.escapeHTML(room.name) + "</option>";
        }).join("");

      return '<form data-form="task" class="form-grid">' +
        APP.Controller.field("Task", "title", "text", true) +
        APP.Controller.field("Due Date", "dueDate", "date", true) +
        '<div class="field"><label>Priority</label><select name="priority"><option>Low</option><option selected>Medium</option><option>High</option></select></div>' +
        '<div class="field"><label>Status</label><select name="status"><option selected>Open</option><option>Complete</option></select></div>' +
        APP.Controller.field("Frequency", "frequency", "text") +
        '<div class="field"><label>Related Room</label><select name="roomId">' + rooms + "</select></div>" +
        '<div class="field"><label>Related Asset</label><select name="assetId">' + assets + "</select></div>" +
        APP.Controller.field("Notes", "notes", "textarea", false, "full") +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Add Maintenance Task</button></div></form>';
    },

    renderReports: function (model, analytics) {
      APP.Dom.setText("pageTitle", "Home Reports");

      APP.Dom.setHTML("viewRoot",
        '<section class="card report-sheet"><div class="report-header"><p class="eyebrow">HOMEOPS SUMMARY</p><h3>' +
        APP.Utils.escapeHTML(model.home.name || "Home Report") + '</h3><p class="muted">' +
        APP.Utils.escapeHTML(model.home.address || "Address not recorded") + "</p></div>" +
        '<div class="grid metrics-grid" style="margin-top:18px">' +
        APP.Controller.metricCard("Tracked Assets", analytics.metrics.assetCount, "Systems and appliances", "text-info") +
        APP.Controller.metricCard("Open Tasks", analytics.metrics.openTaskCount, analytics.metrics.overdueTaskCount + " overdue", analytics.metrics.overdueTaskCount ? "text-danger" : "text-success") +
        APP.Controller.metricCard("Project Budget", APP.Utils.currency(analytics.metrics.projectBudget), "Current planned budget", "text-warning") +
        APP.Controller.metricCard("Project Spend", APP.Utils.currency(analytics.metrics.projectSpent), analytics.metrics.budgetPercent + "% of budget", "text-info") +
        "</div>" +
        '<div class="grid two-col" style="margin-top:18px"><div><p class="eyebrow">TOP FINDINGS</p><div class="findings-list">' +
        analytics.findings.map(function (finding) {
          return '<div class="finding ' + finding.type + '"><strong>' + APP.Utils.escapeHTML(finding.title) +
            "</strong><span>" + APP.Utils.escapeHTML(finding.detail) + "</span></div>";
        }).join("") +
        '</div></div><div><p class="eyebrow">REPORT ACTIONS</p><div class="inline-actions">' +
        '<button class="btn btn-primary" data-action="print-report">Print / Save PDF</button>' +
        '<button class="btn btn-secondary" data-action="export-table" data-export="findings" data-format="csv">Export Findings CSV</button>' +
        '<button class="btn btn-secondary" data-action="export-backup">Export Full Backup</button>' +
        "</div></div></div></section>"
      );
    },

    field: function (label, name, type, required, extraClass) {
      if (type === "textarea") {
        return '<div class="field ' + (extraClass || "") + '"><label>' + label +
          '</label><textarea name="' + name + '"></textarea></div>';
      }

      return '<div class="field ' + (extraClass || "") + '"><label>' + label +
        '</label><input type="' + type + '" name="' + name + '"' +
        (required ? " required" : "") + "></div>";
    },

    handleClick: function (event) {
      var nav = APP.Dom.closest(event, "[data-view]");
      var actionButton = APP.Dom.closest(event, "[data-action]");

      if (nav) {
        APP.Controller.setView(nav.getAttribute("data-view"));
        return;
      }

      if (!actionButton) {
        return;
      }

      var action = actionButton.getAttribute("data-action");
      var id = actionButton.getAttribute("data-id");

      if (action === "quick-add-task") {
        APP.State.activeView = "maintenance";
        APP.Controller.render();
        return;
      }

      if (action === "export-backup") {
        APP.Exports.backup(APP.State.data);
        APP.Core.addAudit("info", "Full JSON backup exported.");
        APP.Controller.saveAndRender("Backup downloaded.");
        return;
      }

      if (action === "reset-data") {
        APP.State.data = APP.Core.defaultData();
        APP.Core.addAudit("warning", "Data reset to example records.");
        APP.Controller.saveAndRender("Example data restored.");
        return;
      }

      if (action === "clear-audit-log") {
        APP.State.data.auditLog = [];
        APP.Core.addAudit("info", "Audit log cleared.");
        APP.Controller.saveAndRender();
        return;
      }

      if (action === "print-report") {
        APP.Dom.print();
        return;
      }

      if (action === "export-table") {
        var model = APP.Model.build(APP.State.data);
        var analytics = APP.Analytics.build(model);
        var key = actionButton.getAttribute("data-export");
        var format = actionButton.getAttribute("data-format");
        var result = APP.Exports.exportRows(key, APP.Exports.tableData(key, model, analytics), format);

        APP.Core.addAudit("info", key + " table exported.");
        APP.Controller.saveAndRender(result.message);
        return;
      }

      if (action === "delete-asset") {
        APP.State.data.inventory = APP.State.data.inventory.filter(function (item) { return item.id !== id; });
        APP.Core.addAudit("info", "Inventory item deleted.");
        APP.Controller.saveAndRender("Inventory item deleted.");
        return;
      }

      if (action === "delete-room") {
        APP.State.data.rooms = APP.State.data.rooms.filter(function (item) { return item.id !== id; });
        APP.State.data.inventory.forEach(function (asset) {
          if (asset.roomId === id) { asset.roomId = ""; }
        });
        APP.Core.addAudit("info", "Room deleted. Associated assets were left unassigned.");
        APP.Controller.saveAndRender("Room deleted.");
        return;
      }

      if (action === "delete-project") {
        APP.State.data.projects = APP.State.data.projects.filter(function (item) { return item.id !== id; });
        APP.Core.addAudit("info", "Project deleted.");
        APP.Controller.saveAndRender("Project deleted.");
        return;
      }

      if (action === "delete-task") {
        APP.State.data.tasks = APP.State.data.tasks.filter(function (item) { return item.id !== id; });
        APP.Core.addAudit("info", "Maintenance task deleted.");
        APP.Controller.saveAndRender("Maintenance task deleted.");
        return;
      }

      if (action === "complete-task") {
        APP.State.data.tasks.forEach(function (task) {
          if (task.id === id) {
            task.status = "Complete";
          }
        });
        APP.Core.addAudit("info", "Maintenance task marked complete.");
        APP.Controller.saveAndRender("Task marked complete.");
        return;
      }

      if (action === "table-page") {
        var tableId = actionButton.getAttribute("data-table-id");
        var direction = actionButton.getAttribute("data-direction");
        APP.State.ui.tables[tableId] = APP.State.ui.tables[tableId] || { page: 1, filter: "", sortKey: "", sortDirection: "asc" };
        APP.State.ui.tables[tableId].page += direction === "next" ? 1 : -1;
        APP.State.ui.tables[tableId].page = Math.max(1, APP.State.ui.tables[tableId].page);
        APP.Controller.render();
        return;
      }

      if (actionButton.hasAttribute("data-sort-key")) {
        var sortTable = actionButton.getAttribute("data-table-id");
        var sortKey = actionButton.getAttribute("data-sort-key");
        APP.State.ui.tables[sortTable] = APP.State.ui.tables[sortTable] || { page: 1, filter: "", sortKey: "", sortDirection: "asc" };

        if (APP.State.ui.tables[sortTable].sortKey === sortKey) {
          APP.State.ui.tables[sortTable].sortDirection =
            APP.State.ui.tables[sortTable].sortDirection === "asc" ? "desc" : "asc";
        } else {
          APP.State.ui.tables[sortTable].sortKey = sortKey;
          APP.State.ui.tables[sortTable].sortDirection = "asc";
        }

        APP.Controller.render();
      }
    },

    handleInput: function (event) {
      var filter = APP.Dom.closest(event, "[data-table-filter]");

      if (!filter) {
        return;
      }

      var tableId = filter.getAttribute("data-table-filter");
      APP.State.ui.tables[tableId] = APP.State.ui.tables[tableId] || { page: 1, filter: "", sortKey: "", sortDirection: "asc" };
      APP.State.ui.tables[tableId].filter = filter.value;
      APP.State.ui.tables[tableId].page = 1;
      APP.Controller.render();
    },

    handleChange: function (event) {
      var importInput = APP.Dom.closest(event, '[data-action="import-xlsx"]');
      var backupInput = event.target && event.target.id === "backup-import" ? event.target : null;

      if (importInput) {
        APP.Controller.importXlsx(APP.Dom.getFiles(event)[0]);
      }

      if (backupInput) {
        APP.Controller.importBackup(APP.Dom.getFiles(event)[0]);
      }
    },

    handleSubmit: function (event) {
      var form = APP.Dom.closest(event, "form[data-form]");

      if (!form) {
        return;
      }

      event.preventDefault();

      var data = APP.Dom.getFormData(form);
      var type = form.getAttribute("data-form");

      if (type === "asset") {
        APP.State.data.inventory.push({
          id: APP.Core.createId("asset"),
          name: data.get("name"),
          category: data.get("category"),
          roomId: data.get("roomId"),
          brand: data.get("brand"),
          model: data.get("model"),
          serial: data.get("serial"),
          receivedDate: data.get("receivedDate"),
          installDate: data.get("installDate"),
          warrantyEnd: data.get("warrantyEnd"),
          condition: data.get("condition"),
          notes: data.get("notes")
        });
        APP.Core.addAudit("info", "Inventory item added: " + data.get("name"));
        APP.Controller.saveAndRender("Inventory item added.");
      }

      if (type === "room") {
        APP.State.data.rooms.push({
          id: APP.Core.createId("room"),
          name: data.get("name"),
          floor: data.get("floor"),
          paintColor: data.get("paintColor"),
          paintCode: data.get("paintCode"),
          notes: data.get("notes")
        });
        APP.Core.addAudit("info", "Room added: " + data.get("name"));
        APP.Controller.saveAndRender("Room added.");
      }

      if (type === "project") {
        APP.State.data.projects.push({
          id: APP.Core.createId("project"),
          name: data.get("name"),
          status: data.get("status"),
          budget: APP.Utils.safeNumber(data.get("budget")),
          spent: APP.Utils.safeNumber(data.get("spent")),
          startDate: data.get("startDate"),
          endDate: data.get("endDate"),
          notes: data.get("notes")
        });
        APP.Core.addAudit("info", "Project added: " + data.get("name"));
        APP.Controller.saveAndRender("Project added.");
      }

      if (type === "task") {
        APP.State.data.tasks.push({
          id: APP.Core.createId("task"),
          title: data.get("title"),
          dueDate: data.get("dueDate"),
          frequency: data.get("frequency"),
          status: data.get("status"),
          priority: data.get("priority"),
          roomId: data.get("roomId"),
          assetId: data.get("assetId"),
          notes: data.get("notes")
        });
        APP.Core.addAudit("info", "Maintenance task added: " + data.get("title"));
        APP.Controller.saveAndRender("Maintenance task added.");
      }
    },

    importXlsx: function (file) {
      if (!file) {
        return;
      }

      APP.Dom.setText("saveStatus", "Importing spreadsheet...");

      APP.IngestXlsx.readFile(file)
        .then(function (result) {
          var cleaned = APP.Clean.cleanInventoryImport(result);
          var roomNames = {};

          APP.State.data.rooms.forEach(function (room) {
            roomNames[String(room.name).toLowerCase()] = room.id;
          });

          cleaned.rows.forEach(function (row) {
            var roomId = roomNames[String(row.room).toLowerCase()] || "";

            APP.State.data.inventory.push({
              id: APP.Core.createId("asset"),
              name: row.name,
              category: row.category,
              roomId: roomId,
              brand: row.brand,
              model: row.model,
              serial: row.serial,
              receivedDate: row.receivedDate,
              installDate: row.installDate,
              warrantyEnd: row.warrantyEnd,
              condition: row.condition,
              notes: row.notes
            });
          });

          APP.Core.addAudit("info", "Spreadsheet import completed: " + cleaned.rows.length + " asset row(s) added.");
          APP.Core.addAudit("info", "Header row detected at spreadsheet row " + (result.headerRow + 1) + ".");

          cleaned.warnings.slice(0, 15).forEach(function (warning) {
            APP.Core.addAudit("warning", warning);
          });

          if (cleaned.skipped) {
            APP.Core.addAudit("warning", cleaned.skipped + " blank or invalid row(s) skipped during import.");
          }

          APP.Controller.saveAndRender(cleaned.rows.length + " inventory item(s) imported.");
        })
        .catch(function (error) {
          APP.Core.addAudit("warning", error.message);
          APP.Controller.addAlert("danger", error.message + " What to do next: verify the file type and column names, then try again.");
          APP.Controller.render();
        });
    },

    importBackup: function (file) {
      if (!file) {
        return;
      }

      var reader = new FileReader();

      reader.onerror = function () {
        APP.Controller.addAlert("danger", "Backup file could not be read. What to do next: select a valid HomeOps JSON backup.");
        APP.Controller.render();
      };

      reader.onload = function (event) {
        try {
          var parsed = JSON.parse(event.target.result);

          if (!parsed.home || !Array.isArray(parsed.inventory) || !Array.isArray(parsed.tasks)) {
            throw new Error("Backup does not contain the expected HomeOps data structure.");
          }

          APP.State.data = parsed;
          APP.Core.addAudit("info", "Backup imported successfully.");
          APP.Controller.saveAndRender("Backup imported successfully.");
        } catch (error) {
          APP.Controller.addAlert("danger", error.message + " What to do next: select a JSON file created by HomeOps.");
          APP.Controller.render();
        }
      };

      reader.readAsText(file);
    }
  };

  APP.Controller.init();
}());