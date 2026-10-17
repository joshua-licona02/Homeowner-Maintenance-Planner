(function () {
  "use strict";

  var E = function (v) { return APP.Utils.escapeHTML(v); };

  var FINISHES = ["Flat/Matte", "Eggshell", "Satin", "Semi-Gloss", "Gloss"];
  var SURFACES = ["Walls", "Trim", "Ceiling", "Doors", "Cabinets", "Accent Wall", "Exterior"];
  var STATUSES = ["Not Started", "In Progress", "On Hold", "Complete"];
  var ROLES = ["Owner", "Editor", "Viewer"];

  function opts(list) {
    return list.map(function (v) { return typeof v === "string" ? { value: v, label: v } : v; });
  }

  function locationOptions(blankLabel) {
    return [{ value: "", label: blankLabel || "None" }].concat(
      APP.State.data.locations.slice().sort(APP.Utils.byName).map(function (l) { return { value: l.id, label: l.name }; })
    );
  }

  function itemOptions() {
    var map = {};
    APP.State.data.locations.forEach(function (l) { map[l.id] = l.name; });
    return [{ value: "", label: "None (home / location task)" }].concat(
      APP.State.data.items.slice().sort(APP.Utils.byName).map(function (i) {
        return { value: i.id, label: i.name + (map[i.locationId] ? " — " + map[i.locationId] : "") };
      })
    );
  }

  function userOptions() {
    return [{ value: "", label: "Anyone" }].concat(APP.State.data.users.map(function (u) { return { value: u.id, label: u.name }; }));
  }

  // Field definitions per form. Sections mirror the grouped-list layout.
  var DEFS = {
    home: function () {
      return [
        { section: "Home", fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "address", label: "Address", type: "text" },
          { name: "yearBuilt", label: "Year Built", type: "number" },
          { name: "squareFeet", label: "Square Feet", type: "number" }
        ] },
        { section: "Notes", fields: [{ name: "notes", label: "Notes", type: "textarea" }] }
      ];
    },
    location: function () {
      return [
        { section: "Info", fields: [{ name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Kitchen" }] },
        { section: "Notes", fields: [{ name: "notes", label: "Notes", type: "textarea" }] }
      ];
    },
    item: function () {
      return [
        { section: "Info", fields: [
          { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Refrigerator" },
          { name: "category", label: "Icon / Type", type: "select", options: APP.Icons.categories },
          { name: "locationId", label: "Location", type: "select", options: locationOptions("Unassigned") }
        ] },
        { section: "Details", fields: [
          { name: "brand", label: "Brand", type: "text" },
          { name: "model", label: "Model", type: "text" },
          { name: "serial", label: "Serial Number", type: "text" }
        ] },
        { section: "Purchase Information", fields: [
          { name: "purchaseDate", label: "Date", type: "date" },
          { name: "purchasePrice", label: "Price", type: "money" },
          { name: "store", label: "Store / Installer", type: "text" }
        ] },
        { section: "Warranty", fields: [
          { name: "warrantyEnd", label: "Expires", type: "date" },
          { name: "warrantyProvider", label: "Provider", type: "text" }
        ] },
        { section: "Notes", fields: [{ name: "notes", label: "Notes", type: "textarea" }] }
      ];
    },
    paint: function () {
      return [
        { section: "Color", fields: [
          { name: "name", label: "Color Name", type: "text", required: true, placeholder: "e.g. Sage Green" },
          { name: "brand", label: "Brand", type: "text", placeholder: "e.g. Benjamin Moore" },
          { name: "code", label: "Color Code", type: "text" },
          { name: "hex", label: "Swatch", type: "color" }
        ] },
        { section: "Where", fields: [
          { name: "locationId", label: "Location", type: "select", options: locationOptions("Unassigned") },
          { name: "surface", label: "Surface", type: "select", options: opts(SURFACES) },
          { name: "finish", label: "Finish", type: "select", options: opts(FINISHES) }
        ] },
        { section: "Notes", fields: [{ name: "notes", label: "Notes", type: "textarea", placeholder: "Gallons left, where it's stored…" }] }
      ];
    },
    task: function () {
      return [
        { section: "Info", fields: [
          { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Tune-Up" },
          { name: "itemId", label: "Item", type: "select", options: itemOptions() },
          { name: "locationId", label: "Location", type: "select", options: locationOptions("Whole Home"), showWhen: "itemId=" }
        ] },
        { section: "When", fields: [
          { name: "scheduleType", label: "Type", type: "select", options: [{ value: "recurring", label: "On Calendar Schedule" }, { value: "once", label: "One Time" }] },
          { name: "intervalCount", label: "Every", type: "number", min: 1, showWhen: "scheduleType=recurring" },
          { name: "intervalUnit", label: "Unit", type: "select", options: [{ value: "day", label: "Day(s)" }, { value: "week", label: "Week(s)" }, { value: "month", label: "Month(s)" }, { value: "year", label: "Year(s)" }], showWhen: "scheduleType=recurring" },
          { name: "nextDue", label: "Next Due", type: "date", required: true },
          { name: "assigneeId", label: "Assigned To", type: "select", options: userOptions() }
        ] },
        { section: "Notes", fields: [{ name: "notes", label: "Notes", type: "textarea" }] }
      ];
    },
    complete: function () {
      return [
        { section: "Completion", fields: [
          { name: "date", label: "Date Done", type: "date", required: true },
          { name: "cost", label: "Cost", type: "money" },
          { name: "by", label: "Done By", type: "text" }
        ] },
        { section: "Notes", fields: [{ name: "note", label: "Notes", type: "textarea", placeholder: "Parts used, contractor, observations…" }] }
      ];
    },
    project: function () {
      return [
        { section: "Info", fields: [
          { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Bathroom Renovation" },
          { name: "status", label: "Status", type: "select", options: opts(STATUSES) },
          { name: "locationId", label: "Location", type: "select", options: locationOptions("Whole Home") }
        ] },
        { section: "Timeline", fields: [
          { name: "startDate", label: "Start Date", type: "date" },
          { name: "endDate", label: "End Date", type: "date" }
        ] },
        { section: "Budget", fields: [{ name: "budget", label: "Total", type: "money" }] },
        { section: "Notes", fields: [{ name: "notes", label: "Notes", type: "textarea" }] }
      ];
    },
    expense: function () {
      return [
        { section: "Expense", fields: [
          { name: "description", label: "Description", type: "text", required: true, placeholder: "e.g. Plumber deposit" },
          { name: "amount", label: "Amount", type: "money", required: true },
          { name: "date", label: "Date", type: "date", required: true },
          { name: "vendor", label: "Vendor", type: "text" }
        ] }
      ];
    },
    supply: function () {
      return [
        { section: "Supply", fields: [
          { name: "name", label: "Name", type: "text", required: true, placeholder: "e.g. Floor tile" },
          { name: "qty", label: "Quantity", type: "number", min: 0, step: "any" },
          { name: "cost", label: "Unit Cost", type: "money" },
          { name: "store", label: "Store", type: "text" },
          { name: "purchased", label: "Purchased", type: "toggle" }
        ] }
      ];
    },
    user: function () {
      return [
        { section: "Member", fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "email", label: "Email", type: "email" },
          { name: "role", label: "Role", type: "select", options: opts(ROLES) }
        ] }
      ];
    },
    report: function () {
      return [
        { section: "", fields: [{ name: "type", label: "Type", type: "select", options: APP.Reports.types }] },
        { section: "Settings", fields: [
          { name: "includeTasks", label: "Include Maintenance Tasks", type: "toggle", showWhen: "type=inventory" },
          { name: "includeWarranties", label: "Include Warranties", type: "toggle", showWhen: "type=inventory|maintenance" },
          { name: "includeHistory", label: "Include Maintenance History", type: "toggle", showWhen: "type=full|maintenance" },
          { name: "includePaints", label: "Include Paint Colors", type: "toggle", showWhen: "type=full|inventory" },
          { name: "includeExpenses", label: "Include Expenses & Supplies", type: "toggle", showWhen: "type=full|projects" }
        ] }
      ];
    }
  };

  var TITLES = {
    home: ["Home Details", "Home Details"], location: ["Add Location", "Edit Location"], item: ["Add Item", "Edit Item"],
    paint: ["Add Paint", "Edit Paint"], task: ["Add Maintenance Task", "Edit Maintenance Task"], complete: ["Mark Complete", "Mark Complete"],
    project: ["Add Project", "Edit Project"], expense: ["Add Expense", "Edit Expense"], supply: ["Add Supply", "Edit Supply"],
    user: ["Add User", "Edit User"], report: ["Create Report", "Create Report"]
  };

  function renderField(f, value) {
    var v = value === undefined || value === null ? "" : value;
    var show = f.showWhen ? ' data-show-when="' + E(f.showWhen) + '"' : "";
    var req = f.required ? " required" : "";
    var ph = f.placeholder ? ' placeholder="' + E(f.placeholder) + '"' : "";
    var id = "f-" + f.name;

    if (f.type === "textarea") {
      return '<div class="row row-stack"' + show + '><textarea id="' + id + '" name="' + f.name + '" rows="3" aria-label="' + E(f.label) + '"' + (ph || ' placeholder="' + E(f.label) + '"') + ">" + E(v) + "</textarea></div>";
    }

    if (f.type === "toggle") {
      return '<label class="row"' + show + ' for="' + id + '"><span class="row-label">' + E(f.label) + '</span>' +
        '<span class="switch"><input type="checkbox" id="' + id + '" name="' + f.name + '"' + (v ? " checked" : "") + '><span class="switch-track"></span></span></label>';
    }

    var control;
    if (f.type === "select") {
      control = '<select id="' + id + '" name="' + f.name + '">' + f.options.map(function (o) {
        return '<option value="' + E(o.value) + '"' + (String(o.value) === String(v) ? " selected" : "") + ">" + E(o.label) + "</option>";
      }).join("") + "</select>";
    } else if (f.type === "money") {
      control = '<span class="money-wrap"><span>$</span><input id="' + id + '" name="' + f.name + '" type="number" step="0.01" min="0" inputmode="decimal" value="' + E(v) + '"' + req + ph + "></span>";
    } else if (f.type === "color") {
      control = '<input id="' + id + '" name="' + f.name + '" type="color" value="' + E(v || "#d9d4c7") + '">';
    } else {
      control = '<input id="' + id + '" name="' + f.name + '" type="' + f.type + '" value="' + E(v) + '"' + req + ph +
        (f.min !== undefined ? ' min="' + f.min + '"' : "") + (f.step ? ' step="' + f.step + '"' : "") + ">";
    }

    return '<label class="row"' + show + ' for="' + id + '"><span class="row-label">' + E(f.label) + (f.required ? ' <i class="req">*</i>' : "") + "</span>" +
      '<span class="row-control">' + control + "</span></label>";
  }

  APP.Forms = {
    open: function (type, record, context) {
      var defs = DEFS[type]();
      var editing = !!(record && record.id);
      var values = record || {};
      var title = TITLES[type][editing ? 1 : 0];
      var submitLabel = type === "report" ? "Generate" : "";

      var body = defs.map(function (group) {
        return (group.section ? '<h4 class="group-title">' + E(group.section) + "</h4>" : "") +
          '<div class="group">' + group.fields.map(function (f) { return renderField(f, values[f.name]); }).join("") + "</div>";
      }).join("");

      var del = editing && context && context.deleteAction
        ? '<div class="group danger-group"><button type="button" class="row row-button text-danger" data-action="' + context.deleteAction + '" data-id="' + E(record.id) + '"' +
          (context.parentId ? ' data-parent="' + E(context.parentId) + '"' : "") + ">Delete</button></div>"
        : "";

      APP.State.ui.sheet = { type: type, id: values.id || "", context: context || {} };

      APP.Dom.openSheet(
        '<form data-form="' + type + '" novalidate>' +
        '<div class="sheet-head">' +
          '<button type="button" class="circle-btn" data-action="close-sheet" aria-label="Cancel">' + APP.Icons.svg("close") + "</button>" +
          (submitLabel
            ? '<button type="submit" class="pill-btn">' + submitLabel + "</button>"
            : '<button type="submit" class="circle-btn circle-primary" aria-label="Save">' + APP.Icons.svg("check") + "</button>") +
        "</div>" +
        '<h2 class="sheet-title">' + E(title) + "</h2>" +
        '<div class="sheet-body">' + body + del + "</div></form>"
      );

      APP.Forms.applyVisibility(APP.Dom.refs.sheetRoot.querySelector("form"));
    },

    applyVisibility: function (form) {
      if (!form) {
        return;
      }
      APP.Dom.queryAll("[data-show-when]", form).forEach(function (row) {
        var rule = row.getAttribute("data-show-when").split("=");
        var input = form.elements[rule[0]];
        var allowed = rule[1].split("|");
        var visible = input && allowed.indexOf(input.value) > -1;
        row.hidden = !visible;
      });
    },

    read: function (type, form) {
      var out = {};
      DEFS[type]().forEach(function (group) {
        group.fields.forEach(function (f) {
          var el = form.elements[f.name];
          if (!el) {
            return;
          }
          if (f.type === "toggle") {
            out[f.name] = el.checked;
          } else if (f.type === "money" || f.type === "number") {
            out[f.name] = el.value === "" ? "" : APP.Utils.safeNumber(el.value);
          } else {
            out[f.name] = String(el.value || "").trim();
          }
        });
      });
      return out;
    },

    validate: function (type, form) {
      var missing = [];
      DEFS[type]().forEach(function (group) {
        group.fields.forEach(function (f) {
          var el = form.elements[f.name];
          var row = el && el.closest(".row");
          if (f.required && el && !String(el.value).trim() && !(row && row.hidden)) {
            missing.push(f.label);
            if (row) {
              row.classList.add("is-invalid");
            }
          } else if (row) {
            row.classList.remove("is-invalid");
          }
        });
      });
      return missing;
    }
  };
}());
