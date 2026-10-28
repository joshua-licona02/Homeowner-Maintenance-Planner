(function () {
  "use strict";

  /* Floor plan (bird's-eye layout drawn to scale in feet) and electrical panels.
     Data: floors[], rooms[], devices[] (outlets, switches, lights, appliances…), panels[] with nested breakers[].
     A device is wired to one breaker via device.breakerId; a subpanel is fed by panel.feedBreakerId. */

  var U = APP.Utils;
  var I = APP.Icons;
  var E = function (v) { return U.escapeHTML(v); };
  var D = function () { return APP.State.data; };

  var PALETTE = ["#007aff", "#ff9500", "#34c759", "#af52de", "#ff2d55", "#30b0c7", "#d4a400", "#a2845e", "#5856d6", "#ff3b30", "#00a896", "#7c9a2d"];

  var TYPES = {
    outlet: { label: "Outlet", plural: "outlets", tool: "Outlet" },
    gfci: { label: "GFCI Outlet", plural: "GFCI outlets", tool: "GFCI" },
    outlet240: { label: "240V Outlet", plural: "240V outlets", tool: "240V" },
    "switch": { label: "Switch", plural: "switches", tool: "Switch" },
    switch3: { label: "3-Way Switch", plural: "3-way switches", tool: "3-Way" },
    dimmer: { label: "Dimmer", plural: "dimmers", tool: "Dimmer" },
    light: { label: "Light Fixture", plural: "lights", tool: "Light" },
    fan: { label: "Ceiling / Exhaust Fan", plural: "fans", tool: "Fan" },
    smoke: { label: "Smoke / CO Detector", plural: "detectors", tool: "Detector" },
    other: { label: "Junction / Other", plural: "other", tool: "Junction" },
    appliance: { label: "Appliance", plural: "appliances", tool: "Appliance" }
  };
  var TYPE_ORDER = ["outlet", "gfci", "outlet240", "switch", "switch3", "dimmer", "light", "fan", "smoke", "other", "appliance"];

  var SIZES = [
    ["60-8", "60A · 8 spaces"], ["60-12", "60A · 12 spaces"], ["70-12", "70A · 12 spaces"],
    ["100-12", "100A · 12 spaces"], ["100-20", "100A · 20 spaces"], ["100-24", "100A · 24 spaces"],
    ["125-24", "125A · 24 spaces"], ["125-30", "125A · 30 spaces"], ["150-30", "150A · 30 spaces"],
    ["200-30", "200A · 30 spaces"], ["200-40", "200A · 40 spaces (most common)"], ["200-42", "200A · 42 spaces"],
    ["225-42", "225A · 42 spaces"], ["custom", "Custom size…"]
  ];
  var KINDS = [{ value: "main", label: "Main Breaker Panel" }, { value: "sub", label: "Subpanel" }, { value: "lug", label: "Main Lug Panel" }];
  var BRANDS = ["Square D QO", "Square D Homeline", "Eaton BR", "Eaton CH", "Siemens", "GE", "Leviton", "Murray", "Federal Pacific (FPE)", "Zinsco", "Other"];
  var AMPS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200];
  var BREAKER_TYPES = [
    { value: "standard", label: "Standard", tag: "" },
    { value: "gfci", label: "GFCI", tag: "GF" },
    { value: "afci", label: "AFCI", tag: "AF" },
    { value: "dual", label: "Dual Function (AFCI + GFCI)", tag: "DF" },
    { value: "tandem", label: "Tandem / Twin", tag: "TT" },
    { value: "surge", label: "Surge Protector", tag: "SP" }
  ];

  APP.State.ui.fp = { floorId: "", panelId: "", mode: "view", tool: "", sel: null, ppf: 0, labels: false, colors: true, scroll: null };

  function ui() { return APP.State.ui.fp; }

  function num(v, fallback) {
    var n = Number(v);
    return v === "" || v === null || v === undefined || isNaN(n) ? (fallback === undefined ? 0 : fallback) : n;
  }
  function snap(v, step) { return +(Math.round(v / step) * step).toFixed(2); }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }
  function f3(n) { return +Number(n).toFixed(3); }

  function fmtFt(v) {
    var total = Math.round(num(v) * 12);
    var inch = total % 12;
    return Math.floor(total / 12) + "'" + (inch ? " " + inch + '"' : "");
  }

  function currentFloor() {
    var d = D();
    var st = ui();
    var f = d.floors.filter(function (x) { return x.id === st.floorId; })[0] || d.floors[0] || null;
    st.floorId = f ? f.id : "";
    return f;
  }

  function currentPanel() {
    var d = D();
    var st = ui();
    var p = d.panels.filter(function (x) { return x.id === st.panelId; })[0] || d.panels[0] || null;
    st.panelId = p ? p.id : "";
    return p;
  }

  function sortedBreakers(p) {
    return p.breakers.slice().sort(function (a, b) { return num(a.slot) - num(b.slot); });
  }

  function slotLabel(b) {
    return Number(b.poles) === 2 ? b.slot + "/" + (num(b.slot) + 2) : String(b.slot);
  }

  function breakerType(value) {
    return BREAKER_TYPES.filter(function (t) { return t.value === value; })[0] || BREAKER_TYPES[0];
  }

  // Every breaker in every panel, with a stable display number and circuit color.
  function index() {
    var idx = { breakers: {}, list: [] };
    var n = 0;
    D().panels.forEach(function (p) {
      sortedBreakers(p).forEach(function (b) {
        var info = { b: b, p: p, color: PALETTE[n % PALETTE.length], num: slotLabel(b) };
        n += 1;
        idx.breakers[b.id] = info;
        idx.list.push(info);
      });
    });
    return idx;
  }

  function center(dev) {
    if (dev.type === "appliance") {
      return { x: num(dev.x) + num(dev.w, 2.5) / 2, y: num(dev.y) + num(dev.h, 2.5) / 2 };
    }
    return { x: num(dev.x), y: num(dev.y) };
  }

  function inRoom(pt, room) {
    var e = 0.01;
    return pt.x >= num(room.x) - e && pt.x <= num(room.x) + num(room.w) + e && pt.y >= num(room.y) - e && pt.y <= num(room.y) + num(room.h) + e;
  }

  function devicesInRoom(room) {
    return D().devices.filter(function (dev) { return dev.floorId === room.floorId && inRoom(center(dev), room); });
  }

  function roomOf(dev) {
    var pt = center(dev);
    return D().rooms.filter(function (r) { return r.floorId === dev.floorId && inRoom(pt, r); })[0] || null;
  }

  function itemFor(dev) {
    return dev.itemId ? APP.Core.find("items", dev.itemId) : null;
  }

  function deviceName(dev) {
    var item = itemFor(dev);
    return dev.label || (item ? item.name : "") || (TYPES[dev.type] || TYPES.other).label;
  }

  function breakerName(info) {
    return "#" + info.num + " · " + info.b.amps + "A" + (info.b.label ? " · " + info.b.label : "");
  }

  function validSel(sel) {
    if (!sel) {
      return null;
    }
    if (sel.kind === "unassigned") {
      return sel;
    }
    if (sel.kind === "breaker") {
      return index().breakers[sel.id] ? sel : null;
    }
    return APP.Core.find(sel.kind === "device" ? "devices" : "rooms", sel.id) ? sel : null;
  }

  // What lights up for the current selection: a breaker (and anything downstream of it), a device's circuit, or a room's circuits.
  function litFor(sel, idx) {
    var d = D();
    var out = { devices: {}, breakers: {}, panels: {}, rooms: {}, any: !!sel };
    if (!sel) {
      return out;
    }

    function mark(bid) {
      if (!bid || out.breakers[bid]) {
        return;
      }
      out.breakers[bid] = true;
      d.devices.forEach(function (dev) { if (dev.breakerId === bid) { out.devices[dev.id] = true; } });
      d.panels.forEach(function (p) {
        if (p.feedBreakerId === bid) {
          out.panels[p.id] = true;
          p.breakers.forEach(function (b) { mark(b.id); });
        }
      });
    }

    if (sel.kind === "breaker") {
      mark(sel.id);
    } else if (sel.kind === "device") {
      var dev = APP.Core.find("devices", sel.id);
      if (dev && idx.breakers[dev.breakerId]) {
        mark(dev.breakerId);
      }
      out.devices[sel.id] = true;
    } else if (sel.kind === "room") {
      var room = APP.Core.find("rooms", sel.id);
      out.rooms[sel.id] = true;
      devicesInRoom(room).forEach(function (x) {
        out.devices[x.id] = true;
        if (idx.breakers[x.breakerId]) {
          out.breakers[x.breakerId] = true;
        }
      });
    } else if (sel.kind === "unassigned") {
      d.devices.forEach(function (x) { if (!idx.breakers[x.breakerId]) { out.devices[x.id] = true; } });
    }

    if (sel.kind !== "room") {
      d.rooms.forEach(function (r) {
        if (devicesInRoom(r).some(function (x) { return out.devices[x.id]; })) {
          out.rooms[r.id] = true;
        }
      });
    }
    return out;
  }

  function countSummary(devs) {
    var counts = {};
    devs.forEach(function (dev) { counts[dev.type] = (counts[dev.type] || 0) + 1; });
    return TYPE_ORDER.filter(function (t) { return counts[t]; }).map(function (t) {
      return counts[t] + " " + (counts[t] === 1 ? TYPES[t].label.toLowerCase().split(" / ")[0] : TYPES[t].plural);
    }).join(" · ");
  }

  // ---------- symbols ----------

  function shape(type, r) {
    function t(s, k) {
      var fs = f3(r * (k || 1.1));
      return '<text class="fp-sym-t" font-size="' + fs + '" y="' + f3(fs * 0.36) + '">' + s + "</text>";
    }
    var c = '<circle class="fp-sym-s" r="' + f3(r) + '"/>';
    var sq = '<rect class="fp-sym-s" x="' + f3(-r) + '" y="' + f3(-r) + '" width="' + f3(2 * r) + '" height="' + f3(2 * r) + '" rx="' + f3(r * 0.35) + '"/>';
    var k = f3(r * 0.6);

    switch (type) {
      case "outlet":
        return c + '<path class="fp-sym-l" d="M' + f3(-r * 0.32) + " " + f3(-r * 0.45) + "v" + f3(r * 0.9) + "M" + f3(r * 0.32) + " " + f3(-r * 0.45) + "v" + f3(r * 0.9) + '"/>';
      case "gfci": return c + t("G");
      case "outlet240": return c + t("240", 0.62);
      case "switch": return sq + t("S");
      case "switch3": return sq + t("S3", 0.85);
      case "dimmer": return sq + t("D");
      case "light": return c + '<path class="fp-sym-l" d="M' + -k + " " + -k + "L" + k + " " + k + "M" + k + " " + -k + "L" + -k + " " + k + '"/>';
      case "fan": return c + t("F");
      case "smoke": return c + t("SD", 0.75);
      default:
        return '<path class="fp-sym-s" d="M0 ' + f3(-r) + "L" + f3(r) + " 0L0 " + f3(r) + "L" + f3(-r) + ' 0Z"/>' + t("J", 0.9);
    }
  }

  function symbolIcon(type, color) {
    if (type === "appliance") {
      return '<span class="fp-ico-wrap" style="--c:' + (color || "var(--accent)") + '">' + I.svg("appliance") + "</span>";
    }
    if (type === "room") {
      return '<svg class="fp-sym-ico" viewBox="-12 -12 24 24" aria-hidden="true"><rect class="fp-tool-room" x="-9" y="-8" width="18" height="16" rx="1.5"/></svg>';
    }
    if (type === "panel") {
      return '<span class="fp-ico-wrap" style="--c:var(--accent)">' + I.svg("electrical") + "</span>";
    }
    return '<svg class="fp-sym-ico fp-sym" viewBox="-12 -12 24 24" style="--c:' + (color || "var(--text)") + '" aria-hidden="true">' + shape(type, 9.5) + "</svg>";
  }

  // ---------- plan (SVG, 1 unit = 1 foot) ----------

  function planSVG(floor, idx, lit, st) {
    var d = D();
    var ppf = st.ppf || 16;
    var px = function (n) { return f3(n / ppf); };
    var W = num(floor.width, 40);
    var H = num(floor.depth, 30);
    var pad = px(30);
    var vb = [-pad, -pad, W + pad * 2, H + pad * 2 + px(24)];
    var arrange = st.mode === "arrange" && APP.Core.canEdit();
    var sel = st.sel;
    var out = [];

    function txt(x, y, s, cls, size, extra) {
      return '<text x="' + f3(x) + '" y="' + f3(y) + '" font-size="' + size + '" stroke-width="' + px(3) + '" class="' + cls + '"' + (extra || "") + ">" + E(s) + "</text>";
    }
    function handle(w, h) {
      var s = px(14);
      return '<rect class="fp-handle" data-fp-handle x="' + f3(w - s) + '" y="' + f3(h - s) + '" width="' + s + '" height="' + s + '" rx="' + px(3) + '"/>';
    }
    function colorFor(dev) {
      var info = idx.breakers[dev.breakerId];
      return info ? (st.colors ? info.color : "var(--text)") : "var(--muted)";
    }
    function cls(dev) {
      return (lit.devices[dev.id] ? " is-lit" : "") + (sel && sel.kind === "device" && sel.id === dev.id ? " is-sel" : "") + (idx.breakers[dev.breakerId] ? "" : " is-un");
    }
    function title(dev) {
      var info = idx.breakers[dev.breakerId];
      return "<title>" + E(deviceName(dev) + " — " + (info ? breakerName(info) : "no breaker assigned")) + "</title>";
    }

    out.push('<defs><pattern id="fp-grid" width="1" height="1" patternUnits="userSpaceOnUse"><path d="M1 0H0V1" fill="none" class="fp-grid-minor" stroke-width="' + px(1) + '"/></pattern>' +
      '<pattern id="fp-grid5" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" class="fp-grid-major" stroke-width="' + px(1) + '"/></pattern></defs>');
    out.push('<rect class="fp-floor" x="0" y="0" width="' + W + '" height="' + H + '"/>');
    out.push('<rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#fp-grid)" pointer-events="none"/><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#fp-grid5)" pointer-events="none"/>');
    out.push(txt(W / 2, -px(10), fmtFt(W), "fp-dim-t", px(11)));
    out.push(txt(-px(10), H / 2, fmtFt(H), "fp-dim-t", px(11), ' transform="rotate(-90 ' + f3(-px(10)) + " " + f3(H / 2) + ')"'));

    var roomLabels = [];
    d.rooms.filter(function (r) { return r.floorId === floor.id; }).forEach(function (r) {
      var w = num(r.w, 1);
      var h = num(r.h, 1);
      var big = w * ppf > 70 && h * ppf > 40;
      out.push('<g class="fp-room' + (lit.rooms[r.id] ? " is-lit" : "") + (sel && sel.kind === "room" && sel.id === r.id ? " is-sel" : "") + '" data-fp-kind="room" data-fp-id="' + r.id + '" transform="translate(' + num(r.x) + " " + num(r.y) + ')">' +
        "<title>" + E(r.name + " — " + fmtFt(w) + " × " + fmtFt(h)) + "</title>" +
        '<rect class="fp-room-r" width="' + w + '" height="' + h + '"/>' +
        (arrange ? handle(w, h) : "") + "</g>");
      // Names sit on top of everything so appliances along the wall never hide them; shortened when the room is too narrow.
      var fit = Math.max(3, Math.floor((w * ppf - 6) / 7));
      var name = r.name.length > fit ? r.name.slice(0, fit - 1) + "…" : r.name;
      roomLabels.push('<g class="fp-room-label" data-fp-label="' + r.id + '" transform="translate(' + num(r.x) + " " + num(r.y) + ')">' +
        txt(w / 2, Math.max(px(16), h * 0.3), name, "fp-room-name", px(12)) +
        (big ? txt(w / 2, Math.max(px(16), h * 0.3) + px(13), fmtFt(w) + " × " + fmtFt(h), "fp-room-dim", px(10)) : "") + "</g>");
    });

    var devs = d.devices.filter(function (x) { return x.floorId === floor.id; });

    devs.filter(function (x) { return x.type === "appliance"; }).forEach(function (dev) {
      var w = num(dev.w, 2.5);
      var h = num(dev.h, 2.5);
      var item = itemFor(dev);
      var s = Math.min(w, h, px(30)) * 0.6;
      var showLabel = st.labels || lit.devices[dev.id] || w * ppf > 70;
      out.push('<g class="fp-dev fp-appl' + cls(dev) + '" style="--c:' + colorFor(dev) + '" data-fp-kind="device" data-fp-id="' + dev.id + '" transform="translate(' + num(dev.x) + " " + num(dev.y) + ')">' + title(dev) +
        '<rect class="fp-appl-r" width="' + w + '" height="' + h + '" rx="' + px(4) + '"/>' +
        '<svg class="fp-ico" x="' + f3((w - s) / 2) + '" y="' + f3((h - s) / 2) + '" width="' + f3(s) + '" height="' + f3(s) + '" viewBox="0 0 24 24">' + I.inner(item ? item.category : I.guessCategory(dev.label)) + "</svg>" +
        (showLabel ? txt(w / 2, h + px(12), deviceName(dev), "fp-tag", px(10)) : "") +
        (arrange ? handle(w, h) : "") + "</g>");
    });

    d.panels.filter(function (p) { return p.floorId === floor.id; }).forEach(function (p) {
      var on = lit.panels[p.id] || p.id === st.panelId;
      out.push('<g class="fp-pm' + (lit.panels[p.id] ? " is-lit" : "") + (on ? " is-current" : "") + '" data-fp-kind="panel" data-fp-id="' + p.id + '" transform="translate(' + num(p.x) + " " + num(p.y) + ')">' +
        "<title>" + E(p.name) + "</title>" +
        '<rect class="fp-pm-r" x="' + -px(15) + '" y="' + -px(10) + '" width="' + px(30) + '" height="' + px(20) + '" rx="' + px(3) + '"/>' +
        '<svg class="fp-pm-ico" x="' + -px(7) + '" y="' + -px(7) + '" width="' + px(14) + '" height="' + px(14) + '" viewBox="0 0 24 24">' + I.inner("electrical") + "</svg>" +
        txt(0, px(22), p.name, "fp-tag", px(10)) + "</g>");
    });

    // Symbols shrink a little when zoomed far out so a whole floor stays readable on a phone.
    var r = px(clamp(ppf * 0.75, 6, 10));
    devs.filter(function (x) { return x.type !== "appliance"; }).forEach(function (dev) {
      var showLabel = st.labels || lit.devices[dev.id];
      out.push('<g class="fp-dev fp-sym' + cls(dev) + '" style="--c:' + colorFor(dev) + '" data-fp-kind="device" data-fp-id="' + dev.id + '" transform="translate(' + num(dev.x) + " " + num(dev.y) + ')">' + title(dev) +
        '<circle class="fp-hit" r="' + f3(r * 1.6) + '"/>' +
        (lit.devices[dev.id] ? '<circle class="fp-halo" r="' + f3(r * 1.9) + '"/>' : "") +
        (sel && sel.kind === "device" && sel.id === dev.id ? '<circle class="fp-selring" r="' + f3(r * 1.55) + '"/>' : "") +
        shape(dev.type, r) +
        (showLabel ? txt(0, r + px(12), deviceName(dev), "fp-tag", px(10)) : "") + "</g>");
    });

    out.push('<g pointer-events="none">' + roomLabels.join("") + "</g>");

    // Scale bar
    var L = [1, 2, 5, 10, 20, 50].filter(function (n) { return n * ppf >= 70; })[0] || 50;
    var sy = H + px(26);
    out.push('<g class="fp-scale" pointer-events="none"><path d="M0 ' + f3(sy - px(5)) + "V" + f3(sy) + "H" + L + "V" + f3(sy - px(5)) + '"/>' +
      txt(L + px(8), sy, L + " ft  ·  grid squares are 1 ft", "fp-scale-t", px(11)) + "</g>");

    return '<svg class="fp-svg mode-' + st.mode + (lit.any ? " has-sel" : "") + (st.tool ? " has-tool" : "") + '" data-fp-svg viewBox="' + vb.map(f3).join(" ") + '" width="' + Math.round(vb[2] * ppf) + '" height="' + Math.round(vb[3] * ppf) +
      '" role="img" aria-label="' + E(floor.name) + ' floor plan">' + out.join("") + "</svg>";
  }

  // ---------- electrical panel ----------

  function panelHTML(p, idx, lit) {
    var can = APP.Core.canEdit();
    var spaces = Math.max(2, num(p.spaces, 20));
    spaces += spaces % 2;
    var rows = spaces / 2;
    var at = {};
    var used = 0;
    var outside = [];

    p.breakers.forEach(function (b) {
      var s = num(b.slot);
      var two = Number(b.poles) === 2;
      if (s < 1 || s + (two ? 2 : 0) > spaces) {
        outside.push(b);
        return;
      }
      at[s] = b;
      used += two ? 2 : 1;
      if (two) {
        at[s + 2] = "covered";
      }
    });

    var cells = [];
    for (var r = 1; r <= rows; r += 1) {
      cells.push('<span class="fp-num" style="grid-column:1;grid-row:' + r + '">' + (2 * r - 1) + "</span>");
      cells.push('<span class="fp-num" style="grid-column:4;grid-row:' + r + '">' + (2 * r) + "</span>");
    }

    for (var s = 1; s <= spaces; s += 1) {
      var b = at[s];
      var col = s % 2 ? 2 : 3;
      var row = Math.ceil(s / 2);
      if (b === "covered") {
        continue;
      }
      if (!b) {
        cells.push(can
          ? '<button type="button" class="fp-slot" style="grid-column:' + col + ";grid-row:" + row + '" data-action="fp-slot" data-id="' + s + '" title="Add breaker in slot ' + s + '" aria-label="Add breaker in slot ' + s + '"><span>+</span></button>'
          : '<span class="fp-slot" style="grid-column:' + col + ";grid-row:" + row + '"></span>');
        continue;
      }
      var info = idx.breakers[b.id];
      var two = Number(b.poles) === 2;
      var tag = breakerType(b.type).tag;
      var feeds = D().panels.filter(function (x) { return x.feedBreakerId === b.id; })[0];
      var state = lit.breakers[b.id] ? " is-lit" : lit.any ? " is-dim" : "";
      cells.push('<button type="button" class="fp-brk ' + (col === 2 ? "side-l" : "side-r") + (two ? " is-2p" : "") + state + '" style="grid-column:' + col + ";grid-row:" + row + " / span " + (two ? 2 : 1) + ";--c:" + info.color + '" data-action="fp-breaker" data-id="' + b.id + '" title="' + E(breakerName(info)) + '">' +
        '<span class="fp-brk-label">' + E(b.label || (feeds ? "→ " + feeds.name : "Unlabeled")) + "</span>" +
        '<span class="fp-brk-handle"><b>' + E(b.amps) + "</b>" + (tag ? "<small>" + tag + "</small>" : "") + "</span></button>");
    }

    var kind = KINDS.filter(function (k) { return k.value === p.kind; })[0] || KINDS[0];
    var feed = idx.breakers[p.feedBreakerId];
    var main = p.kind === "main"
      ? '<div class="fp-main"><span>MAIN</span><b>' + E(p.amps) + "A</b></div>"
      : '<div class="fp-main fp-main-lug"><span>' + (p.kind === "lug" ? "MAIN LUGS" : "SUBPANEL") + " · " + E(p.amps) + "A</span>" +
        (feed ? '<button type="button" class="fp-feed" data-action="fp-breaker" data-id="' + feed.b.id + '">Fed from ' + E(feed.p.name) + " #" + E(feed.num) + "</button>" : "") + "</div>";
    var risky = /Federal Pacific|Zinsco/.test(p.brand || "");

    return '<section class="fp-panel-card">' +
      '<div class="fp-panel-head"><div><h3>' + E(p.name) + "</h3><p>" + E([kind.label, p.brand, p.model].filter(Boolean).join(" · ")) + "</p></div>" +
        (can ? '<button type="button" class="icon-btn accent" data-action="fp-edit-panel" data-id="' + p.id + '" aria-label="Edit panel" title="Edit panel">' + I.svg("edit") + "</button>" : "") + "</div>" +
      '<div class="fp-panel' + (lit.panels[p.id] ? " is-lit" : "") + '">' + main +
        '<div class="fp-grid" style="grid-template-rows:repeat(' + rows + ',30px)">' + cells.join("") + "</div></div>" +
      '<div class="fp-panel-foot"><span>' + used + " of " + spaces + " spaces used · " + E(p.amps) + "A</span>" +
        '<button type="button" class="pill-btn pill-light fp-small" data-action="fp-print-panel" data-id="' + p.id + '">' + I.svg("printer") + "Print Directory</button></div>" +
      (outside.length ? '<p class="fp-warn">' + outside.length + " breaker(s) sit outside this panel's " + spaces + " spaces. Edit the panel size or move them.</p>" : "") +
      (risky ? '<p class="fp-warn">' + E(p.brand) + " panels have a history of breakers that may not trip. Consider having an electrician inspect it.</p>" : "") +
      "</section>";
  }

  // ---------- side card: what's selected ----------

  function devRow(dev, idx, st) {
    var info = idx.breakers[dev.breakerId];
    var room = roomOf(dev);
    var color = info ? (st.colors ? info.color : "var(--text)") : "var(--muted)";
    return '<button type="button" class="row row-link" data-action="fp-device" data-id="' + dev.id + '"><span class="row-icon">' + symbolIcon(dev.type, color) + "</span>" +
      '<span class="row-main"><strong>' + E(deviceName(dev)) + '</strong><span class="muted">' + E([(TYPES[dev.type] || TYPES.other).label, room ? room.name : ""].filter(Boolean).join(" · ")) + "</span></span>" +
      I.svg("chevron", "chev") + "</button>";
  }

  function brkRow(info, aside) {
    return '<button type="button" class="row row-link" data-action="fp-breaker" data-id="' + info.b.id + '"><span class="fp-swatch" style="--c:' + info.color + '"></span>' +
      '<span class="row-main"><strong>#' + E(info.num) + " · " + E(info.b.label || "Unlabeled") + '</strong><span class="muted">' + E(info.p.name + " · " + info.b.amps + "A") + "</span></span>" +
      (aside ? '<span class="row-aside">' + E(aside) + "</span>" : "") + I.svg("chevron", "chev") + "</button>";
  }

  function grp(title, rows, foot) {
    return '<section class="group-wrap">' + (title ? '<h4 class="group-title">' + title + "</h4>" : "") + '<div class="group">' + rows + "</div>" + (foot ? '<p class="group-foot">' + foot + "</p>" : "") + "</section>";
  }

  function byFloor(devs, idx, st) {
    var floor = currentFloor();
    return D().floors.map(function (f) {
      var list = devs.filter(function (x) { return x.floorId === f.id; });
      if (!list.length) {
        return "";
      }
      var other = f.id !== floor.id ? ' <button type="button" class="fp-link" data-action="fp-floor" data-id="' + f.id + '">Show</button>' : "";
      return grp(E(f.name) + other, list.map(function (x) { return devRow(x, idx, st); }).join(""));
    }).join("");
  }

  function selectionHTML(idx, lit, st) {
    var d = D();
    var sel = st.sel;
    var can = APP.Core.canEdit();
    var unassigned = d.devices.filter(function (x) { return !idx.breakers[x.breakerId]; });

    if (!sel) {
      return '<div class="fp-hint-card"><strong>Tap a breaker</strong> to light up every outlet, switch, and light on that circuit. Tap a room or device on the plan to see which breakers feed it.' +
        (unassigned.length ? '<button type="button" class="fp-link" data-action="fp-unassigned">' + unassigned.length + " device" + (unassigned.length === 1 ? "" : "s") + " not on a breaker yet</button>" : "") + "</div>";
    }

    var close = '<button type="button" class="icon-btn" data-action="fp-clear" aria-label="Clear selection">' + I.svg("close") + "</button>";

    if (sel.kind === "breaker") {
      var info = idx.breakers[sel.id];
      var b = info.b;
      var direct = d.devices.filter(function (x) { return x.breakerId === b.id; });
      var fed = d.panels.filter(function (p) { return p.feedBreakerId === b.id; });
      var rooms = d.rooms.filter(function (r) { return devicesInRoom(r).some(function (x) { return x.breakerId === b.id; }); }).map(function (r) { return r.name; });
      return '<div class="fp-sel-head" style="--c:' + info.color + '"><span class="fp-swatch fp-swatch-lg"></span><div><small>' + E(info.p.name) + " · Slot " + E(info.num) + "</small><h3>" + E(b.label || "Unlabeled breaker") + "</h3>" +
          "<p>" + E([b.amps + "A", Number(b.poles) === 2 ? "Double-pole 240V" : "Single-pole 120V", breakerType(b.type).value !== "standard" ? breakerType(b.type).label : ""].filter(Boolean).join(" · ")) + "</p></div>" + close + "</div>" +
        (direct.length ? '<p class="fp-sum">' + E(countSummary(direct)) + (rooms.length ? "<br><span class=\"muted\">" + E(rooms.join(", ")) + "</span>" : "") + "</p>" : "") +
        fed.map(function (p) {
          return grp("Feeds", '<button type="button" class="row row-link" data-action="fp-panel" data-id="' + p.id + '"><span class="row-icon accent">' + I.svg("electrical") + '</span><span class="row-main"><strong>' + E(p.name) + '</strong><span class="muted">' + p.breakers.length + " breaker" + (p.breakers.length === 1 ? "" : "s") + " — all lit on the plan</span></span>" + I.svg("chevron", "chev") + "</button>");
        }).join("") +
        (byFloor(direct, idx, st) || '<div class="fp-hint-card">Nothing is mapped to this breaker yet.' + (can ? " Switch to <strong>Wire</strong> and tap devices on the plan to connect them." : "") + "</div>") +
        (b.notes ? grp("Notes", '<div class="row notes">' + E(b.notes) + "</div>") : "") +
        (can ? '<div class="fp-actions"><button type="button" class="pill-btn pill-light" data-action="fp-edit-breaker" data-id="' + b.id + '">Edit Breaker</button>' +
          (st.mode !== "wire" ? '<button type="button" class="pill-btn" data-action="fp-mode" data-id="wire">Wire Devices</button>' : "") + "</div>" : "");
    }

    if (sel.kind === "device") {
      var dev = APP.Core.find("devices", sel.id);
      var di = idx.breakers[dev.breakerId];
      var room = roomOf(dev);
      var item = itemFor(dev);
      var siblings = di ? d.devices.filter(function (x) { return x.breakerId === dev.breakerId && x.id !== dev.id; }) : [];
      return '<div class="fp-sel-head" style="--c:' + (di ? di.color : "var(--muted)") + '"><span class="row-icon">' + symbolIcon(dev.type, di ? di.color : "var(--muted)") + "</span><div><small>" + E((TYPES[dev.type] || TYPES.other).label) + (room ? " · " + E(room.name) : "") + "</small><h3>" + E(deviceName(dev)) + "</h3></div>" + close + "</div>" +
        grp("Breaker", di ? brkRow(di) : '<div class="row row-empty">Not assigned to a breaker yet.</div>') +
        (item ? grp("Inventory", '<a class="row row-link" href="#/inventory/' + item.id + '"><span class="row-icon accent">' + I.svg(item.category) + '</span><span class="row-label">' + E(item.name) + "</span>" + I.svg("chevron", "chev") + "</a>") : "") +
        (siblings.length ? grp("Also on this breaker", siblings.map(function (x) { return devRow(x, idx, st); }).join("")) : "") +
        (dev.notes ? grp("Notes", '<div class="row notes">' + E(dev.notes) + "</div>") : "") +
        (can ? '<div class="fp-actions"><button type="button" class="pill-btn pill-light" data-action="fp-edit-device" data-id="' + dev.id + '">Edit Device</button></div>' : "");
    }

    if (sel.kind === "room") {
      var rm = APP.Core.find("rooms", sel.id);
      var inside = devicesInRoom(rm);
      var loc = rm.locationId ? APP.Core.find("locations", rm.locationId) : null;
      var feeding = idx.list.filter(function (x) { return lit.breakers[x.b.id]; });
      return '<div class="fp-sel-head"><span class="row-icon accent">' + I.svg("locations") + "</span><div><small>Room · " + fmtFt(rm.w) + " × " + fmtFt(rm.h) + " · " + Math.round(num(rm.w) * num(rm.h)) + " sq ft</small><h3>" + E(rm.name) + "</h3></div>" + close + "</div>" +
        (inside.length ? '<p class="fp-sum">' + E(countSummary(inside)) + "</p>" : "") +
        grp("Fed by", feeding.map(function (x) {
          var n = inside.filter(function (dv) { return dv.breakerId === x.b.id; }).length;
          return brkRow(x, n + " here");
        }).join("") || '<div class="row row-empty">No breakers mapped to this room yet.</div>') +
        (loc ? grp("Location", '<a class="row row-link" href="#/locations/' + loc.id + '"><span class="row-icon accent">' + I.svg("locations") + '</span><span class="row-label">' + E(loc.name) + "</span>" + I.svg("chevron", "chev") + "</a>") : "") +
        (can ? '<div class="fp-actions"><button type="button" class="pill-btn pill-light" data-action="fp-edit-room" data-id="' + rm.id + '">Edit Room</button></div>' : "");
    }

    return '<div class="fp-sel-head"><span class="fp-swatch fp-swatch-lg" style="--c:var(--muted)"></span><div><small>Needs mapping</small><h3>Not on a breaker</h3></div>' + close + "</div>" +
      (byFloor(unassigned, idx, st) || '<div class="fp-hint-card">Every device is assigned to a breaker. Nice work.</div>');
  }

  // One line above the plan so the answer is visible without scrolling.
  function summaryLine(sel, idx, lit) {
    var d = D();
    var sw = function (c) { return '<span class="fp-swatch fp-swatch-inline" style="--c:' + c + '"></span>'; };
    if (sel.kind === "breaker") {
      var info = idx.breakers[sel.id];
      var devs = d.devices.filter(function (x) { return lit.devices[x.id]; });
      var rooms = d.rooms.filter(function (r) { return lit.rooms[r.id]; }).map(function (r) { return r.name; });
      return sw(info.color) + "<b>" + E(breakerName(info)) + "</b> " + (devs.length ? "powers " + E(countSummary(devs)) + (rooms.length ? " in " + E(rooms.join(", ")) : "") + "." : "has nothing mapped to it yet.");
    }
    if (sel.kind === "device") {
      var dev = APP.Core.find("devices", sel.id);
      var di = idx.breakers[dev.breakerId];
      var others = di ? d.devices.filter(function (x) { return x.breakerId === dev.breakerId && x.id !== dev.id; }).length : 0;
      return di
        ? sw(di.color) + "<b>" + E(deviceName(dev)) + "</b> is on <b>" + E(breakerName(di)) + "</b>" + (others ? " with " + others + " other device" + (others === 1 ? "" : "s") : "") + "."
        : "<b>" + E(deviceName(dev)) + "</b> isn't mapped to a breaker yet.";
    }
    if (sel.kind === "room") {
      var room = APP.Core.find("rooms", sel.id);
      var feeding = idx.list.filter(function (x) { return lit.breakers[x.b.id]; });
      return "<b>" + E(room.name) + "</b> " + (feeding.length ? "is fed by " + feeding.length + " breaker" + (feeding.length === 1 ? "" : "s") + ": " + feeding.map(function (x) { return sw(x.color) + "#" + E(x.num); }).join(" ") + "." : "has no mapped breakers yet.");
    }
    var n = d.devices.filter(function (x) { return lit.devices[x.id]; }).length;
    return "<b>" + n + " device" + (n === 1 ? "" : "s") + "</b> " + (n === 1 ? "isn't" : "aren't") + " mapped to a breaker yet.";
  }

  // ---------- page ----------

  function chip(action, id, label, active, extra) {
    return '<button type="button" class="chip' + (active ? " is-active" : "") + '" data-action="' + action + '"' + (id !== "" ? ' data-id="' + E(id) + '"' : "") + (extra || "") + ">" + label + "</button>";
  }

  function shell(body, sub, actions) {
    return '<div class="page page-fp"><div class="page-head"><a class="circle-btn" href="#/locations" aria-label="Back">' + I.svg("back") + "</a>" +
      '<div class="head-actions">' + (actions || "") + "</div></div>" +
      '<h1 class="large-title">Floor Plan</h1>' + (sub ? '<p class="page-sub">' + sub + "</p>" : "") + body + "</div>";
  }

  APP.FloorPlan = {
    types: TYPES,
    drag: null,

    view: function () {
      var d = D();
      var st = ui();
      var can = APP.Core.canEdit();

      if (!can) {
        st.mode = "view";
        st.tool = "";
      }

      var floor = currentFloor();
      if (!floor) {
        return shell('<div class="empty-card fp-empty">' + I.svg("plan", "tile-icon") +
          "<p>Draw your home to scale: rooms, appliances, outlets, switches, and lights. Add your electrical panel and map each breaker to what it powers.</p>" +
          (can ? '<div class="fp-actions fp-center"><button type="button" class="pill-btn" data-action="fp-add-floor">Add a Floor</button><button type="button" class="pill-btn pill-light" data-action="fp-sample">Start From a Sample Layout</button></div>' : "") +
          "</div>");
      }

      st.sel = validSel(st.sel);
      var idx = index();
      var lit = litFor(st.sel, idx);
      var panel = currentPanel();
      var area = Math.round(num(floor.width) * num(floor.depth));

      var floors = '<div class="fp-bar">' + d.floors.map(function (f) { return chip("fp-floor", f.id, E(f.name), f.id === floor.id); }).join("") +
        (can ? chip("fp-add-floor", "", I.svg("plus") + "Floor", false, ' title="Add floor"') : "") + "</div>";

      var modes = can ? '<div class="segmented fp-modes" role="tablist">' + [["view", "View"], ["arrange", "Arrange"], ["wire", "Wire"]].map(function (m) {
        return '<button type="button" role="tab" aria-selected="' + (st.mode === m[0]) + '" class="' + (st.mode === m[0] ? "is-active" : "") + '" data-action="fp-mode" data-id="' + m[0] + '">' + m[1] + "</button>";
      }).join("") + "</div>" : "";

      var view = '<div class="fp-bar">' + chip("fp-zoom", "out", "−", false, ' aria-label="Zoom out" title="Zoom out"') + chip("fp-zoom", "fit", "Fit", false, ' title="Fit to screen"') +
        chip("fp-zoom", "in", "+", false, ' aria-label="Zoom in" title="Zoom in"') +
        chip("fp-labels", "", "Labels", st.labels) + chip("fp-colors", "", "Circuit Colors", st.colors) + "</div>";

      var selInfo = st.sel && st.sel.kind === "breaker" ? idx.breakers[st.sel.id] : null;
      var hint = "";
      var tools = "";
      if (st.mode === "arrange") {
        tools = '<div class="fp-bar fp-tools">' + ["room"].concat(TYPE_ORDER, ["panel"]).map(function (t) {
          var label = t === "room" ? "Room" : t === "panel" ? "Panel" : TYPES[t].tool;
          return chip("fp-tool", t, symbolIcon(t) + label, st.tool === t);
        }).join("") + "</div>";
        hint = st.tool
          ? "Tap the plan to place " + (st.tool === "room" ? "a room" : st.tool === "panel" ? "a panel" : (/^[aeio]/i.test(TYPES[st.tool].label) ? "an " : "a ") + TYPES[st.tool].label.replace(/^(?!GFCI)\w/, function (c) { return c.toLowerCase(); })) + ". Tap the tool again or press Esc to stop." +
            (selInfo && st.tool !== "room" && st.tool !== "panel" ? " New devices connect to <b>" + E(breakerName(selInfo)) + "</b>." : "")
          : "Drag rooms and devices to move them (devices inside a room move with it). Drag the corner handle to resize. Tap anything to edit exact sizes.";
      } else if (st.mode === "wire") {
        hint = selInfo
          ? "Connecting to <b>" + E(breakerName(selInfo)) + "</b> — tap devices to connect or disconnect them."
          : "Pick a breaker in the panel, then tap outlets, switches, and lights to connect them to it.";
      } else if (st.sel) {
        hint = summaryLine(st.sel, idx, lit);
      }

      var canvas = '<div class="fp-canvas">' + planSVG(floor, idx, lit, st) + "</div>";
      var legend = '<div class="fp-legend">' + TYPE_ORDER.filter(function (t) { return t !== "appliance"; }).map(function (t) {
        return "<span>" + symbolIcon(t, "var(--text)") + E(TYPES[t].tool) + "</span>";
      }).join("") + '<span class="muted">Dashed = no breaker yet</span></div>';

      var panels = d.panels.length > 1 ? '<div class="fp-bar">' + d.panels.map(function (p) { return chip("fp-panel", p.id, E(p.name), p.id === panel.id); }).join("") + "</div>" : "";
      var side = '<aside class="fp-side">' +
        '<div class="fp-side-head"><h4 class="group-title">Electrical Panel' + (d.panels.length > 1 ? "s" : "") + "</h4>" +
          (can ? '<button type="button" class="fp-link" data-action="fp-add-panel">+ Add Panel</button>' : "") + "</div>" +
        panels +
        (panel ? panelHTML(panel, idx, lit) : '<div class="fp-hint-card">Add your breaker panel to label each breaker (15A, 20A, 40A…) and see what it powers.' +
          (can ? '<div class="fp-actions"><button type="button" class="pill-btn" data-action="fp-add-panel">Add Panel</button></div>' : "") + "</div>") +
        "</aside>";

      return shell(
        '<div class="fp-toolbar">' + floors + modes + "</div>" +
        '<div class="fp-layout"><div class="fp-main-col"><div class="fp-toolbar">' + view + "</div>" + tools +
          (hint ? '<p class="fp-hint">' + hint + "</p>" : "") + canvas + legend +
          '<div class="fp-selection">' + selectionHTML(idx, lit, st) + "</div></div>" + side + "</div>",
        E(floor.name) + " · " + fmtFt(floor.width) + " × " + fmtFt(floor.depth) + " · " + U.number(area) + " sq ft",
        can ? '<button type="button" class="circle-btn" data-action="fp-edit-floor" data-id="' + floor.id + '" aria-label="Edit floor" title="Edit floor size">' + I.svg("more") + "</button>" : ""
      );
    },

    afterRender: function () {
      var st = ui();
      var canvas = APP.State.route.view === "floorplan" ? document.querySelector(".fp-canvas") : null;
      var floor = canvas && currentFloor();
      if (!floor) {
        return;
      }
      if (!st.ppf) {
        var fitW = (canvas.clientWidth - 64) / num(floor.width, 40);
        var fitH = (Math.max(320, window.innerHeight * 0.68) - 90) / num(floor.depth, 30);
        st.ppf = clamp(+Math.min(fitW, fitH).toFixed(2), 4, 80);
        APP.Controller.render();
        return;
      }
      if (st.scroll) {
        canvas.scrollLeft = st.scroll.l;
        canvas.scrollTop = st.scroll.t;
      }
    },

    bind: function () {
      document.addEventListener("pointerdown", onDown);
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", function () {
        var d = APP.FloorPlan.drag;
        APP.FloorPlan.drag = null;
        if (d && d.moved && d.movable) {
          APP.Controller.render();
        }
      });
      document.addEventListener("scroll", function (e) {
        if (e.target && e.target.classList && e.target.classList.contains("fp-canvas")) {
          ui().scroll = { l: e.target.scrollLeft, t: e.target.scrollTop };
        }
      }, true);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && ui().tool && !APP.State.ui.sheet) {
          ui().tool = "";
          APP.Controller.render();
        }
      });
    },

    // Option lists for the add/edit forms.
    options: {
      types: function () { return TYPE_ORDER.map(function (t) { return { value: t, label: TYPES[t].label }; }); },
      sizes: function () { return SIZES.map(function (s) { return { value: s[0], label: s[1] }; }); },
      kinds: function () { return KINDS; },
      brands: function () { return [{ value: "", label: "Unknown" }].concat(BRANDS.map(function (b) { return { value: b, label: b }; })); },
      amps: function () { return AMPS.map(function (a) { return { value: a, label: a + "A" }; }); },
      breakerTypes: function () { return BREAKER_TYPES; },
      floors: function (blank) {
        return (blank ? [{ value: "", label: blank }] : []).concat(D().floors.map(function (f) { return { value: f.id, label: f.name }; }));
      },
      breakers: function (blank) {
        return [{ value: "", label: blank || "Not assigned" }].concat(index().list.map(function (x) {
          return { value: x.b.id, label: (D().panels.length > 1 ? x.p.name + " · " : "") + breakerName(x) };
        }));
      },
      items: function () {
        return [{ value: "", label: "None" }].concat(D().items.slice().sort(U.byName).map(function (i) { return { value: i.id, label: i.name }; }));
      }
    },

    // Shown on an inventory item: the breaker its appliance is wired to.
    circuitForItem: function (itemId) {
      var dev = D().devices.filter(function (x) { return x.itemId === itemId; })[0];
      if (!dev) {
        return null;
      }
      var info = index().breakers[dev.breakerId];
      return { label: info ? breakerName(info) : "On floor plan · no breaker yet" };
    },

    roomForLocation: function (locationId) {
      return D().rooms.filter(function (r) { return r.locationId === locationId; })[0] || null;
    },

    printPanel: function (p) {
      var idx = index();
      var spaces = Math.max(2, num(p.spaces, 20));
      spaces += spaces % 2;
      var at = {};
      p.breakers.forEach(function (b) {
        at[num(b.slot)] = b;
        if (Number(b.poles) === 2) {
          at[num(b.slot) + 2] = { covered: b };
        }
      });
      function cell(s) {
        var b = at[s];
        if (!b) {
          return "<td>" + s + "</td><td class=\"r-empty\">—</td><td></td>";
        }
        if (b.covered) {
          return "<td>" + s + "</td><td>↑ " + E(b.covered.label || "") + " (2-pole)</td><td></td>";
        }
        return "<td>" + s + "</td><td><strong>" + E(b.label || "Unlabeled") + "</strong>" + (breakerType(b.type).tag ? " · " + breakerType(b.type).label : "") + "</td><td>" + E(b.amps) + "A</td>";
      }
      var rows = [];
      for (var r = 1; r <= spaces / 2; r += 1) {
        rows.push("<tr>" + cell(2 * r - 1) + cell(2 * r) + "</tr>");
      }
      var detail = sortedBreakers(p).map(function (b) {
        var devs = D().devices.filter(function (x) { return x.breakerId === b.id; });
        var rooms = {};
        devs.forEach(function (x) { var rm = roomOf(x); if (rm) { rooms[rm.name] = true; } });
        return "<tr><td>" + E(idx.breakers[b.id].num) + "</td><td>" + E(b.label) + "</td><td>" + E(b.amps) + "A</td><td>" + E(Object.keys(rooms).join(", ")) + "</td><td>" + E(countSummary(devs)) + "</td></tr>";
      }).join("");
      var kind = (KINDS.filter(function (k) { return k.value === p.kind; })[0] || KINDS[0]).label;

      var html = '<header class="r-head"><div><h1>' + E(p.name) + "</h1><p>" + E([kind, p.amps + "A", spaces + " spaces", p.brand, p.model].filter(Boolean).join(" · ")) + "</p></div>" +
        '<div class="r-meta"><strong>Panel Directory</strong><span>' + E(D().home.name) + " · " + E(U.date(U.todayISO())) + "</span></div></header>" +
        '<h2>Breakers</h2><table class="r-panel"><thead><tr><th>#</th><th>Circuit</th><th>Amps</th><th>#</th><th>Circuit</th><th>Amps</th></tr></thead><tbody>' + rows.join("") + "</tbody></table>" +
        "<h2>What Each Breaker Powers</h2><table><thead><tr><th>Slot</th><th>Circuit</th><th>Amps</th><th>Rooms</th><th>Devices</th></tr></thead><tbody>" + (detail || '<tr><td colspan="5" class="r-empty">No breakers yet.</td></tr>') + "</tbody></table>" +
        '<footer class="r-foot">HomeOps Planner · ' + E(D().home.name) + "</footer>";
      APP.Reports.printHTML(html, U.slugify(p.name) + "-directory-" + U.todayISO());
    },

    // Sample floor wired to a sample panel. Links to example inventory and locations when they exist.
    addSample: function (data) {
      var id = APP.Core.createId;
      var has = function (coll, x) { return data[coll].some(function (r) { return r.id === x; }) ? x : ""; };
      var floor = { id: id("floor"), name: "Main Floor", width: 48, depth: 32, notes: "Sample layout. Use Arrange to move things, or edit it to match your home." };

      [["Kitchen", 0, 0, 16, 14, "loc-kitchen"], ["Living Room", 16, 0, 20, 18], ["Primary Bedroom", 36, 0, 12, 16], ["Laundry", 0, 14, 8, 9, "loc-laundry"],
        ["Main Bathroom", 8, 14, 8, 9, "loc-bath"], ["Hall", 16, 18, 20, 5], ["Bedroom 2", 36, 16, 12, 16], ["Dining", 0, 23, 16, 9], ["Office", 16, 23, 20, 9]].forEach(function (r) {
        data.rooms.push({ id: id("room"), floorId: floor.id, name: r[0], x: r[1], y: r[2], w: r[3], h: r[4], locationId: r[5] ? has("locations", r[5]) : "" });
      });

      var panel = { id: id("panel"), name: "Main Panel", kind: "main", amps: 200, spaces: 40, brand: "Square D Homeline", model: "", floorId: floor.id, x: 0.6, y: 20.5, feedBreakerId: "", notes: "", breakers: [] };
      var B = {};
      [[1, 1, 15, "afci", "Living Room & Hall"], [2, 1, 20, "gfci", "Kitchen Counter (Left)"], [3, 1, 15, "afci", "Bedrooms"], [4, 1, 20, "gfci", "Kitchen Counter (Right)"],
        [5, 1, 20, "gfci", "Bathroom"], [6, 1, 20, "standard", "Dishwasher"], [7, 1, 20, "standard", "Refrigerator"], [8, 2, 30, "standard", "Dryer"],
        [9, 1, 20, "standard", "Washer"], [11, 1, 15, "afci", "Kitchen, Dining & Laundry Lights"], [12, 2, 40, "standard", "Range"], [13, 1, 20, "afci", "Dining & Office"],
        [15, 2, 40, "standard", "A/C Condenser"], [16, 1, 15, "standard", "Furnace"]].forEach(function (b) {
        B[b[0]] = id("brk");
        panel.breakers.push({ id: B[b[0]], slot: b[0], poles: b[1], amps: b[2], type: b[3], label: b[4], notes: "" });
      });

      function dev(type, x, y, slot, label, extra) {
        data.devices.push(Object.assign({ id: id("dev"), floorId: floor.id, type: type, label: label || "", x: x, y: y, w: "", h: "", breakerId: slot ? B[slot] : "", itemId: "", notes: "" }, extra || {}));
      }

      dev("appliance", 2.5, 0.5, 12, "Range", { w: 2.5, h: 2.2 });
      dev("appliance", 7, 0.5, 6, "", { w: 2, h: 2, itemId: has("items", "item-dishwasher"), label: has("items", "item-dishwasher") ? "" : "Dishwasher" });
      dev("appliance", 13, 0.5, 7, "", { w: 2.8, h: 2.6, itemId: has("items", "item-fridge"), label: has("items", "item-fridge") ? "" : "Refrigerator" });
      dev("appliance", 0.5, 14.5, 9, "", { w: 2.6, h: 2.6, itemId: has("items", "item-washer"), label: has("items", "item-washer") ? "" : "Washer" });
      dev("appliance", 3.4, 14.5, 8, "", { w: 2.6, h: 2.6, itemId: has("items", "item-dryer"), label: has("items", "item-dryer") ? "" : "Dryer" });

      [["outlet240", 3.75, 0.3, 12, "Range outlet"], ["gfci", 1.2, 0.4, 2, "Counter left"], ["gfci", 5.6, 0.4, 2, "Counter by sink"], ["gfci", 10, 0.4, 4, "Counter right of sink"],
        ["gfci", 12.2, 0.4, 4, "Counter by fridge"], ["outlet", 14.4, 0.3, 7, "Fridge outlet"], ["outlet", 8, 0.3, 6, "Dishwasher outlet"], ["gfci", 0.4, 7, 4, "Breakfast nook"],
        ["light", 8, 7, 11, "Kitchen ceiling"], ["switch", 15.6, 11, 11, "Kitchen lights"],
        ["outlet", 16.4, 5, 1], ["outlet", 16.4, 13, 1], ["outlet", 26, 0.4, 1], ["outlet", 35.6, 6, 1], ["outlet", 35.6, 13, 1], ["outlet", 30, 17.6, 1],
        ["fan", 26, 9, 1, "Living room fan"], ["switch", 19, 17.6, 1, "Fan / lights"],
        ["outlet", 36.4, 4, 3], ["outlet", 47.6, 4, 3], ["outlet", 47.6, 12, 3], ["outlet", 42, 15.6, 3], ["light", 42, 8, 3, "Bedroom light"], ["switch", 36.4, 14, 3], ["smoke", 44.5, 6, 3, "Bedroom smoke"],
        ["outlet", 36.4, 26, 3], ["outlet", 47.6, 20, 3], ["outlet", 47.6, 28, 3], ["outlet", 42, 31.6, 3], ["light", 42, 24, 3, "Bedroom 2 light"], ["switch", 36.4, 18.5, 3],
        ["gfci", 12, 14.4, 5, "Vanity"], ["light", 12, 17, 5, "Vanity light"], ["fan", 10, 21, 5, "Exhaust fan"], ["switch", 15.6, 21, 5, "Bath light / fan"],
        ["outlet", 1.8, 14.3, 9, "Washer"], ["outlet240", 4.7, 14.3, 8, "Dryer outlet"], ["light", 4, 19, 11, "Laundry light"], ["switch", 7.6, 22, 11],
        ["light", 26, 20.5, 1, "Hall light"], ["switch", 17, 22.6, 1, "Hall light"], ["smoke", 31, 20.5, 3, "Hall smoke / CO"],
        ["outlet", 0.4, 27.5, 13], ["outlet", 8, 31.6, 13], ["outlet", 15.6, 28, 13], ["light", 8, 27.5, 11, "Dining chandelier"], ["dimmer", 15.6, 24.5, 11, "Chandelier dimmer"],
        ["outlet", 16.4, 28, 13], ["outlet", 26, 31.6, 13], ["outlet", 35.6, 28, 13], ["light", 26, 27.5, 13, "Office light"], ["switch", 17, 23.4, 13], ["outlet", 30, 23.4, 0, "Unknown circuit — test me"]
      ].forEach(function (x) { dev(x[0], x[1], x[2], x[3], x[4]); });

      data.floors.push(floor);
      data.panels.push(panel);
      return floor;
    },

    // ---------- clicks (merged into APP.Controller.actions) ----------

    actions: {
      "fp-mode": function (id) {
        var st = ui();
        st.mode = id;
        st.tool = "";
        APP.Controller.render();
      },
      "fp-tool": function (id) {
        var st = ui();
        st.tool = st.tool === id ? "" : id;
        APP.Controller.render();
      },
      "fp-floor": function (id) {
        var st = ui();
        st.floorId = id;
        st.ppf = 0;
        st.scroll = null;
        APP.Controller.render();
      },
      "fp-zoom": function (id) {
        var st = ui();
        st.ppf = id === "fit" ? 0 : clamp(+(st.ppf * (id === "in" ? 1.25 : 0.8)).toFixed(2), 4, 80);
        APP.Controller.render();
      },
      "fp-labels": function () { ui().labels = !ui().labels; APP.Controller.render(); },
      "fp-colors": function () { ui().colors = !ui().colors; APP.Controller.render(); },
      "fp-panel": function (id) { ui().panelId = id; APP.Controller.render(); },
      "fp-clear": function () { ui().sel = null; APP.Controller.render(); },
      "fp-unassigned": function () { ui().sel = { kind: "unassigned" }; APP.Controller.render(); },

      "fp-breaker": function (id) {
        var st = ui();
        var info = index().breakers[id];
        if (!info) {
          return;
        }
        st.panelId = info.p.id;
        if (st.sel && st.sel.kind === "breaker" && st.sel.id === id && st.mode !== "wire") {
          st.sel = null;
        } else {
          st.sel = { kind: "breaker", id: id };
          // If everything on this circuit is on another floor, jump there.
          var lit = litFor(st.sel, index());
          var devs = D().devices.filter(function (x) { return lit.devices[x.id]; });
          if (devs.length && !devs.some(function (x) { return x.floorId === st.floorId; })) {
            st.floorId = devs[0].floorId;
            st.ppf = 0;
          }
        }
        APP.Controller.render();
      },
      "fp-device": function (id) {
        var st = ui();
        var dev = APP.Core.find("devices", id);
        st.sel = { kind: "device", id: id };
        if (dev.floorId !== st.floorId) {
          st.floorId = dev.floorId;
          st.ppf = 0;
        }
        APP.Controller.render();
      },

      "fp-focus-item": function (id) {
        var dev = D().devices.filter(function (x) { return x.itemId === id; })[0];
        if (dev) {
          ui().sel = { kind: "device", id: dev.id };
          ui().floorId = dev.floorId;
          ui().ppf = 0;
        }
        location.hash = "#/floorplan";
      },
      "fp-focus-location": function (id) {
        var room = APP.FloorPlan.roomForLocation(id);
        if (room) {
          ui().sel = { kind: "room", id: room.id };
          ui().floorId = room.floorId;
          ui().ppf = 0;
        }
        location.hash = "#/floorplan";
      },

      "fp-sample": function () {
        if (!APP.Controller.guard()) { return; }
        var floor = APP.FloorPlan.addSample(D());
        ui().floorId = floor.id;
        ui().panelId = "";
        ui().ppf = 0;
        APP.Controller.commit("Sample floor plan added.", "Sample layout added — tap a breaker to try it");
      },

      "fp-add-floor": function () {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("floor", { name: D().floors.length ? "" : "Main Floor", width: 40, depth: 30 });
      },
      "fp-edit-floor": function (id) {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("floor", APP.Core.find("floors", id), { deleteAction: "fp-delete-floor" });
      },
      "fp-edit-room": function (id) {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("room", APP.Core.find("rooms", id), { deleteAction: "fp-delete-room" });
      },
      "fp-edit-device": function (id) {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("device", APP.Core.find("devices", id), { deleteAction: "fp-delete-device" });
      },
      "fp-add-panel": function () {
        if (!APP.Controller.guard()) { return; }
        var floor = currentFloor();
        APP.Forms.open("panel", { kind: D().panels.length ? "sub" : "main", size: "200-40", floorId: floor ? floor.id : "", brand: "" }, { x: 1, y: 1 });
      },
      "fp-edit-panel": function (id) {
        if (!APP.Controller.guard()) { return; }
        var p = APP.Core.find("panels", id);
        var key = p.amps + "-" + p.spaces;
        var size = SIZES.some(function (s) { return s[0] === key; }) ? key : "custom";
        APP.Forms.open("panel", Object.assign({}, p, { size: size }), { deleteAction: "fp-delete-panel" });
      },
      "fp-slot": function (id) {
        if (!APP.Controller.guard()) { return; }
        APP.Forms.open("breaker", { slot: Number(id), poles: 1, amps: 20, type: "standard", label: "" }, { panelId: currentPanel().id });
      },
      "fp-edit-breaker": function (id) {
        if (!APP.Controller.guard()) { return; }
        var info = index().breakers[id];
        APP.Forms.open("breaker", info.b, { panelId: info.p.id, deleteAction: "fp-delete-breaker", parentId: info.p.id });
      },
      "fp-print-panel": function (id) {
        APP.FloorPlan.printPanel(APP.Core.find("panels", id));
      },

      "fp-delete-floor": function (id) {
        var f = APP.Core.find("floors", id);
        if (!confirm("Delete “" + f.name + "” with its rooms and devices? Panels on it are kept.")) { return; }
        D().rooms = D().rooms.filter(function (r) { return r.floorId !== id; });
        D().devices = D().devices.filter(function (x) { return x.floorId !== id; });
        D().panels.forEach(function (p) { if (p.floorId === id) { p.floorId = ""; } });
        APP.Core.remove("floors", id);
        ui().floorId = "";
        ui().sel = null;
        ui().ppf = 0;
        APP.Controller.commit("Floor deleted: " + f.name, "Floor deleted");
      },
      "fp-delete-room": function (id) {
        var r = APP.Core.find("rooms", id);
        if (!confirm("Delete the room “" + r.name + "”? Devices inside it stay on the plan.")) { return; }
        APP.Core.remove("rooms", id);
        APP.Controller.commit("Room deleted: " + r.name, "Room deleted");
      },
      "fp-delete-device": function (id) {
        APP.Core.remove("devices", id);
        APP.Controller.commit("", "Device deleted");
      },
      "fp-delete-panel": function (id) {
        var p = APP.Core.find("panels", id);
        if (!confirm("Delete “" + p.name + "” and its " + p.breakers.length + " breaker(s)? Devices wired to it become unassigned.")) { return; }
        var ids = {};
        p.breakers.forEach(function (b) { ids[b.id] = true; });
        D().devices.forEach(function (x) { if (ids[x.breakerId]) { x.breakerId = ""; } });
        D().panels.forEach(function (x) { if (ids[x.feedBreakerId]) { x.feedBreakerId = ""; } });
        APP.Core.remove("panels", id);
        ui().panelId = "";
        ui().sel = null;
        APP.Controller.commit("Panel deleted: " + p.name, "Panel deleted");
      },
      "fp-delete-breaker": function (id, el) {
        var p = APP.Core.find("panels", el.getAttribute("data-parent"));
        var n = D().devices.filter(function (x) { return x.breakerId === id; }).length;
        if (!confirm("Remove this breaker?" + (n ? " " + n + " device(s) on it become unassigned." : ""))) { return; }
        p.breakers = p.breakers.filter(function (b) { return b.id !== id; });
        D().devices.forEach(function (x) { if (x.breakerId === id) { x.breakerId = ""; } });
        D().panels.forEach(function (x) { if (x.feedBreakerId === id) { x.feedBreakerId = ""; } });
        ui().sel = null;
        APP.Controller.commit("Breaker removed from " + p.name, "Breaker removed");
      }
    },

    // ---------- form saves (merged into APP.Controller.savers) ----------

    savers: {
      floor: function (v, id) {
        v.width = Math.max(4, num(v.width, 40));
        v.depth = Math.max(4, num(v.depth, 30));
        var r = APP.Controller.upsert("floors", id, v, "floor");
        ui().floorId = r.row.id;
        ui().ppf = 0;
        APP.Controller.commit((r.created ? "Floor added: " : "Floor updated: ") + v.name, r.created ? "Floor added — switch to Arrange to draw rooms" : "Saved");
      },
      room: function (v, id) {
        v.x = num(v.x);
        v.y = num(v.y);
        v.w = Math.max(1, num(v.w, 10));
        v.h = Math.max(1, num(v.h, 10));
        v.floorId = v.floorId || ui().floorId;
        var r = APP.Controller.upsert("rooms", id, v, "room");
        APP.Controller.commit((r.created ? "Room added: " : "Room updated: ") + v.name, r.created ? "Room added" : "Saved");
      },
      device: function (v, id) {
        v.x = num(v.x);
        v.y = num(v.y);
        v.floorId = v.floorId || ui().floorId;
        if (v.type === "appliance") {
          v.w = Math.max(0.5, num(v.w, 2.5));
          v.h = Math.max(0.5, num(v.h, 2.5));
        } else {
          v.itemId = "";
          v.w = "";
          v.h = "";
        }
        var r = APP.Controller.upsert("devices", id, v, "dev");
        APP.Controller.commit("", r.created ? (TYPES[v.type] || TYPES.other).label + " added" : "Saved");
      },
      panel: function (v, id, ctx) {
        if (v.size !== "custom") {
          var parts = v.size.split("-");
          v.amps = Number(parts[0]);
          v.spaces = Number(parts[1]);
        }
        delete v.size;
        v.amps = Math.max(1, num(v.amps, 100));
        v.spaces = Math.max(2, Math.round(num(v.spaces, 20)));
        v.spaces += v.spaces % 2;

        var existing = id ? APP.Core.find("panels", id) : null;
        if (existing && existing.breakers.some(function (b) { return num(b.slot) + (Number(b.poles) === 2 ? 2 : 0) > v.spaces; })) {
          APP.Dom.toast("Some breakers sit past space " + v.spaces + ". Move or remove them first.", "warning");
          return;
        }
        if (v.kind === "main" || (existing && existing.breakers.some(function (b) { return b.id === v.feedBreakerId; }))) {
          v.feedBreakerId = "";
        }

        var r = APP.Controller.upsert("panels", id, v, "panel");
        if (r.created) {
          var floor = APP.Core.find("floors", v.floorId);
          r.row.breakers = [];
          r.row.x = ctx.x !== undefined ? ctx.x : 1;
          r.row.y = ctx.y !== undefined ? ctx.y : 1;
          if (floor) {
            r.row.x = clamp(r.row.x, 0, num(floor.width));
            r.row.y = clamp(r.row.y, 0, num(floor.depth));
          }
        }
        ui().panelId = r.row.id;
        APP.Controller.commit((r.created ? "Panel added: " : "Panel updated: ") + v.name, r.created ? "Panel added — tap an empty slot to add a breaker" : "Saved");
      },
      breaker: function (v, id, ctx) {
        var p = APP.Core.find("panels", ctx.panelId);
        v.slot = Math.round(num(v.slot, 1));
        v.poles = Number(v.poles) === 2 ? 2 : 1;
        v.amps = num(v.amps, 20);
        var spaces = num(p.spaces);
        var last = v.slot + (v.poles === 2 ? 2 : 0);

        if (v.slot < 1 || last > spaces) {
          APP.Dom.toast(v.poles === 2 ? "A double-pole breaker in slot " + v.slot + " also needs slot " + last + " (this panel has " + spaces + ")." : "Pick a slot from 1 to " + spaces + ".", "warning");
          return;
        }
        var taken = {};
        p.breakers.forEach(function (b) {
          if (b.id === id) { return; }
          taken[num(b.slot)] = b;
          if (Number(b.poles) === 2) { taken[num(b.slot) + 2] = b; }
        });
        var clash = taken[v.slot] || (v.poles === 2 && taken[v.slot + 2]);
        if (clash) {
          APP.Dom.toast("That space is already used by " + (clash.label || "breaker " + clash.slot) + ".", "warning");
          return;
        }

        var row = id ? p.breakers.filter(function (b) { return b.id === id; })[0] : null;
        if (row) {
          Object.assign(row, v);
        } else {
          row = Object.assign({ id: APP.Core.createId("brk") }, v);
          p.breakers.push(row);
          ui().sel = { kind: "breaker", id: row.id };
        }
        APP.Controller.commit("Breaker " + (id ? "updated" : "added") + " on " + p.name + ": " + v.amps + "A " + (v.label || ""), id ? "Saved" : v.amps + "A breaker added");
      }
    }
  };

  // ---------- pointer: tap, drag, resize ----------

  function toFt(svg, e) {
    var pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    var p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  }

  function objFor(kind, id) {
    return APP.Core.find(kind === "room" ? "rooms" : kind === "panel" ? "panels" : "devices", id);
  }

  function onDown(e) {
    var svg = e.target.closest ? e.target.closest("[data-fp-svg]") : null;
    if (!svg || e.button > 0) {
      return;
    }
    var st = ui();
    var g = e.target.closest("[data-fp-kind]");
    var drag = { svg: svg, pt: toFt(svg, e), cx: e.clientX, cy: e.clientY, kind: g ? g.getAttribute("data-fp-kind") : "", id: g ? g.getAttribute("data-fp-id") : "", el: g, moved: false, movable: false };

    if (st.mode === "arrange" && !st.tool && g && APP.Core.canEdit()) {
      var obj = objFor(drag.kind, drag.id);
      var resize = !!e.target.closest("[data-fp-handle]");
      if (obj) {
        Object.assign(drag, { movable: true, obj: obj, resize: resize, ox: num(obj.x), oy: num(obj.y), ow: num(obj.w, 1), oh: num(obj.h, 1), kids: [],
          label: svg.querySelector('[data-fp-label="' + drag.id + '"]') });
        if (drag.kind === "room" && !resize) {
          devicesInRoom(obj).forEach(function (x) {
            drag.kids.push({ obj: x, ox: num(x.x), oy: num(x.y), el: svg.querySelector('[data-fp-kind="device"][data-fp-id="' + x.id + '"]') });
          });
          D().panels.filter(function (p) { return p.floorId === obj.floorId && inRoom({ x: num(p.x), y: num(p.y) }, obj); }).forEach(function (p) {
            drag.kids.push({ obj: p, ox: num(p.x), oy: num(p.y), el: svg.querySelector('[data-fp-kind="panel"][data-fp-id="' + p.id + '"]') });
          });
        }
        try { svg.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
        e.preventDefault();
      }
    }
    APP.FloorPlan.drag = drag;
  }

  function onMove(e) {
    var d = APP.FloorPlan.drag;
    if (!d || (!d.moved && Math.abs(e.clientX - d.cx) + Math.abs(e.clientY - d.cy) < 5)) {
      return;
    }
    d.moved = true;
    if (!d.movable) {
      return;
    }
    e.preventDefault();
    var floor = currentFloor();
    var W = num(floor.width);
    var H = num(floor.depth);
    var pt = toFt(d.svg, e);
    var step = d.kind === "room" ? 0.5 : 0.25;
    var dx = snap(pt.x - d.pt.x, step);
    var dy = snap(pt.y - d.pt.y, step);

    if (d.resize) {
      d.nw = Math.max(d.kind === "room" ? 1 : 0.5, +(d.ow + dx).toFixed(2));
      d.nh = Math.max(d.kind === "room" ? 1 : 0.5, +(d.oh + dy).toFixed(2));
      var rect = d.el.querySelector("rect");
      var hd = d.el.querySelector("[data-fp-handle]");
      var dim = d.label ? d.label.querySelector(".fp-room-dim") : null;
      var s = num(hd.getAttribute("width"));
      rect.setAttribute("width", d.nw);
      rect.setAttribute("height", d.nh);
      hd.setAttribute("x", d.nw - s);
      hd.setAttribute("y", d.nh - s);
      if (dim) {
        dim.textContent = fmtFt(d.nw) + " × " + fmtFt(d.nh);
      }
      return;
    }

    var w = d.kind === "room" || d.obj.type === "appliance" ? d.ow : 0;
    var h = d.kind === "room" || d.obj.type === "appliance" ? d.oh : 0;
    d.nx = +clamp(d.ox + dx, 0, Math.max(0, W - w)).toFixed(2);
    d.ny = +clamp(d.oy + dy, 0, Math.max(0, H - h)).toFixed(2);
    d.el.setAttribute("transform", "translate(" + d.nx + " " + d.ny + ")");
    if (d.label) {
      d.label.setAttribute("transform", "translate(" + d.nx + " " + d.ny + ")");
    }
    d.kids.forEach(function (k) {
      k.nx = +(k.ox + d.nx - d.ox).toFixed(2);
      k.ny = +(k.oy + d.ny - d.oy).toFixed(2);
      if (k.el) {
        k.el.setAttribute("transform", "translate(" + k.nx + " " + k.ny + ")");
      }
    });
  }

  function onUp() {
    var d = APP.FloorPlan.drag;
    if (!d) {
      return;
    }
    APP.FloorPlan.drag = null;

    if (d.moved) {
      if (d.movable && (d.nw !== undefined || d.nx !== undefined)) {
        if (d.resize) {
          d.obj.w = d.nw;
          d.obj.h = d.nh;
        } else {
          d.obj.x = d.nx;
          d.obj.y = d.ny;
          d.kids.forEach(function (k) { k.obj.x = k.nx; k.obj.y = k.ny; });
        }
        APP.Core.save();
        APP.Controller.render();
      }
      return;
    }
    tap(d);
  }

  function tap(d) {
    var st = ui();
    var can = APP.Core.canEdit();

    if (st.mode === "arrange" && can) {
      if (st.tool) {
        place(st.tool, d.pt);
      } else if (d.kind === "room") {
        APP.FloorPlan.actions["fp-edit-room"](d.id);
      } else if (d.kind === "device") {
        APP.FloorPlan.actions["fp-edit-device"](d.id);
      } else if (d.kind === "panel") {
        APP.FloorPlan.actions["fp-edit-panel"](d.id);
      }
      return;
    }

    if (st.mode === "wire" && can && d.kind !== "device") {
      // Keep the chosen breaker selected while wiring; only a panel tap does anything.
      if (d.kind === "panel") {
        st.panelId = d.id;
        APP.Controller.render();
      }
      return;
    }

    if (st.mode === "wire" && can) {
      var info = st.sel && st.sel.kind === "breaker" ? index().breakers[st.sel.id] : null;
      if (!info) {
        APP.Dom.toast("Pick a breaker in the panel first, then tap devices to connect them.", "warning");
        return;
      }
      var dev = APP.Core.find("devices", d.id);
      var off = dev.breakerId === info.b.id;
      dev.breakerId = off ? "" : info.b.id;
      APP.Controller.commit("", deviceName(dev) + (off ? " disconnected from #" : " connected to #") + info.num);
      return;
    }

    if (d.kind === "panel") {
      st.panelId = d.id;
    } else if (d.kind === "device" || d.kind === "room") {
      st.sel = st.sel && st.sel.kind === d.kind && st.sel.id === d.id ? null : { kind: d.kind, id: d.id };
    } else if (st.mode === "view") {
      st.sel = null;
    }
    APP.Controller.render();
  }

  function place(tool, pt) {
    var st = ui();
    var floor = currentFloor();
    var W = num(floor.width);
    var H = num(floor.depth);
    var x = clamp(snap(pt.x, 0.25), 0, W);
    var y = clamp(snap(pt.y, 0.25), 0, H);
    var info = st.sel && st.sel.kind === "breaker" ? index().breakers[st.sel.id] : null;

    if (tool === "room") {
      APP.Forms.open("room", { floorId: floor.id, name: "", locationId: "", x: clamp(snap(pt.x - 5, 0.5), 0, Math.max(0, W - 10)), y: clamp(snap(pt.y - 5, 0.5), 0, Math.max(0, H - 10)), w: Math.min(10, W), h: Math.min(10, H) });
      return;
    }
    if (tool === "appliance") {
      APP.Forms.open("device", { type: "appliance", floorId: floor.id, x: clamp(snap(pt.x - 1.25, 0.25), 0, W), y: clamp(snap(pt.y - 1.25, 0.25), 0, H), w: 2.5, h: 2.5, breakerId: info ? info.b.id : "", label: "", itemId: "" });
      return;
    }
    if (tool === "panel") {
      APP.Forms.open("panel", { kind: D().panels.length ? "sub" : "main", size: "200-40", floorId: floor.id, brand: "" }, { x: x, y: y });
      return;
    }

    D().devices.push({ id: APP.Core.createId("dev"), floorId: floor.id, type: tool, label: "", x: x, y: y, w: "", h: "", breakerId: info ? info.b.id : "", itemId: "", notes: "" });
    APP.Controller.commit("", TYPES[tool].label + " placed" + (info ? " on #" + info.num : ""));
  }
}());
