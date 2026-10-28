(function () {
  "use strict";

  var E = function (v) { return APP.Utils.escapeHTML(v); };

  function table(headers, rows) {
    if (!rows.length) {
      return '<p class="r-empty">None recorded.</p>';
    }
    return "<table><thead><tr>" + headers.map(function (h) { return "<th>" + E(h) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.map(function (r) {
        return "<tr>" + r.map(function (c) { return "<td>" + E(c) + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table>";
  }

  APP.Reports = {
    types: [
      { value: "full", label: "Full Home Summary" },
      { value: "inventory", label: "Inventory" },
      { value: "maintenance", label: "Maintenance" },
      { value: "projects", label: "Projects" },
      { value: "warranties", label: "Warranties" }
    ],

    build: function (model, opts) {
      var U = APP.Utils;
      var type = opts.type;
      var all = type === "full";
      var title = (APP.Reports.types.filter(function (t) { return t.value === type; })[0] || {}).label || "Report";
      var html = [];

      html.push('<header class="r-head"><div><h1>' + E(model.home.name) + "</h1><p>" +
        E([model.home.address, model.home.yearBuilt ? "Built " + model.home.yearBuilt : "", model.home.squareFeet ? U.number(model.home.squareFeet) + " sq ft" : ""].filter(Boolean).join(" · ")) +
        '</p></div><div class="r-meta"><strong>' + E(title) + "</strong><span>Generated " + E(U.date(U.todayISO())) + "</span></div></header>");

      if (all) {
        html.push('<section class="r-stats">' +
          "<div><b>" + model.items.length + "</b><span>Inventory items</span></div>" +
          "<div><b>" + model.openTasks.length + "</b><span>Open tasks (" + model.overdueTasks.length + " overdue)</span></div>" +
          "<div><b>" + model.projects.filter(function (p) { return p.isActive; }).length + "</b><span>Active projects</span></div>" +
          "<div><b>" + U.currency(model.totals.itemValue) + "</b><span>Recorded item value</span></div></section>");
      }

      if (all || type === "inventory") {
        html.push("<h2>Inventory</h2>");
        model.locations.concat([{ id: "", name: "Unassigned" }]).forEach(function (loc) {
          var rows = model.items.filter(function (i) { return loc.id ? i.locationId === loc.id : !model.locationMap[i.locationId]; });
          if (!rows.length) {
            return;
          }
          html.push("<h3>" + E(loc.name) + "</h3>" + table(
            ["Item", "Brand", "Model", "Serial", "Purchased", "Price", "Warranty End"],
            rows.map(function (i) {
              return [i.name, i.brand, i.model, i.serial, U.date(i.purchaseDate), i.purchasePrice ? U.currency(i.purchasePrice) : "", U.date(i.warrantyEnd)];
            })
          ));
        });
        if (!model.items.length) {
          html.push('<p class="r-empty">No inventory items recorded.</p>');
        }
      }

      if (all || type === "maintenance" || (type === "inventory" && opts.includeTasks)) {
        html.push("<h2>Maintenance Schedule</h2>" + table(
          ["Task", "For", "Schedule", "Next Due", "Last Done", "Assigned"],
          model.openTasks.map(function (t) {
            return [t.name, t.subject, t.scheduleLabel, U.date(t.nextDue) + (t.dueStatus === "overdue" ? " (overdue)" : ""), U.date(t.lastDone), t.assigneeName];
          })
        ));
      }

      if ((all || type === "maintenance") && opts.includeHistory) {
        var hist = APP.Exports.tableData("history", model);
        html.push("<h2>Maintenance History</h2>" + table(
          ["Date", "Task", "For", "By", "Cost", "Notes"],
          hist.map(function (h) { return [U.date(h.Date), h.Task, h.For, h["Completed By"], h.Cost ? U.currency(h.Cost, true) : "", h.Notes]; })
        ));
      }

      if (all || type === "warranties" || (opts.includeWarranties && type !== "projects")) {
        html.push("<h2>Warranties</h2>" + table(
          ["Item", "Location", "Provider", "Expires", "Status"],
          model.warranties.map(function (w) {
            var status = w.warrantyStatus === "expired" ? "Expired" : w.warrantyStatus === "expiring" ? "Expiring soon" : "Active";
            return [w.name, w.locationName, w.warrantyProvider || w.brand, U.date(w.warrantyEnd), status];
          })
        ));
      }

      if ((all || type === "inventory") && opts.includePaints) {
        html.push("<h2>Paint Colors</h2>" + table(
          ["Location", "Color", "Brand", "Code", "Finish", "Surface"],
          model.paints.map(function (p) {
            return [model.locationMap[p.locationId] ? model.locationMap[p.locationId].name : "", p.name, p.brand, p.code, p.finish, p.surface];
          })
        ));
      }

      if (all || type === "projects") {
        html.push("<h2>Projects</h2>" + table(
          ["Project", "Status", "Timeline", "Budget", "Spent", "Remaining"],
          model.projects.map(function (p) {
            return [p.name, p.status, U.monthYear(p.startDate) + " – " + U.monthYear(p.endDate), U.currency(p.budget), U.currency(p.spent), U.currency(p.remaining)];
          })
        ));

        if (opts.includeExpenses) {
          model.projects.forEach(function (p) {
            if (!p.expenses.length && !p.supplies.length) {
              return;
            }
            html.push("<h3>" + E(p.name) + "</h3>");
            if (p.expenses.length) {
              html.push(table(["Date", "Expense", "Vendor", "Amount"], U.sortBy(p.expenses, "date").map(function (e) {
                return [U.date(e.date), e.description, e.vendor, U.currency(e.amount, true)];
              })));
            }
            if (p.supplies.length) {
              html.push(table(["Supply", "Qty", "Unit Cost", "Store", "Purchased"], p.supplies.map(function (s) {
                return [s.name, s.qty, U.currency(s.cost, true), s.store, s.purchased ? "Yes" : "No"];
              })));
            }
          });
        }
      }

      html.push('<footer class="r-foot">HomeOps Planner · ' + E(model.home.name) + "</footer>");
      return html.join("");
    },

    print: function (model, opts) {
      APP.Reports.printHTML(APP.Reports.build(model, opts), APP.Utils.slugify(model.home.name) + "-" + opts.type + "-report-" + APP.Utils.todayISO());
    },

    printHTML: function (html, filename) {
      var root = APP.Dom.refs.printRoot;
      var previousTitle = document.title;
      root.innerHTML = '<article class="report">' + html + "</article>";
      document.title = filename;
      document.body.classList.add("printing-report");

      var cleanup = function () {
        document.body.classList.remove("printing-report");
        document.title = previousTitle;
        window.removeEventListener("afterprint", cleanup);
      };
      window.addEventListener("afterprint", cleanup);
      setTimeout(function () {
        window.print();
      }, 50);
    }
  };
}());
