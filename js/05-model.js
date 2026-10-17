(function () {
  "use strict";

  APP.Model = {
    build: function (data) {
      var U = APP.Utils;
      var settings = data.settings;
      var locationMap = {};
      var itemMap = {};
      var userMap = {};

      data.locations.forEach(function (loc) { locationMap[loc.id] = loc; });
      data.items.forEach(function (item) { itemMap[item.id] = item; });
      data.users.forEach(function (user) { userMap[user.id] = user; });

      var items = data.items.map(function (item) {
        var days = U.daysUntil(item.warrantyEnd);
        var status = "none";
        if (days !== null) {
          status = days < 0 ? "expired" : days <= settings.warrantyLeadDays ? "expiring" : "active";
        }
        return Object.assign({}, item, {
          locationName: locationMap[item.locationId] ? locationMap[item.locationId].name : "Unassigned",
          warrantyDays: days,
          warrantyStatus: status,
          attachmentCount: APP.Model.attachmentsFor(data, "item", item.id).length
        });
      });

      var tasks = data.tasks.map(function (task) {
        var item = itemMap[task.itemId];
        var locId = item ? item.locationId : task.locationId;
        var done = task.scheduleType === "once" && !!task.completedDate;
        var days = done ? null : U.daysUntil(task.nextDue);
        var status = done ? "done" : days === null ? "nodate" : days < 0 ? "overdue" : days <= settings.taskLeadDays ? "soon" : "upcoming";

        return Object.assign({}, task, {
          itemName: item ? item.name : "",
          locationId: locId || "",
          locationName: locationMap[locId] ? locationMap[locId].name : "",
          subject: item ? item.name : (locationMap[locId] ? locationMap[locId].name : "Whole Home"),
          assigneeName: userMap[task.assigneeId] ? userMap[task.assigneeId].name : "",
          scheduleLabel: task.scheduleType === "recurring" ? U.intervalLabel(task.intervalCount, task.intervalUnit) : "One Time",
          isDone: done,
          daysUntil: days,
          dueStatus: status,
          lastDone: task.history.length ? task.history[task.history.length - 1].date : ""
        });
      }).sort(function (a, b) {
        if (a.isDone !== b.isDone) {
          return a.isDone ? 1 : -1;
        }
        return (a.nextDue || "9999") < (b.nextDue || "9999") ? -1 : 1;
      });

      var projects = data.projects.map(function (project) {
        var expenseTotal = project.expenses.reduce(function (s, e) { return s + U.safeNumber(e.amount); }, 0);
        var purchased = 0;
        var toBuy = 0;
        project.supplies.forEach(function (s) {
          var line = U.safeNumber(s.qty || 1) * U.safeNumber(s.cost);
          if (s.purchased) {
            purchased += line;
          } else {
            toBuy += line;
          }
        });
        var spent = expenseTotal + purchased;
        var budget = U.safeNumber(project.budget);

        return Object.assign({}, project, {
          locationName: locationMap[project.locationId] ? locationMap[project.locationId].name : "",
          spent: spent,
          suppliesToBuy: toBuy,
          remaining: budget - spent,
          percentSpent: U.percent(spent, budget),
          isOverBudget: budget > 0 && spent > budget,
          isActive: project.status !== "Complete",
          attachmentCount: APP.Model.attachmentsFor(data, "project", project.id).length
        });
      }).sort(function (a, b) {
        return (a.startDate || "9999") < (b.startDate || "9999") ? -1 : 1;
      });

      var warranties = items.filter(function (i) { return i.warrantyStatus !== "none"; })
        .sort(function (a, b) { return a.warrantyEnd < b.warrantyEnd ? -1 : 1; });

      var openTasks = tasks.filter(function (t) { return !t.isDone; });

      return {
        home: data.home,
        settings: settings,
        locations: data.locations.slice().sort(U.byName),
        items: items,
        paints: data.paints,
        tasks: tasks,
        openTasks: openTasks,
        overdueTasks: openTasks.filter(function (t) { return t.dueStatus === "overdue"; }),
        soonTasks: openTasks.filter(function (t) { return t.dueStatus === "soon"; }),
        projects: projects,
        warranties: warranties,
        expiringWarranties: warranties.filter(function (w) { return w.warrantyStatus === "expiring"; }),
        users: data.users,
        locationMap: locationMap,
        itemMap: itemMap,
        userMap: userMap,
        totals: {
          budget: projects.reduce(function (s, p) { return s + U.safeNumber(p.budget); }, 0),
          spent: projects.reduce(function (s, p) { return s + p.spent; }, 0),
          itemValue: items.reduce(function (s, i) { return s + U.safeNumber(i.purchasePrice); }, 0)
        }
      };
    },

    attachmentsFor: function (data, parentType, parentId) {
      return (data.attachments || []).filter(function (a) {
        return a.parentType === parentType && a.parentId === parentId;
      });
    },

    // Upcoming project milestones within the reminder window.
    projectAlerts: function (model) {
      return model.projects.filter(function (p) {
        if (!p.isActive) {
          return false;
        }
        var start = APP.Utils.daysUntil(p.startDate);
        var end = APP.Utils.daysUntil(p.endDate);
        var lead = model.settings.taskLeadDays;
        return (p.status === "Not Started" && start !== null && start <= lead) ||
          (end !== null && end <= lead);
      });
    }
  };
}());
