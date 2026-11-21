/* ==============================
   ESTADÍSTICAS AUTOMÁTICAS
============================== */

(function () {
    "use strict";

    var STATS_URL = new URL("res/json/project-stats.json", document.baseURI).href;
    var MAX_RESPONSE_BYTES = 32 * 1024;
    var MAX_LANGUAGES = 20;
    var MAX_LABEL_LENGTH = 60;
    var MAX_LINE_COUNT = 100000000;

    function formatNumber(value) {
        return new Intl.NumberFormat("es-ES").format(value);
    }

    async function readLimitedJson(response) {
        var declaredLength = Number(response.headers.get("content-length") || 0);
        if (declaredLength > MAX_RESPONSE_BYTES) {
            throw new Error("La respuesta de estadísticas supera el tamaño permitido");
        }
        if (!response.body || typeof response.body.getReader !== "function") {
            var fallback = await response.text();
            if (new TextEncoder().encode(fallback).byteLength > MAX_RESPONSE_BYTES) {
                throw new Error("La respuesta de estadísticas supera el tamaño permitido");
            }
            return JSON.parse(fallback);
        }

        var reader = response.body.getReader();
        var chunks = [];
        var totalBytes = 0;
        try {
            while (true) {
                var part = await reader.read();
                if (part.done) break;
                totalBytes += part.value.byteLength;
                if (totalBytes > MAX_RESPONSE_BYTES) {
                    await reader.cancel();
                    throw new Error("La respuesta de estadísticas supera el tamaño permitido");
                }
                chunks.push(part.value);
            }
        } finally {
            reader.releaseLock();
        }

        var bytes = new Uint8Array(totalBytes);
        var offset = 0;
        chunks.forEach(function (chunk) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
        });
        return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    }

    function validateStats(data) {
        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data) ||
            !Array.isArray(data.languages) ||
            data.languages.length === 0 ||
            data.languages.length > MAX_LANGUAGES ||
            !Number.isSafeInteger(data.total_lines) ||
            data.total_lines < 0 ||
            data.total_lines > MAX_LINE_COUNT ||
            typeof data.generated_at !== "string" ||
            data.generated_at.length > 40 ||
            !Number.isFinite(Date.parse(data.generated_at)) ||
            data.languages.some(function (language) {
                return !language ||
                    typeof language !== "object" ||
                    Array.isArray(language) ||
                    typeof language.label !== "string" ||
                    !language.label.trim() ||
                    language.label.length > MAX_LABEL_LENGTH ||
                    !Number.isSafeInteger(language.lines) ||
                    language.lines < 0 ||
                    language.lines > MAX_LINE_COUNT;
            })
        ) {
            throw new Error("Formato de estadísticas no válido");
        }

        var labels = data.languages.map(function (language) {
            return language.label.trim().toLocaleLowerCase("es");
        });
        if (new Set(labels).size !== labels.length) {
            throw new Error("Hay lenguajes duplicados en las estadísticas");
        }
        return data;
    }

    function renderStats(rawData) {
        var data = validateStats(rawData);
        var loading = document.querySelector(".project-stats-loading");
        var content = document.querySelector(".project-stats-data");
        var error = document.querySelector(".project-stats-error");
        var languages = document.querySelector(".project-stats-languages");
        var total = document.querySelector(".project-stats-total-value");
        var date = document.querySelector(".project-stats-date");

        if (!loading || !content || !languages || !total || !date) return;
        languages.replaceChildren();

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
        date.textContent = "Actualizado: " + new Date(data.generated_at).toLocaleString("es-ES", {
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

    async function loadStats() {
        try {
            var response = await fetch(STATS_URL, {
                cache: "no-store",
                credentials: "same-origin",
                headers: { "Accept": "application/json" }
            });
            if (!response.ok) throw new Error("No se pudieron cargar las estadísticas");
            var contentType = response.headers.get("content-type") || "";
            if (!contentType.toLowerCase().includes("application/json")) {
                throw new Error("Tipo de contenido inesperado en estadísticas");
            }
            renderStats(await readLimitedJson(response));
        } catch (error) {
            console.error("Error cargando estadísticas:", error);
            showError();
        }
    }

    document.addEventListener("DOMContentLoaded", loadStats);
})();
