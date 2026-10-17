(function () {
  "use strict";

  // Attachment blobs live in IndexedDB (localStorage is too small for photos/PDFs).
  // Only metadata is kept in APP.State.data.attachments so it rides along with backups.
  var DB_NAME = "homeops-files";
  var STORE = "blobs";
  var dbPromise = null;

  function open() {
    if (dbPromise) {
      return dbPromise;
    }
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("This browser does not support file storage."));
        return;
      }
      var request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        request.result.createObjectStore(STORE);
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error || new Error("File storage could not be opened.")); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(STORE, mode);
        var store = t.objectStore(STORE);
        var result = fn(store);
        t.oncomplete = function () { resolve(result instanceof IDBRequest ? result.result : result); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error || new Error("File storage is full.")); };
      });
    });
  }

  APP.Files = {
    usedBytes: function () {
      return (APP.State.data.attachments || []).reduce(function (s, a) { return s + (a.size || 0); }, 0);
    },

    add: function (parentType, parentId, fileList) {
      var files = Array.prototype.slice.call(fileList || []);
      var used = APP.Files.usedBytes();
      var incoming = files.reduce(function (s, f) { return s + f.size; }, 0);

      if (used + incoming > APP.Config.attachmentQuotaBytes) {
        return Promise.reject(new Error("These files would exceed the 1 GB attachment limit."));
      }

      return files.reduce(function (chain, file) {
        return chain.then(function () {
          var id = APP.Core.createId("file");
          return tx("readwrite", function (store) { store.put(file, id); }).then(function () {
            APP.State.data.attachments.push({
              id: id, parentType: parentType, parentId: parentId, name: file.name,
              type: file.type || "application/octet-stream", size: file.size, createdAt: new Date().toISOString()
            });
          });
        });
      }, Promise.resolve()).then(function () { return files.length; });
    },

    get: function (id) {
      return tx("readonly", function (store) { return store.get(id); });
    },

    open: function (id) {
      var meta = APP.Core.find("attachments", id);
      return APP.Files.get(id).then(function (blob) {
        if (!blob) {
          throw new Error("This file is not stored in this browser. It may have been added on another device.");
        }
        var url = URL.createObjectURL(blob);
        var win = window.open(url, "_blank");
        if (!win) {
          APP.Dom.download(meta ? meta.name : "attachment", blob);
        }
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      });
    },

    remove: function (id) {
      APP.Core.remove("attachments", id);
      return tx("readwrite", function (store) { store.delete(id); }).catch(function () { return null; });
    },

    removeFor: function (parentType, parentId) {
      var ids = APP.Model.attachmentsFor(APP.State.data, parentType, parentId).map(function (a) { return a.id; });
      return Promise.all(ids.map(APP.Files.remove));
    },

    thumbnail: function (id, img) {
      APP.Files.get(id).then(function (blob) {
        if (blob && img) {
          img.src = URL.createObjectURL(blob);
        }
      }).catch(function () { return null; });
    },

    estimate: function () {
      if (navigator.storage && navigator.storage.estimate) {
        return navigator.storage.estimate();
      }
      return Promise.resolve(null);
    }
  };
}());
