(function () {
  "use strict";

  // Stroke icons on a 24x24 grid. Rendered with currentColor so they follow the theme.
  var paths = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
    locations: '<rect x="3" y="3" width="8" height="10" rx="2"/><rect x="13" y="3" width="8" height="6" rx="2"/><rect x="13" y="11" width="8" height="10" rx="2"/><rect x="3" y="15" width="8" height="6" rx="2"/>',
    inventory: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
    projects: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    report: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16.5 14.5A5 5 0 0 1 21.5 19"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.6-1.3-.6-2.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4c0-4.8-4-8.7-9-8.7z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7" r="1.2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
    printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    database: '<ellipse cx="12" cy="5.5" rx="8" ry="2.5"/><path d="M4 5.5v13c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-13M4 12c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    dollar: '<path d="M12 2v20M17 6.5C17 4.6 14.8 4 12 4S7 5 7 7.5 9.5 10.5 12 11s5 1.5 5 4-2.2 3.5-5 3.5-5-.8-5-2.8"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',

    // Inventory categories
    hvac: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="14" cy="12" r="4.5"/><path d="M14 7.5v9M9.5 12h9M6 8h0M6 12h0M6 16h0"/>',
    "water-heater": '<rect x="6" y="2.5" width="12" height="19" rx="6"/><circle cx="12" cy="8" r="2"/><path d="M9 17h6"/>',
    "water-softener": '<path d="M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M9 8v13M15 8v13M7 8V5h4v3M14 8V4h3v4"/>',
    fridge: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M5 10h14M8 5.5v2M8 13v3"/>',
    dishwasher: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M7 5.5h1M10 5.5h1"/><path d="M8 17c1-1 2-1 3 0s2 1 3 0 2-1 3 0" />',
    microwave: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><rect x="5" y="8" width="10" height="8" rx="1"/><path d="M18 8.5v1M18 12v1M18 15.5v.5"/>',
    oven: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M7 5.5h1M11 5.5h1M15 5.5h1"/><rect x="7" y="11" width="10" height="7" rx="1"/>',
    washer: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16M7 4.8h1M10 4.8h1"/><circle cx="12" cy="14" r="4.5"/><path d="M9.5 14.5c1 .8 2 .8 3 0s2-.8 3 0"/>',
    dryer: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16M7 4.8h1M10 4.8h1"/><circle cx="12" cy="14" r="4.5"/><path d="M11 12.5c.8.8-.8 2.2 0 3M13 12.5c.8.8-.8 2.2 0 3"/>',
    roof: '<path d="M2 12 12 4l10 8"/><path d="M5 10v10M19 10v10M9 20v-6h6v6M3 20h18"/>',
    electrical: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    plumbing: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    electronics: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    outdoor: '<path d="M12 22V12M12 12c-4 0-7-3-7-7 4 0 7 3 7 7zM12 14c3 0 6-2.5 6-6-3 0-6 2.5-6 6z"/>',
    garage: '<path d="M3 21V9l9-5 9 5v12"/><path d="M6 21v-9h12v9M6 15h12M6 18h12"/>',
    furniture: '<path d="M5 11V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v5H3zM5 18v2M19 18v2"/>',
    tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    appliance: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4"/><path d="M7 6h1M10 6h1"/>'
  };

  APP.Icons = {
    categories: [
      { value: "hvac", label: "HVAC / Heating & Cooling" },
      { value: "water-heater", label: "Water Heater" },
      { value: "water-softener", label: "Water Softener / Filter" },
      { value: "fridge", label: "Refrigerator / Freezer" },
      { value: "dishwasher", label: "Dishwasher" },
      { value: "microwave", label: "Microwave" },
      { value: "oven", label: "Oven / Range" },
      { value: "washer", label: "Washing Machine" },
      { value: "dryer", label: "Dryer" },
      { value: "roof", label: "Roof / Structure" },
      { value: "electrical", label: "Electrical" },
      { value: "plumbing", label: "Plumbing" },
      { value: "electronics", label: "Electronics" },
      { value: "outdoor", label: "Outdoor / Yard" },
      { value: "garage", label: "Garage / Door" },
      { value: "furniture", label: "Furniture" },
      { value: "tool", label: "Tools / Equipment" },
      { value: "appliance", label: "Other Appliance" }
    ],

    svg: function (name, extraClass) {
      return '<svg class="icon ' + (extraClass || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (paths[name] || paths.appliance) + "</svg>";
    },

    categoryLabel: function (value) {
      var match = APP.Icons.categories.filter(function (c) { return c.value === value; })[0];
      return match ? match.label : "Other Appliance";
    },

    guessCategory: function (text) {
      var t = String(text || "").toLowerCase();
      var rules = [
        ["hvac", /hvac|furnace|air cond|a\/c|heat pump|boiler|thermostat/],
        ["water-heater", /water heater|hot water/],
        ["water-softener", /soften|filtration|water filter/],
        ["fridge", /fridge|refrigerator|freezer/],
        ["dishwasher", /dishwasher/],
        ["microwave", /microwave/],
        ["oven", /oven|range|stove|cooktop/],
        ["washer", /washer|washing/],
        ["dryer", /dryer/],
        ["roof", /roof|gutter|siding|window/],
        ["electrical", /electric|panel|generator|breaker/],
        ["plumbing", /plumb|sump|pipe|toilet|faucet/],
        ["electronics", /tv|television|computer|router|electronic/],
        ["outdoor", /lawn|mower|sprinkler|irrigation|yard|deck/],
        ["garage", /garage/],
        ["furniture", /sofa|couch|furniture|bed|table/],
        ["tool", /tool|drill|saw/]
      ];
      for (var i = 0; i < rules.length; i += 1) {
        if (rules[i][1].test(t)) {
          return rules[i][0];
        }
      }
      return "appliance";
    }
  };
}());
