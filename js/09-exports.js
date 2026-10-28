(function () {
  "use strict";

  APP.Exports = {
    tableData: function (key, model) {
      var U = APP.Utils;

      if (key === "inventory") {
        return model.items.map(function (i) {
          return {
            Name: i.name, Category: APP.Icons.categoryLabel(i.category), Location: i.locationName,
            Brand: i.brand, Model: i.model, "Serial Number": i.serial, "Purchase Date": i.purchaseDate,
            "Purchase Price": i.purchasePrice, Store: i.store, "Warranty End": i.warrantyEnd,
            "Warranty Provider": i.warrantyProvider, Notes: i.notes
          };
        });
      }

      if (key === "maintenance") {
        return model.tasks.map(function (t) {
          return {
            Task: t.name, For: t.subject, Location: t.locationName, Schedule: t.scheduleLabel,
            "Next Due": t.isDone ? "" : t.nextDue, Status: t.isDone ? "Complete" : t.dueStatus,
            "Last Completed": t.lastDone || t.completedDate || "", "Assigned To": t.assigneeName, Notes: t.notes
          };
        });
      }

      if (key === "history") {
        var rows = [];
        model.tasks.forEach(function (t) {
          t.history.forEach(function (h) {
            rows.push({ Date: h.date, Task: t.name, For: t.subject, "Completed By": h.by || "", Cost: h.cost || "", Notes: h.note || "" });
          });
        });
        return U.sortBy(rows, "Date").reverse();
      }

      if (key === "projects") {
        return model.projects.map(function (p) {
          return {
            Project: p.name, Status: p.status, Location: p.locationName, "Start Date": p.startDate,
            "End Date": p.endDate, Budget: p.budget, Spent: p.spent, Remaining: p.remaining,
            "Supplies To Buy": p.suppliesToBuy, Notes: p.notes
          };
        });
      }

      if (key === "paints") {
        return model.paints.map(function (p) {
          return {
            Location: model.locationMap[p.locationId] ? model.locationMap[p.locationId].name : "",
            Color: p.name, Brand: p.brand, Code: p.code, Finish: p.finish, Surface: p.surface, Hex: p.hex, Notes: p.notes
          };
        });
      }

      return model.warranties.map(function (w) {
        return { Item: w.name, Location: w.locationName, Provider: w.warrantyProvider || w.brand, "Expires": w.warrantyEnd, Status: w.warrantyStatus };
      });
    },

    toCSV: function (rows) {
      if (!rows.length) {
        return "";
      }

      var headers = Object.keys(rows[0]);
      var output = [headers.join(",")];

      rows.forEach(function (row) {
        output.push(headers.map(function (header) {
          var value = String(row[header] === undefined || row[header] === null ? "" : row[header]);
          return '"' + value.replace(/"/g, '""') + '"';
        }).join(","));
      });

      return output.join("\n");
    },

    exportRows: function (name, rows, format) {
      var fileBase = APP.Utils.slugify(name) + "-" + APP.Utils.todayISO();

      if (!rows.length) {
        return { success: false, message: "Nothing to export yet." };
      }

      if (format === "xlsx" && window.XLSX) {
        var worksheet = XLSX.utils.json_to_sheet(rows);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
        XLSX.writeFile(workbook, fileBase + ".xlsx");
        return { success: true, message: "Excel file downloaded." };
      }

      APP.Dom.download(fileBase + ".csv", APP.Exports.toCSV(rows), "text/csv;charset=utf-8");
      return {
        success: true,
        message: format === "xlsx" ? "Excel library unavailable. Downloaded CSV instead." : "CSV downloaded."
      };
    },

    backup: function (data) {
      var copy = JSON.parse(JSON.stringify(data));
      copy.exportedAt = new Date().toISOString();
      APP.Dom.download(
        APP.Utils.slugify(data.home.name || "homeops") + "-backup-" + APP.Utils.todayISO() + ".json",
        JSON.stringify(copy, null, 2),
        "application/json;charset=utf-8"
      );
    },

    // Merge records from a household member's file: anything newer or missing is added, nothing is deleted.
    merge: function (incoming) {
      var data = APP.State.data;
      var added = 0;
      ["locations", "items", "paints", "tasks", "projects", "users", "floors", "rooms", "devices", "panels"].forEach(function (key) {
        var existing = {};
        data[key].forEach(function (row, idx) { existing[row.id] = idx; });
        (incoming[key] || []).forEach(function (row) {
          if (existing[row.id] === undefined) {
            data[key].push(row);
            added += 1;
          } else if (key === "tasks") {
            // Keep the furthest-along schedule and union the completion history.
            var mine = data[key][existing[row.id]];
            var seen = {};
            mine.history.forEach(function (h) { seen[h.date + h.note] = true; });
            (row.history || []).forEach(function (h) {
              if (!seen[h.date + h.note]) {
                mine.history.push(h);
              }
            });
            mine.history.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
            if ((row.nextDue || "") > (mine.nextDue || "")) {
              mine.nextDue = row.nextDue;
            }
          }
        });
      });
      return added;
    }
  };
}());
