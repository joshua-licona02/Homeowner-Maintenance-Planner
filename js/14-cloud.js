// Cloud sync: Google sign-in plus Firestore, so the phone, iPad, and computer all show the same
// home. The app always works from its local copy (localStorage); this keeps that copy in step
// with the cloud and works offline, sending queued edits when the device reconnects.
//
// Firestore layout (shared Firebase project with the budget app; firestore.rules there lets
// only the household's Google accounts read or write households/*):
//   households/homeops/sections/{key}   one document per part of the data (items, tasks,
//                                       rooms, devices, panels, …) holding it as a JSON string,
//                                       so an edit to one part never overwrites another
//                                       device's edit to a different part
//
// Each device remembers a fingerprint of every section as last synced (the "base"). Comparing
// against it tells which sections changed on this device since then, so edits that never
// reached the cloud (offline, or the app closed right after an edit) are sent on the next
// connect instead of being replaced by the cloud copy.
//
// Sync turns on only when js/cloud-config.js exists (it is git-ignored and deployed with the
// Firebase site). On the old GitHub Pages address the app offers to move its data to the new one.
const FIREBASE_SDK = "https://www.gstatic.com/firebasejs/12.19.0/";
const HOME_URL = "https://homeops-licona.web.app/";

const APP = window.APP;

const HOUSEHOLD = "homeops";
const LINKED_KEY = "homeops.cloudLinked";
const BASE_KEY = "homeops.cloudBase";
const BEFORE_KEY = "homeops.beforeCloud";

const SECTIONS = ["home", "locations", "items", "paints", "tasks", "projects", "users",
  "floors", "rooms", "devices", "panels", "settings", "auditLog"];

// Settings that describe this device rather than the shared home.
const LOCAL_SETTINGS = ["theme", "lastNotified"];

// Firestore holds at most ~1 MB per document.
const MAX_SECTION = 900000;

let GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect,
  getRedirectResult, signOut, doc, getDocs, onSnapshot, writeBatch, serverTimestamp;

let auth = null;
let db = null;
let sectionsRef = null;

const cloud = APP.Cloud = {
  enabled: false,
  ready: false,
  user: null,
  status: "local",
  detail: "",
  oldHost: /(^|\.)github\.io$/.test(location.hostname),
  homeUrl: HOME_URL
};

// What the cloud is known to hold, so each save only writes what changed.
let synced = {};
let writeAll = false;
let unsubscribe = null;
let pushTimer = null;
let pendingCommits = 0;

function storage(action, key, value) {
  try {
    if (action === "get") {
      return localStorage.getItem(key);
    }
    if (action === "set") {
      localStorage.setItem(key, value);
    } else {
      localStorage.removeItem(key);
    }
  } catch (error) {
    // Private browsing or blocked storage: sync still works for this session.
  }
  return null;
}

function fingerprint(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36) + "." + text.length.toString(36);
}

// ---- Sections

function sectionsFromState() {
  const data = APP.State.data;
  const out = {};
  SECTIONS.forEach(function (key) {
    let value = data[key];
    if (key === "settings") {
      value = {};
      Object.keys(data.settings || {}).forEach(function (name) {
        if (LOCAL_SETTINGS.indexOf(name) === -1) {
          value[name] = data.settings[name];
        }
      });
    }
    if (value !== undefined) {
      out[key] = JSON.stringify(value);
    }
  });
  return out;
}

function applySection(key, json) {
  const value = JSON.parse(json);
  const data = APP.State.data;
  if (key !== "settings") {
    data[key] = value;
    return;
  }
  const local = {};
  LOCAL_SETTINGS.forEach(function (name) {
    if (data.settings && data.settings[name] !== undefined) {
      local[name] = data.settings[name];
    }
  });
  data.settings = Object.assign({}, value || {}, local);
}

// ---- Base: what this device last confirmed the cloud holds

function saveBase() {
  const sections = {};
  Object.keys(synced).forEach(function (key) {
    sections[key] = fingerprint(synced[key]);
  });
  storage("set", BASE_KEY, JSON.stringify({ uid: cloud.user && cloud.user.uid, sections: sections }));
}

// Only record the base once nothing is waiting to be sent, so an unsent edit is never marked synced.
function saveBaseIfSettled() {
  if (!pendingCommits && !pushTimer && cloud.ready) {
    saveBase();
  }
}

function loadBase(uid) {
  try {
    const base = JSON.parse(storage("get", BASE_KEY) || "null");
    return base && base.uid === uid && base.sections ? base : null;
  } catch (error) {
    return null;
  }
}

const LABELS = {
  local: "Saved on this device only",
  "signed-out": "Not signed in",
  connecting: "Connecting…",
  synced: "Synced",
  syncing: "Saving…",
  offline: "Offline · changes will sync",
  error: "Sync problem"
};

function setStatus(status, detail) {
  cloud.status = status;
  cloud.detail = detail || "";
  cloud.label = detail || LABELS[status] || status;
  APP.Dom.queryAll("[data-cloud-status]").forEach(function (el) {
    el.textContent = cloud.label;
    el.setAttribute("data-state", status);
  });
}

// Settings and the dashboard show sign-in state; redraw them when it changes.
function refreshChrome() {
  const view = APP.State.route.view;
  if ((view === "settings" || view === "dashboard") && !APP.State.ui.sheet) {
    APP.Controller.render();
  }
}

// ---- Sending local changes

function schedulePush() {
  if (!cloud.ready) {
    // Edits made before connecting are found by comparing with the base on connect.
    return;
  }
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 600);
}

function flush() {
  if (pushTimer) {
    push();
  }
}

function push() {
  clearTimeout(pushTimer);
  pushTimer = null;
  if (!cloud.ready) {
    return;
  }

  const sections = sectionsFromState();
  const changed = Object.keys(sections).filter(function (key) {
    return writeAll || sections[key] !== synced[key];
  });

  if (!changed.length) {
    saveBaseIfSettled();
    return;
  }

  const batch = writeBatch(db);
  changed.forEach(function (key) {
    if (sections[key].length > MAX_SECTION) {
      APP.Dom.toast("Your " + key + " list is too large to sync. Remove some entries.", "danger");
      return;
    }
    batch.set(doc(sectionsRef, key), { json: sections[key], updatedAt: serverTimestamp(), updatedBy: cloud.user.email });
    synced[key] = sections[key];
  });
  writeAll = false;

  setStatus(navigator.onLine ? "syncing" : "offline");
  pendingCommits += 1;

  // The commit lands in Firestore's local cache at once; its promise settles when the server
  // confirms, which can be much later while offline.
  batch.commit().then(function () {
    pendingCommits -= 1;
    if (!pendingCommits) {
      setStatus("synced");
    }
    saveBaseIfSettled();
  }).catch(function (error) {
    pendingCommits -= 1;
    console.error("Cloud save failed", error);
    // Resend everything next time; the base isn't updated, so a reload also resends.
    writeAll = true;
    setStatus("error", error.code === "permission-denied" ? "This account can't save to HomeOps" : "Couldn't save to the cloud");
    APP.Dom.toast("Couldn't save to the cloud: " + (error.message || error), "danger");
  });
}

// ---- Receiving other devices' changes

let refreshQueued = false;

function refreshApp() {
  if (refreshQueued) {
    return;
  }
  refreshQueued = true;
  const run = function () {
    // Don't redraw under a finger that is mid-drag on the floor plan.
    if (APP.FloorPlan && APP.FloorPlan.drag) {
      setTimeout(run, 300);
      return;
    }
    refreshQueued = false;
    APP.Core.normalize(APP.State.data);
    saveLocal();
    APP.Controller.render();
  };
  requestAnimationFrame(run);
}

let saveLocal = function () {};

function listen() {
  if (unsubscribe) {
    unsubscribe();
  }
  unsubscribe = onSnapshot(sectionsRef, { includeMetadataChanges: true }, function (snapshot) {
    if (!snapshot.metadata.hasPendingWrites && !pendingCommits) {
      setStatus(snapshot.metadata.fromCache && !navigator.onLine ? "offline" : "synced");
    }

    const local = sectionsFromState();
    let changed = false;

    snapshot.docChanges().forEach(function (change) {
      const key = change.doc.id;
      const json = change.doc.data().json;
      if (change.type === "removed" || SECTIONS.indexOf(key) === -1 || typeof json !== "string" || json === synced[key]) {
        return;
      }
      // A section edited here and not yet sent keeps this device's version (the pending
      // save sends it). Otherwise take the other device's change.
      if (local[key] === synced[key]) {
        applySection(key, json);
        changed = true;
      }
      synced[key] = json;
    });

    if (changed) {
      refreshApp();
    } else if (!snapshot.metadata.hasPendingWrites) {
      saveBaseIfSettled();
    }
  }, function (error) {
    console.error("Cloud listener failed", error);
    setStatus("error", error.code === "permission-denied" ? "No access with " + (cloud.user ? cloud.user.email : "this account") : "Can't reach the cloud");
    refreshChrome();
  });
}

// ---- Connecting after sign-in

async function readCloud() {
  const snap = await getDocs(sectionsRef);
  const remote = {};
  snap.forEach(function (d) {
    if (SECTIONS.indexOf(d.id) > -1 && typeof d.data().json === "string") {
      remote[d.id] = d.data().json;
    }
  });
  return remote;
}

function askWhichData(remote) {
  const count = function (json) {
    try { return JSON.parse(json || "[]").length; } catch (e) { return 0; }
  };
  const data = APP.State.data;
  return new Promise(function (resolve) {
    cloud.choose = function (choice) {
      if (choice === "local" && !confirm("Replace the HomeOps data in the cloud with this device's data? Every device will then show this device's version.")) {
        return;
      }
      cloud.choose = null;
      APP.Dom.closeSheet();
      resolve(choice);
    };
    APP.Dom.openSheet(
      '<h2 class="sheet-title">Which data should we keep?</h2>' +
      '<div class="sheet-body"><p class="cloud-p">The cloud already has HomeOps data (' + count(remote.items) + " inventory items, " + count(remote.tasks) + " tasks, " +
      count(remote.devices) + " floor plan devices). This device has its own copy (" + data.items.length + " items, " + data.tasks.length + " tasks, " +
      data.devices.length + " devices).</p>" +
      '<div class="group"><button type="button" class="row row-button" data-action="cloud-choose" data-id="cloud"><span class="row-main"><strong class="accent">Use the cloud data</strong><span class="muted">Recommended if you’ve already set things up on another device. This device’s copy is kept as a backup.</span></span></button></div>' +
      '<div class="group cloud-gap"><button type="button" class="row row-button" data-action="cloud-choose" data-id="local"><span class="row-main"><strong>Replace the cloud with this device’s data</strong><span class="muted">Every device will switch to what’s on this one.</span></span></button></div></div>'
    );
    // A choice is required: tapping outside or pressing Esc must not dismiss it.
    const backdrop = APP.Dom.refs.sheetRoot.querySelector(".sheet-backdrop");
    if (backdrop) {
      backdrop.removeAttribute("data-action");
    }
  });
}

async function connect(user) {
  cloud.user = user;
  setStatus("connecting");
  refreshChrome();

  let remote;
  try {
    remote = await readCloud();
  } catch (error) {
    console.error("Cloud read failed", error);
    setStatus("error", error.code === "permission-denied" ? user.email + " doesn't have access to HomeOps" : "Can't reach the cloud");
    refreshChrome();
    return;
  }

  const linked = storage("get", LINKED_KEY) === user.uid;
  const base = linked ? loadBase(user.uid) : null;
  let mode = "cloud";

  if (!Object.keys(remote).length) {
    mode = "upload";
  } else if (base) {
    mode = "merge";
  } else if (!linked) {
    mode = await askWhichData(remote);
  }

  if (mode === "cloud") {
    // Keep this device's previous copy, just in case.
    storage("set", BEFORE_KEY, JSON.stringify(APP.State.data));
    Object.keys(remote).forEach(function (key) {
      applySection(key, remote[key]);
    });
  } else if (mode === "merge") {
    const local = sectionsFromState();
    Object.keys(remote).forEach(function (key) {
      const editedHere = local[key] !== undefined && fingerprint(local[key]) !== base.sections[key];
      if (!editedHere) {
        applySection(key, remote[key]);
      }
    });
  }

  // "local" and "upload" keep this device's data and send all of it.
  synced = mode === "upload" || mode === "local" ? {} : Object.assign({}, remote);
  writeAll = mode === "local";

  storage("set", LINKED_KEY, user.uid);
  cloud.ready = true;
  APP.Core.normalize(APP.State.data);
  saveLocal();
  push();
  listen();
  setStatus(navigator.onLine ? "synced" : "offline");
  APP.Controller.render();

  if (mode === "upload" || mode === "local") {
    APP.Dom.toast("Your home is now saved to the cloud and will sync to your other devices.");
  }
}

async function signIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (cloud.status === "error" && cloud.user) {
    connect(cloud.user);
    return;
  }

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    // Home-screen apps and strict browsers often block popups; a full-page redirect works there.
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].indexOf(error.code) !== -1) {
      await signInWithRedirect(auth, provider);
      return;
    }
    if (error.code !== "auth/popup-closed-by-user") {
      APP.Dom.toast("Sign-in failed: " + (error.message || error.code), "danger");
    }
  }
}

async function leave() {
  if (!confirm("Sign out? This device keeps its copy, but it will stop syncing until you sign in again.")) {
    return;
  }
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  flush();
  cloud.ready = false;
  storage("remove", LINKED_KEY);
  storage("remove", BASE_KEY);
  await signOut(auth);
}

// ---- Moving from the old GitHub Pages address
// The data travels in the link's #fragment, which browsers never send to any server.

function toBase64Url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text) {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function streamBytes(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

async function moveData() {
  const copy = JSON.parse(JSON.stringify(APP.State.data));
  copy.attachments = [];
  let bytes = new TextEncoder().encode(JSON.stringify(copy));
  let prefix = "j.";
  if (window.CompressionStream) {
    bytes = await streamBytes(bytes, new CompressionStream("gzip"));
    prefix = "z.";
  }
  location.href = HOME_URL + "#import=" + prefix + toBase64Url(bytes);
}

async function takeImport() {
  const match = location.hash.match(/^#import=([jz])\.(.+)$/);
  if (!match) {
    return;
  }
  history.replaceState(null, "", location.pathname + location.search + "#/dashboard");
  try {
    let bytes = fromBase64Url(match[2]);
    if (match[1] === "z") {
      bytes = await streamBytes(bytes, new DecompressionStream("gzip"));
    }
    const parsed = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || !parsed.home || !Array.isArray(parsed.items)) {
      throw new Error("not HomeOps data");
    }
    if (!confirm("Bring your HomeOps data over from the old address (" + parsed.items.length + " items, " + parsed.tasks.length + " tasks)? It replaces what's on this device.")) {
      APP.Controller.route();
      return;
    }
    storage("set", BEFORE_KEY, JSON.stringify(APP.State.data));
    APP.State.data = APP.Core.normalize(parsed);
    APP.Core.addAudit("info", "Data moved from the old HomeOps address.");
    APP.Core.save();
    APP.Controller.applyTheme();
    APP.Controller.route();
    APP.Dom.toast(cloud.enabled ? "Data moved. Sign in to sync it to your other devices." : "Data moved.");
  } catch (error) {
    console.error("Import failed", error);
    APP.Controller.route();
    APP.Dom.toast("That link's data couldn't be read. Use Settings › Backup on the old address instead.", "danger");
  }
}

// ---- Clicks (merged into the controller's actions)

Object.assign(APP.Controller.actions, {
  "cloud-sign-in": function () { signIn(); },
  "cloud-sign-out": function () { leave(); },
  "cloud-choose": function (id) { if (cloud.choose) { cloud.choose(id); } },
  "cloud-move": function () { moveData(); },
  "cloud-open-new": function () { location.href = HOME_URL; }
});

// ---- Start

async function loadConfig() {
  try {
    const module = await import("./cloud-config.js");
    return module.default && module.default.projectId ? module.default : null;
  } catch (error) {
    return null;
  }
}

async function main() {
  // Ask the browser not to clear this site's storage when space runs low.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().catch(function () {});
  }

  let config = await loadConfig();
  await takeImport();

  if (!config) {
    setStatus("local");
    refreshChrome();
    return;
  }

  // Sign in through this site's own address so Safari and iPhone/iPad home-screen apps, which
  // block third-party storage, can finish signing in. Needs that address's /__/auth/handler
  // listed as an authorized redirect URI on the Google OAuth client (see README).
  if (/\.web\.app$|\.firebaseapp\.com$/.test(location.hostname)) {
    config = Object.assign({}, config, { authDomain: location.hostname });
  }

  let modules;
  try {
    modules = await Promise.all([
      import(FIREBASE_SDK + "firebase-app.js"),
      import(FIREBASE_SDK + "firebase-auth.js"),
      import(FIREBASE_SDK + "firebase-firestore.js")
    ]);
  } catch (error) {
    console.warn("Cloud sync unavailable", error);
    setStatus("offline", "Offline · using this device's copy");
    return;
  }

  const [appModule, authModule, fsModule] = modules;
  ({ GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } = authModule);
  ({ doc, getDocs, onSnapshot, writeBatch, serverTimestamp } = fsModule);

  const firebaseApp = appModule.initializeApp(config, "homeops");
  auth = authModule.getAuth(firebaseApp);
  db = fsModule.initializeFirestore(firebaseApp, {
    localCache: fsModule.persistentLocalCache({ tabManager: fsModule.persistentMultipleTabManager() })
  });
  sectionsRef = fsModule.collection(db, "households", HOUSEHOLD, "sections");
  cloud.enabled = true;

  // Every local save also schedules a cloud save.
  const originalSave = APP.Core.save;
  saveLocal = function () { return originalSave.call(APP.Core); };
  APP.Core.save = function () {
    const result = saveLocal();
    schedulePush();
    return result;
  };

  // Phones suspend apps in the background, so send any waiting save as the app is hidden.
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      flush();
    }
  });
  window.addEventListener("pagehide", flush);
  window.addEventListener("online", function () { if (cloud.ready) { setStatus("synced"); } });
  window.addEventListener("offline", function () { if (cloud.ready) { setStatus("offline"); } });

  setStatus("connecting");
  getRedirectResult(auth).catch(function (error) {
    APP.Dom.toast("Sign-in failed: " + (error.message || error.code), "danger");
  });

  onAuthStateChanged(auth, function (user) {
    if (user) {
      connect(user);
    } else {
      cloud.user = null;
      cloud.ready = false;
      setStatus("signed-out");
      refreshChrome();
    }
  });
}

main();
