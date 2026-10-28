(function () {
  "use strict";

  window.APP = window.APP || {};

  APP.Config = {
    appName: "HomeOps Planner",
    storageKey: "homeops-planner-v2",
    legacyStorageKey: "homeops-planner-v1",
    schemaVersion: 2,
    attachmentQuotaBytes: 1024 * 1024 * 1024,
    supportedImportExtensions: [".xlsx", ".xls"]
  };

  APP.State = {
    route: { view: "dashboard", id: "", sub: "" },
    data: null,
    ui: {
      search: "",
      taskFilter: "upcoming",
      projectFilter: "active",
      sheet: null,
      toast: null
    }
  };

  function iso(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() + offsetDays);
    var off = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - off).toISOString().slice(0, 10);
  }

  APP.Core = {
    createId: function (prefix) {
      return (prefix || "item") + "-" + Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2, 8);
    },

    emptyData: function () {
      return {
        schemaVersion: APP.Config.schemaVersion,
        home: { name: "My Home", address: "", yearBuilt: "", squareFeet: "", notes: "" },
        locations: [],
        items: [],
        paints: [],
        tasks: [],
        projects: [],
        floors: [],
        rooms: [],
        devices: [],
        panels: [],
        users: [{ id: "user-me", name: "Me", email: "", role: "Owner" }],
        currentUserId: "user-me",
        attachments: [],
        settings: {
          notifyTime: "09:00",
          notifyTasks: true,
          notifyProjects: true,
          notifyWarranties: true,
          taskLeadDays: 7,
          warrantyLeadDays: 90,
          theme: "system",
          lastNotified: ""
        },
        auditLog: []
      };
    },

    defaultData: function () {
      var data = APP.Core.emptyData();

      data.users[0].name = "You";
      data.locations = [
        { id: "loc-basement", name: "Basement", notes: "" },
        { id: "loc-kitchen", name: "Kitchen", notes: "" },
        { id: "loc-laundry", name: "Laundry Room", notes: "" },
        { id: "loc-bath", name: "Main Bathroom", notes: "" },
        { id: "loc-outside", name: "Outside", notes: "" }
      ];

      data.items = [
        { id: "item-hvac", name: "HVAC", category: "hvac", locationId: "loc-basement", brand: "Carrier", model: "24ACC636A003", serial: "", purchaseDate: "2019-05-10", purchasePrice: 7800, store: "", warrantyEnd: "2029-05-10", warrantyProvider: "Carrier", notes: "Filter size 16x25x1." },
        { id: "item-water-heater", name: "Water Heater", category: "water-heater", locationId: "loc-basement", brand: "Rheem", model: "XG50T06EC36U1", serial: "", purchaseDate: "2021-03-12", purchasePrice: 1350, store: "Home Depot", warrantyEnd: "2027-03-12", warrantyProvider: "Rheem", notes: "" },
        { id: "item-fridge", name: "Refrigerator", category: "fridge", locationId: "loc-kitchen", brand: "Samsung", model: "RF239092-32", serial: "SMG9032M9F0DFS", purchaseDate: "2021-08-01", purchasePrice: 2199, store: "Best Buy", warrantyEnd: "2026-12-01", warrantyProvider: "Samsung", notes: "" },
        { id: "item-dishwasher", name: "Dishwasher", category: "dishwasher", locationId: "loc-kitchen", brand: "Bosch", model: "SHPM65Z55N", serial: "", purchaseDate: "2023-02-02", purchasePrice: 999, store: "", warrantyEnd: "2028-02-02", warrantyProvider: "", notes: "" },
        { id: "item-dryer", name: "Dryer", category: "dryer", locationId: "loc-laundry", brand: "LG", model: "", serial: "", purchaseDate: "2022-04-20", purchasePrice: 899, store: "", warrantyEnd: "", warrantyProvider: "", notes: "" },
        { id: "item-washer", name: "Washing Machine", category: "washer", locationId: "loc-laundry", brand: "LG", model: "", serial: "", purchaseDate: "2022-04-20", purchasePrice: 949, store: "", warrantyEnd: "", warrantyProvider: "", notes: "" },
        { id: "item-roof", name: "Roof", category: "roof", locationId: "loc-outside", brand: "GAF", model: "Timberline HDZ", serial: "", purchaseDate: "2018-09-01", purchasePrice: 14500, store: "", warrantyEnd: "2043-09-01", warrantyProvider: "GAF", notes: "" }
      ];

      data.paints = [
        { id: "paint-1", locationId: "loc-laundry", name: "Sage Green", brand: "Benjamin Moore", code: "", finish: "Flat/Matte", surface: "Walls", hex: "#b8c9a3", notes: "" },
        { id: "paint-2", locationId: "loc-laundry", name: "Simply White", brand: "Benjamin Moore", code: "OC-117", finish: "Semi-Gloss", surface: "Trim", hex: "#f4f1e6", notes: "" },
        { id: "paint-3", locationId: "loc-laundry", name: "Ceiling White", brand: "Benjamin Moore", code: "", finish: "Flat/Matte", surface: "Ceiling", hex: "#f7f7f2", notes: "" }
      ];

      data.tasks = [
        { id: "task-filter", name: "Replace Filter", itemId: "item-fridge", locationId: "", scheduleType: "recurring", intervalCount: 6, intervalUnit: "month", nextDue: iso(12), notes: "Samsung HAF-QIN filter.", assigneeId: "", history: [] },
        { id: "task-tuneup", name: "Tune-Up", itemId: "item-hvac", locationId: "", scheduleType: "recurring", intervalCount: 1, intervalUnit: "year", nextDue: iso(27), notes: "", assigneeId: "", history: [] },
        { id: "task-hvac-filter", name: "Replace Air Filter", itemId: "item-hvac", locationId: "", scheduleType: "recurring", intervalCount: 3, intervalUnit: "month", nextDue: iso(-3), notes: "16x25x1 MERV 11", assigneeId: "", history: [] },
        { id: "task-flush", name: "Flush Tank", itemId: "item-water-heater", locationId: "", scheduleType: "recurring", intervalCount: 1, intervalUnit: "year", nextDue: iso(60), notes: "", assigneeId: "", history: [] },
        { id: "task-gutters", name: "Clean Gutters", itemId: "", locationId: "loc-outside", scheduleType: "recurring", intervalCount: 6, intervalUnit: "month", nextDue: iso(20), notes: "", assigneeId: "", history: [] }
      ];

      data.projects = [
        {
          id: "project-bath", name: "Bathroom Renovation", status: "Not Started", locationId: "loc-bath",
          startDate: iso(30), endDate: iso(75), budget: 32123,
          notes: "Supplies on order with Home Depot.",
          expenses: [],
          supplies: [
            { id: "sup-1", name: "Vanity (48in)", qty: 1, cost: 899, store: "Home Depot", purchased: true },
            { id: "sup-2", name: "Floor tile (sq ft)", qty: 85, cost: 4.5, store: "Home Depot", purchased: false }
          ]
        }
      ];

      if (APP.FloorPlan) {
        APP.FloorPlan.addSample(data);
      }

      data.auditLog = [{ id: "log-welcome", time: new Date().toISOString(), type: "info", message: "HomeOps Planner initialized with example data." }];
      return data;
    },

    // Fill any missing keys so older saves and imported files keep working.
    normalize: function (data) {
      var base = APP.Core.emptyData();

      Object.keys(base).forEach(function (key) {
        if (data[key] === undefined || data[key] === null) {
          data[key] = base[key];
        }
      });

      Object.keys(base.settings).forEach(function (key) {
        if (data.settings[key] === undefined) {
          data.settings[key] = base.settings[key];
        }
      });

      data.tasks.forEach(function (task) {
        task.history = task.history || [];
      });

      data.projects.forEach(function (project) {
        project.expenses = project.expenses || [];
        project.supplies = project.supplies || [];
      });

      data.panels.forEach(function (panel) {
        panel.breakers = panel.breakers || [];
      });

      if (!data.users.length) {
        data.users = base.users;
      }

      if (!data.users.some(function (u) { return u.id === data.currentUserId; })) {
        data.currentUserId = data.users[0].id;
      }

      data.schemaVersion = APP.Config.schemaVersion;
      return data;
    },

    // Convert the v1 starter format (rooms/inventory/tasks) into the v2 schema.
    migrateV1: function (old) {
      var data = APP.Core.emptyData();
      var freqMap = { annual: [1, "year"], yearly: [1, "year"], monthly: [1, "month"], quarterly: [3, "month"] };

      data.home = old.home || data.home;
      data.locations = (old.rooms || []).map(function (room) {
        if (room.paintColor) {
          data.paints.push({
            id: APP.Core.createId("paint"), locationId: room.id, name: room.paintColor, brand: "",
            code: room.paintCode || "", finish: "", surface: "Walls", hex: "", notes: ""
          });
        }
        return { id: room.id, name: room.name, notes: room.notes || "" };
      });

      data.items = (old.inventory || []).map(function (asset) {
        return {
          id: asset.id, name: asset.name, category: APP.Icons.guessCategory(asset.category + " " + asset.name),
          locationId: asset.roomId || "", brand: asset.brand || "", model: asset.model || "", serial: asset.serial || "",
          purchaseDate: asset.receivedDate || asset.installDate || "", purchasePrice: "", store: "",
          warrantyEnd: asset.warrantyEnd || "", warrantyProvider: "", notes: asset.notes || ""
        };
      });

      data.tasks = (old.tasks || []).map(function (task) {
        var freq = String(task.frequency || "").toLowerCase();
        var match = freq.match(/(\d+)\s*(day|week|month|year)/);
        var interval = match ? [Number(match[1]), match[2]] : freqMap[freq];
        return {
          id: task.id, name: task.title, itemId: task.assetId || "", locationId: task.roomId || "",
          scheduleType: interval ? "recurring" : "once",
          intervalCount: interval ? interval[0] : 1, intervalUnit: interval ? interval[1] : "year",
          nextDue: task.dueDate || "", completedDate: task.status === "Complete" ? APP.Utils.todayISO() : "",
          notes: task.notes || "", assigneeId: "", history: []
        };
      });

      data.projects = (old.projects || []).map(function (project) {
        var expenses = [];
        if (Number(project.spent)) {
          expenses.push({ id: APP.Core.createId("exp"), date: APP.Utils.todayISO(), description: "Spending carried over", vendor: "", amount: Number(project.spent) });
        }
        return {
          id: project.id, name: project.name, status: project.status === "Planned" ? "Not Started" : project.status,
          locationId: "", startDate: project.startDate || "", endDate: project.endDate || "",
          budget: Number(project.budget) || 0, notes: project.notes || "", expenses: expenses, supplies: []
        };
      });

      data.auditLog = old.auditLog || [];
      return data;
    },

    load: function () {
      var raw = null;

      try {
        raw = localStorage.getItem(APP.Config.storageKey);
      } catch (error) {
        raw = null;
      }

      if (raw) {
        try {
          APP.State.data = APP.Core.normalize(JSON.parse(raw));
          return;
        } catch (error) {
          APP.State.data = APP.Core.defaultData();
          APP.Core.addAudit("warning", "Saved data could not be read. Example data was restored.");
          return;
        }
      }

      var legacy = null;
      try {
        legacy = localStorage.getItem(APP.Config.legacyStorageKey);
      } catch (error) {
        legacy = null;
      }

      if (legacy) {
        try {
          APP.State.data = APP.Core.normalize(APP.Core.migrateV1(JSON.parse(legacy)));
          APP.Core.addAudit("info", "Data migrated from the previous HomeOps version.");
          return;
        } catch (error) {
          // fall through to example data
        }
      }

      APP.State.data = APP.Core.defaultData();
    },

    save: function () {
      try {
        localStorage.setItem(APP.Config.storageKey, JSON.stringify(APP.State.data));
        return true;
      } catch (error) {
        APP.Core.addAudit("warning", "Browser storage is full or blocked. Download a backup to protect your data.");
        return false;
      }
    },

    addAudit: function (type, message) {
      if (!APP.State.data) {
        return;
      }

      var user = APP.Core.currentUser();

      APP.State.data.auditLog.unshift({
        id: APP.Core.createId("log"),
        time: new Date().toISOString(),
        type: type || "info",
        user: user ? user.name : "",
        message: message
      });

      APP.State.data.auditLog = APP.State.data.auditLog.slice(0, 200);
    },

    currentUser: function () {
      var data = APP.State.data;
      if (!data || !data.users) {
        return null;
      }
      return data.users.filter(function (u) { return u.id === data.currentUserId; })[0] || data.users[0];
    },

    canEdit: function () {
      var user = APP.Core.currentUser();
      return !user || user.role !== "Viewer";
    },

    find: function (collection, id) {
      return (APP.State.data[collection] || []).filter(function (row) { return row.id === id; })[0] || null;
    },

    remove: function (collection, id) {
      APP.State.data[collection] = APP.State.data[collection].filter(function (row) { return row.id !== id; });
    }
  };
}());
