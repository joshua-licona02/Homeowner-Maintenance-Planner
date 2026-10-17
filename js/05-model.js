(function () {
  "use strict";

  APP.Model = {
    build: function (data) {
      var roomMap = {};
      var assetMap = {};

      data.rooms.forEach(function (room) {
        roomMap[room.id] = room;
      });

      data.inventory.forEach(function (asset) {
        assetMap[asset.id] = asset;
      });

      var assets = data.inventory.map(function (asset) {
        return {
          id: asset.id,
          name: asset.name,
          category: asset.category,
          roomName: asset.roomId && roomMap[asset.roomId] ? roomMap[asset.roomId].name : "Whole Home / Unassigned",
          brand: asset.brand,
          model: asset.model,
          serial: asset.serial,
          receivedDate: asset.receivedDate,
          installDate: asset.installDate,
          warrantyEnd: asset.warrantyEnd,
          condition: asset.condition,
          notes: asset.notes,
          warrantyDaysRemaining: APP.Utils.daysUntil(asset.warrantyEnd)
        };
      });

      var tasks = data.tasks.map(function (task) {
        var daysUntil = APP.Utils.daysUntil(task.dueDate);

        return {
          id: task.id,
          title: task.title,
          dueDate: task.dueDate,
          frequency: task.frequency,
          status: task.status,
          priority: task.priority,
          roomName: task.roomId && roomMap[task.roomId] ? roomMap[task.roomId].name : "Whole Home",
          assetName: task.assetId && assetMap[task.assetId] ? assetMap[task.assetId].name : "—",
          notes: task.notes,
          daysUntil: daysUntil,
          isOverdue: task.status !== "Complete" && daysUntil !== null && daysUntil < 0,
          isDueSoon: task.status !== "Complete" && daysUntil !== null &&
            daysUntil >= 0 && daysUntil <= APP.Config.dateWarningDays
        };
      });

      var projects = data.projects.map(function (project) {
        var budget = Number(project.budget || 0);
        var spent = Number(project.spent || 0);

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          budget: budget,
          spent: spent,
          remaining: budget - spent,
          percentSpent: APP.Utils.percent(spent, budget),
          isOverBudget: spent > budget && budget > 0,
          startDate: project.startDate,
          endDate: project.endDate,
          notes: project.notes
        };
      });

      return {
        home: data.home,
        rooms: data.rooms,
        assets: assets,
        tasks: tasks,
        projects: projects,
        roomMap: roomMap,
        assetMap: assetMap
      };
    }
  };
}());