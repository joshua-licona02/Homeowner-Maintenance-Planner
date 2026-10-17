(function () {
  "use strict";

  APP.Analytics = {
    build: function (model) {
      var openTasks = model.tasks.filter(function (task) {
        return task.status !== "Complete";
      });

      var overdueTasks = openTasks.filter(function (task) {
        return task.isOverdue;
      });

      var dueSoonTasks = openTasks.filter(function (task) {
        return task.isDueSoon;
      });

      var warrantyExpiring = model.assets.filter(function (asset) {
        return asset.warrantyDaysRemaining !== null &&
          asset.warrantyDaysRemaining >= 0 &&
          asset.warrantyDaysRemaining <= 90;
      });

      var totalBudget = model.projects.reduce(function (sum, project) {
        return sum + project.budget;
      }, 0);

      var totalSpent = model.projects.reduce(function (sum, project) {
        return sum + project.spent;
      }, 0);

      var findings = [];

      overdueTasks.forEach(function (task) {
        findings.push({
          type: "danger",
          title: "Overdue maintenance: " + task.title,
          detail: "Was due " + Math.abs(task.daysUntil) + " day(s) ago."
        });
      });

      dueSoonTasks.forEach(function (task) {
        findings.push({
          type: "warning",
          title: "Maintenance due soon: " + task.title,
          detail: "Due in " + task.daysUntil + " day(s)."
        });
      });

      warrantyExpiring.forEach(function (asset) {
        findings.push({
          type: "warning",
          title: "Warranty review: " + asset.name,
          detail: "Warranty expires in " + asset.warrantyDaysRemaining + " day(s)."
        });
      });

      model.projects.filter(function (project) {
        return project.isOverBudget;
      }).forEach(function (project) {
        findings.push({
          type: "danger",
          title: "Project over budget: " + project.name,
          detail: "Current spend exceeds plan by " + APP.Utils.currency(Math.abs(project.remaining)) + "."
        });
      });

      if (!findings.length) {
        findings.push({
          type: "info",
          title: "No immediate issues identified",
          detail: "Your recorded maintenance schedule, warranties, and project budgets are currently within normal thresholds."
        });
      }

      return {
        metrics: {
          assetCount: model.assets.length,
          roomCount: model.rooms.length,
          openTaskCount: openTasks.length,
          overdueTaskCount: overdueTasks.length,
          projectBudget: totalBudget,
          projectSpent: totalSpent,
          budgetPercent: APP.Utils.percent(totalSpent, totalBudget)
        },
        findings: findings.slice(0, 8),
        dueTasks: overdueTasks.concat(dueSoonTasks)
          .sort(function (a, b) { return (a.daysUntil || 0) - (b.daysUntil || 0); })
          .slice(0, 7),
        projectSpend: model.projects.slice(0, 8)
      };
    }
  };
}());