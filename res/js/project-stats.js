/* ==============================
   ESTADÍSTICAS AUTOMÁTICAS
============================== */

(function () {
    "use strict";

    var STATS_URL = "/Libreta/res/json/project-stats.json";

    function formatNumber(value) {
        return new Intl.NumberFormat("es-ES").format(value);
    }

    function renderStats(data) {
        var loading = document.querySelector(".project-stats-loading");
        var content = document.querySelector(".project-stats-data");
        var error = document.querySelector(".project-stats-error");
        var languages = document.querySelector(".project-stats-languages");
        var total = document.querySelector(".project-stats-total-value");
        var date = document.querySelector(".project-stats-date");

        if (!loading || !content || !languages || !total || !date) return;

        languages.textContent = "";

        data.languages.forEach(function (language) {
            var row = document.createElement("div");
            var label = document.createElement("span");
            var value = document.createElement("strong");

            row.className = "project-stats-row";
            label.textContent = language.label;
            value.textContent = formatNumber(language.lines);

            row.appendChild(label);
            row.appendChild(value);
            languages.appendChild(row);
        });

        total.textContent = formatNumber(data.total_lines) + " líneas";

        var generatedAt = new Date(data.generated_at);
        date.textContent = "Actualizado: " +
            generatedAt.toLocaleString("es-ES", {
                dateStyle: "short",
                timeStyle: "short",
                timeZone: "Europe/Madrid"
            });

        loading.hidden = true;
        content.hidden = false;

        if (error) error.hidden = true;
    }

    function showError() {
        var loading = document.querySelector(".project-stats-loading");
        var error = document.querySelector(".project-stats-error");

        if (loading) loading.hidden = true;
        if (error) error.hidden = false;
    }

    function loadStats() {
        fetch(STATS_URL + "?v=" + Date.now(), {
            cache: "no-store"
        })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("No se pudieron cargar las estadísticas");
                }

                return response.json();
            })
            .then(renderStats)
            .catch(function (error) {
                console.error("Error cargando estadísticas:", error);
                showError();
            });
    }

    document.addEventListener("DOMContentLoaded", loadStats);
})();
