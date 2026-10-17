(function () {
  "use strict";

  APP.Tables = {
    applyTableState: function (tableId, records) {
      var state = APP.State.ui.tables[tableId] || {
        filter: "",
        sortKey: "",
        sortDirection: "asc",
        page: 1
      };

      var filtered = records.filter(function (record) {
        if (!state.filter) {
          return true;
        }

        return Object.keys(record).some(function (key) {
          return String(record[key] || "").toLowerCase().indexOf(state.filter.toLowerCase()) > -1;
        });
      });

      if (state.sortKey) {
        filtered.sort(function (a, b) {
          var left = String(a[state.sortKey] || "").toLowerCase();
          var right = String(b[state.sortKey] || "").toLowerCase();

          if (left < right) { return state.sortDirection === "asc" ? -1 : 1; }
          if (left > right) { return state.sortDirection === "asc" ? 1 : -1; }
          return 0;
        });
      }

      var totalPages = Math.max(1, Math.ceil(filtered.length / APP.Config.pageSize));
      var page = Math.min(state.page, totalPages);
      var start = (page - 1) * APP.Config.pageSize;

      return {
        rows: filtered.slice(start, start + APP.Config.pageSize),
        total: filtered.length,
        page: page,
        totalPages: totalPages
      };
    },

    render: function (options) {
      var result = APP.Tables.applyTableState(options.id, options.records);
      var headers = options.columns.map(function (column) {
        return '<th data-sort-key="' + APP.Utils.escapeHTML(column.key) +
          '" data-table-id="' + APP.Utils.escapeHTML(options.id) + '">' +
          APP.Utils.escapeHTML(column.label) + '</th>';
      }).join("");

      var rows = result.rows.map(function (record) {
        var cells = options.columns.map(function (column) {
          var output = typeof column.render === "function"
            ? column.render(record)
            : APP.Utils.escapeHTML(record[column.key] || "—");

          return "<td>" + output + "</td>";
        }).join("");

        return "<tr>" + cells + "</tr>";
      }).join("");

      if (!rows) {
        rows = '<tr><td colspan="' + options.columns.length + '" class="muted">No matching records.</td></tr>';
      }

      return [
        '<div class="panel-toolbar">',
        '<div><h3>' + APP.Utils.escapeHTML(options.title) + '</h3>',
        '<p class="table-meta">' + APP.Utils.escapeHTML(options.subtitle || "") + '</p></div>',
        '<div class="table-actions">',
        '<button class="btn btn-secondary btn-small" data-action="export-table" data-export="' +
          APP.Utils.escapeHTML(options.exportKey) + '" data-format="csv">Export CSV</button>',
        '<button class="btn btn-secondary btn-small" data-action="export-table" data-export="' +
          APP.Utils.escapeHTML(options.exportKey) + '" data-format="xlsx">Export XLSX</button>',
        '</div></div>',
        '<div class="panel-toolbar">',
        '<input class="table-search" data-table-filter="' + APP.Utils.escapeHTML(options.id) +
          '" placeholder="Filter records..." value="' +
          APP.Utils.escapeHTML((APP.State.ui.tables[options.id] || {}).filter || "") + '">',
        '<span class="table-meta">' + result.total + ' record(s)</span>',
        '</div>',
        '<div class="table-wrap"><table class="data-table"><thead><tr>',
        headers,
        '</tr></thead><tbody>',
        rows,
        '</tbody></table></div>',
        '<div class="table-footer">',
        '<span class="table-meta">Page ' + result.page + " of " + result.totalPages + "</span>",
        '<div class="pagination">',
        '<button class="btn btn-secondary btn-small" data-action="table-page" data-table-id="' +
          APP.Utils.escapeHTML(options.id) + '" data-direction="prev">Previous</button>',
        '<button class="btn btn-secondary btn-small" data-action="table-page" data-table-id="' +
          APP.Utils.escapeHTML(options.id) + '" data-direction="next">Next</button>',
        '</div></div>'
      ].join("");
    }
  };
}());