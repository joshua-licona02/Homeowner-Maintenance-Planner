(function () {
  "use strict";

  APP.Charts = (function () {
    var instances = {};

    function destroy(id) {
      if (instances[id] && typeof instances[id].destroy === "function") {
        instances[id].destroy();
      }

      instances[id] = null;
    }

    function buildProjectSpend(canvasId, projects) {
      if (!window.Chart) {
        return false;
      }

      var canvas = document.getElementById(canvasId);
      if (!canvas) {
        return false;
      }

      destroy(canvasId);

      instances[canvasId] = new Chart(canvas, {
        type: "bar",
        data: {
          labels: projects.map(function (project) { return project.name; }),
          datasets: [
            {
              label: "Budget",
              data: projects.map(function (project) { return project.budget; }),
              backgroundColor: "rgba(97, 167, 255, .45)",
              borderColor: "#61a7ff",
              borderWidth: 1,
              borderRadius: 5
            },
            {
              label: "Spent",
              data: projects.map(function (project) { return project.spent; }),
              backgroundColor: "rgba(74, 198, 151, .6)",
              borderColor: "#4ac697",
              borderWidth: 1,
              borderRadius: 5
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: "#c6d4e5",
                boxWidth: 11
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  return context.dataset.label + ": " + APP.Utils.currency(context.raw);
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: "#9caec3",
                maxRotation: 0,
                autoSkip: true
              },
              grid: { display: false }
            },
            y: {
              beginAtZero: true,
              ticks: {
                color: "#9caec3",
                callback: function (value) {
                  return "$" + APP.Utils.number(value);
                }
              },
              grid: { color: "rgba(156, 174, 195, .12)" }
            }
          }
        }
      });

      return true;
    }

    return {
      buildProjectSpend: buildProjectSpend
    };
  }());
}());