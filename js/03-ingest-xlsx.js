(function () {
  "use strict";

  APP.IngestXlsx = {
    aliases: {
      name: ["name", "asset", "item", "appliance", "equipment", "description"],
      category: ["category", "type", "asset type", "equipment type"],
      room: ["room", "location", "area"],
      brand: ["brand", "manufacturer", "make"],
      model: ["model", "model number"],
      serial: ["serial", "serial number"],
      receiveddate: ["received date", "purchase date", "date received"],
      installdate: ["install date", "installation date", "date installed"],
      warrantyend: ["warranty end", "warranty expiration", "warranty expiry"],
      condition: ["condition", "status"],
      notes: ["notes", "comments", "remarks"]
    },

    normalizeHeader: function (value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .replace(/[^a-z0-9 ]/g, "");
    },

    detectHeaderRow: function (rows) {
      var bestIndex = 0;
      var bestScore = -1;
      var known = Object.keys(APP.IngestXlsx.aliases);

      rows.slice(0, 25).forEach(function (row, rowIndex) {
        var score = 0;

        row.forEach(function (cell) {
          var normalized = APP.IngestXlsx.normalizeHeader(cell);

          known.forEach(function (key) {
            if (APP.IngestXlsx.aliases[key].indexOf(normalized) > -1) {
              score += 1;
            }
          });
        });

        if (score > bestScore) {
          bestScore = score;
          bestIndex = rowIndex;
        }
      });

      return bestIndex;
    },

    mapHeaders: function (headers) {
      var map = {};

      headers.forEach(function (header, index) {
        var normalized = APP.IngestXlsx.normalizeHeader(header);

        Object.keys(APP.IngestXlsx.aliases).forEach(function (canonical) {
          if (APP.IngestXlsx.aliases[canonical].indexOf(normalized) > -1) {
            map[canonical] = index;
          }
        });
      });

      return map;
    },

    readFile: function (file) {
      return new Promise(function (resolve, reject) {
        if (!window.XLSX) {
          reject(new Error("Spreadsheet import is unavailable because the optional SheetJS CDN library did not load."));
          return;
        }

        var reader = new FileReader();

        reader.onerror = function () {
          reject(new Error("The selected spreadsheet could not be read."));
        };

        reader.onload = function (event) {
          try {
            var workbook = XLSX.read(event.target.result, { type: "array", cellDates: true });
            var sheet = workbook.Sheets[workbook.SheetNames[0]];
            var rows = XLSX.utils.sheet_to_json(sheet, {
              header: 1,
              defval: "",
              raw: true
            });

            var headerRow = APP.IngestXlsx.detectHeaderRow(rows);
            var headers = rows[headerRow] || [];
            var headerMap = APP.IngestXlsx.mapHeaders(headers);
            var dataRows = rows.slice(headerRow + 1);

            resolve({
              rows: dataRows,
              headers: headers,
              headerMap: headerMap,
              headerRow: headerRow,
              sheetName: workbook.SheetNames[0]
            });
          } catch (error) {
            reject(new Error("Spreadsheet parsing failed. Confirm that the file is a valid .xlsx workbook."));
          }
        };

        reader.readAsArrayBuffer(file);
      });
    }
  };
}());