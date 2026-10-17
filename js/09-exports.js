(function () {
  "use strict";

  APP.Exports = {
    tableData: function (key, model, analytics) {
      if (key === "inventory") {
        return model.assets.map(function (asset) {
          return {
            Name: asset.name,
            Category: asset.category,
            Room: asset.roomName,
            Brand: asset.brand,
            Model: asset.model,
            Serial: asset.serial,
            "Received Date": asset.receivedDate,
            "Install Date": asset.installDate,
            "Warranty End": asset.warrantyEnd,
            Condition: asset.condition,
            Notes: asset.notes
          };
        });
      }

      if (key === "rooms") {
        return model.rooms.map(function (room) {
          return {
            Room: room.name,
            Floor: room.floor,
            "Paint Color": room.paintColor,
            "Paint Code": room.paintCode,
            Notes: room.notes
          };
        });
      }

      if (key === "projects") {
        return model.projects.map(function (project) {
          return {
            Project: project.name,
            Status: project.status,
            Budget: project.budget,
            Spent: project.spent,
            Remaining: project.remaining,
            "Start Date": project.startDate,
            "Target End Date": project.endDate,
            Notes: project.notes
          };
        });
      }

      if (key === "maintenance") {
        return model.tasks.map(function (task) {
          return {
            Task: task.title,
            Due: task.dueDate,
            Status: task.status,
            Priority: task.priority,
            Frequency: task.frequency,
            Room: task.roomName,
            Asset: task.assetName,
            Notes: task.notes
          };
        });
      }

      return analytics.findings.map(function (finding) {
        return {
          Severity: finding.type,
          Finding: finding.title,
          Detail: finding.detail
        };
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
          var value = String(row[header] === undefined ? "" : row[header]);
          return '"' + value.replace(/"/g, '""') + '"';
        }).join(","));
      });

      return output.join("\n");
    },

    exportRows: function (name, rows, format) {
      var fileBase = APP.Utils.slugify(name) + "-" + APP.Utils.todayISO();

      if (format === "xlsx" && window.XLSX) {
        var worksheet = XLSX.utils.json_to_sheet(rows);
        var workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
        XLSX.writeFile(workbook, fileBase + ".xlsx");
        return { success: true, message: "XLSX export created." };
      }

      APP.Dom.download(fileBase + ".csv", APP.Exports.toCSV(rows), "text/csv;charset=utf-8");
      return {
        success: true,
        message: format === "xlsx"
          ? "XLSX library unavailable. Downloaded CSV instead."
          : "CSV export created."
      };
    },

    backup: function (data) {
      APP.Dom.download(
        "homeops-backup-" + APP.Utils.todayISO() + ".json",
        JSON.stringify(data, null, 2),
        "application/json;charset=utf-8"
      );
    }
  };
}());