(function () {
  "use strict";

  window.APP = window.APP || {};

  APP.Config = {
    appName: "HomeOps Planner",
    storageKey: "homeops-planner-v1",
    pageSize: 8,
    dateWarningDays: 30,
    supportedImportExtensions: [".xlsx", ".xls"]
  };

  APP.State = {
    activeView: "dashboard",
    alerts: [],
    data: null,
    ui: {
      tables: {},
      modal: null
    }
  };

  APP.Core = {
    createId: function (prefix) {
      return (prefix || "item") + "-" + Date.now().toString(36) + "-" +
        Math.random().toString(36).slice(2, 8);
    },

    defaultData: function () {
      return {
        home: {
          name: "My Home",
          address: "",
          yearBuilt: "",
          squareFeet: "",
          notes: ""
        },
        rooms: [
          {
            id: "room-kitchen",
            name: "Kitchen",
            floor: "Main",
            paintColor: "Warm White",
            paintCode: "SW 7006",
            notes: "Track appliance service records and paint touch-up inventory."
          },
          {
            id: "room-living",
            name: "Living Room",
            floor: "Main",
            paintColor: "Soft Gray",
            paintCode: "BM OC-65",
            notes: ""
          }
        ],
        inventory: [
          {
            id: "asset-hvac",
            name: "Central HVAC System",
            category: "HVAC",
            roomId: "",
            brand: "Example",
            model: "",
            serial: "",
            receivedDate: "2022-06-15",
            installDate: "2022-06-20",
            warrantyEnd: "2032-06-20",
            condition: "Good",
            notes: "Replace air filter every 90 days."
          },
          {
            id: "asset-water-heater",
            name: "Water Heater",
            category: "Plumbing",
            roomId: "",
            brand: "Example",
            model: "",
            serial: "",
            receivedDate: "2021-03-10",
            installDate: "2021-03-12",
            warrantyEnd: "2027-03-12",
            condition: "Good",
            notes: "Annual flush recommended."
          },
          {
            id: "asset-dishwasher",
            name: "Dishwasher",
            category: "Appliance",
            roomId: "room-kitchen",
            brand: "Example",
            model: "",
            serial: "",
            receivedDate: "2023-02-02",
            installDate: "2023-02-02",
            warrantyEnd: "2026-02-02",
            condition: "Good",
            notes: ""
          }
        ],
        tasks: [
          {
            id: "task-filter",
            title: "Replace HVAC air filter",
            dueDate: "2026-11-15",
            frequency: "Every 90 days",
            status: "Open",
            priority: "High",
            roomId: "",
            assetId: "asset-hvac",
            notes: "Use correct MERV rating for unit."
          },
          {
            id: "task-water",
            title: "Flush water heater",
            dueDate: "2027-03-15",
            frequency: "Annual",
            status: "Open",
            priority: "Medium",
            roomId: "",
            assetId: "asset-water-heater",
            notes: ""
          }
        ],
        projects: [
          {
            id: "project-paint",
            name: "Living Room Refresh",
            status: "In Progress",
            budget: 2200,
            spent: 860,
            startDate: "2026-10-01",
            endDate: "2026-11-15",
            notes: "Paint, lighting, and window treatment update."
          }
        ],
        auditLog: [
          {
            id: "log-welcome",
            time: new Date().toISOString(),
            type: "info",
            message: "HomeOps Planner initialized with example data."
          }
        ]
      };
    },

    load: function () {
      var raw = localStorage.getItem(APP.Config.storageKey);

      if (!raw) {
        APP.State.data = APP.Core.defaultData();
        return;
      }

      try {
        APP.State.data = JSON.parse(raw);
      } catch (error) {
        APP.State.data = APP.Core.defaultData();
        APP.Core.addAudit("warning", "Saved data could not be read. Example data was restored.");
      }
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

      APP.State.data.auditLog.unshift({
        id: APP.Core.createId("log"),
        time: new Date().toISOString(),
        type: type || "info",
        message: message
      });

      APP.State.data.auditLog = APP.State.data.auditLog.slice(0, 100);
    }
  };
}());