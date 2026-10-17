(function () {
  "use strict";

  APP.Clean = {
    parseDate: function (value) {
      if (value === null || value === undefined || value === "") {
        return { value: "", warning: "" };
      }

      if (value instanceof Date && !isNaN(value.getTime())) {
        return { value: value.toISOString().slice(0, 10), warning: "" };
      }

      if (typeof value === "number" && value > 20000 && value < 70000) {
        var excelDate = new Date(Math.round((value - 25569) * 86400 * 1000));
        return { value: excelDate.toISOString().slice(0, 10), warning: "" };
      }

      var text = String(value).trim();
      var parsed = new Date(text);

      if (!isNaN(parsed.getTime())) {
        return { value: parsed.toISOString().slice(0, 10), warning: "" };
      }

      return {
        value: "",
        warning: "Unparseable date: " + text
      };
    },

    cleanInventoryImport: function (ingestResult) {
      var warnings = [];
      var skipped = 0;
      var cleaned = [];
      var map = ingestResult.headerMap;

      if (map.name === undefined) {
        return {
          rows: [],
          warnings: ["Required column not found: Name, Asset, Item, Appliance, or Equipment."],
          skipped: ingestResult.rows.length
        };
      }

      ingestResult.rows.forEach(function (row, index) {
        var name = String(row[map.name] || "").trim();

        if (!name) {
          skipped += 1;
          return;
        }

        function text(key) {
          return map[key] === undefined ? "" : String(row[map[key]] || "").trim();
        }

        function date(key) {
          var result = map[key] === undefined
            ? { value: "", warning: "" }
            : APP.Clean.parseDate(row[map[key]]);

          if (result.warning) {
            warnings.push("Row " + (index + ingestResult.headerRow + 2) + ": " + result.warning);
          }

          return result.value;
        }

        cleaned.push({
          name: name,
          category: text("category") || "Other",
          room: text("room"),
          brand: text("brand"),
          model: text("model"),
          serial: text("serial"),
          receivedDate: date("receiveddate"),
          installDate: date("installdate"),
          warrantyEnd: date("warrantyend"),
          condition: text("condition") || "Unknown",
          notes: text("notes")
        });
      });

      return {
        rows: cleaned,
        warnings: warnings,
        skipped: skipped
      };
    }
  };
}());