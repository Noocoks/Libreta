/* ==============================
   PANEL DE CONOCIMIENTO
   Métricas derivadas exclusivamente de res/json/tree.json.
============================== */
(function () {
    "use strict";

    var TREE_URL = new URL("res/json/tree.json", document.baseURI).href;
    var MAX_RESPONSE_BYTES = 128 * 1024;
    var MAX_NODES = 1000;
    var MAX_DEPTH = 12;
    var MAX_NAME_LENGTH = 100;
    var MAX_TAG_LENGTH = 50;
    var MAX_VISIBLE_TAGS = 12;

    function formatNumber(value) {
        return new Intl.NumberFormat("es-ES").format(value);
    }

    function readJsonLimited(response) {
        var declaredLength = Number(response.headers.get("content-length") || 0);
        if (declaredLength > MAX_RESPONSE_BYTES) {
            return Promise.reject(new Error("El índice supera el tamaño permitido"));
        }

        if (!response.body || typeof response.body.getReader !== "function") {
            return response.text().then(function (text) {
                if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
                    throw new Error("El índice supera el tamaño permitido");
                }
                return JSON.parse(text);
            });
        }

        var reader = response.body.getReader();
        var chunks = [];
        var totalBytes = 0;

        function readNext() {
            return reader.read().then(function (part) {
                if (part.done) {
                    var bytes = new Uint8Array(totalBytes);
                    var offset = 0;
                    chunks.forEach(function (chunk) {
                        bytes.set(chunk, offset);
                        offset += chunk.byteLength;
                    });
                    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
                }

                totalBytes += part.value.byteLength;
                if (totalBytes > MAX_RESPONSE_BYTES) {
                    return reader.cancel().then(function () {
                        throw new Error("El índice supera el tamaño permitido");
                    });
                }
                chunks.push(part.value);
                return readNext();
            });
        }

        return readNext().finally(function () {
            reader.releaseLock();
        });
    }

    function isValidPath(path) {
        if (typeof path !== "string" ||
            path.length === 0 ||
            path.length > 240 ||
            !path.startsWith("subpags/") ||
            /[\\\\\u0000-\u001f?#%]/.test(path)) {
            return false;
        }

        var segments = path.split("/");
        var fileName = segments[segments.length - 1];

        return segments.length >= 2 &&
            segments.every(function (segment) {
                return /^[A-Za-z0-9._-]+$/.test(segment) &&
                    segment !== "." && segment !== "..";
            }) &&
            /^[A-Za-z0-9._-]+\.html$/.test(fileName);
    }

    function collectKnowledge(tree) {
        if (!tree || typeof tree !== "object" || Array.isArray(tree) ||
            typeof tree.title !== "string" || !Array.isArray(tree.sections) ||
            tree.sections.length > 30) {
            throw new Error("La estructura del índice no es válida");
        }

        var totalPages = 0;
        var taggedPages = 0;
        var maxDepth = 0;
        var seenPaths = new Set();
        var tagCounts = new Map();
        var areas = [];
        var queue = [];

        tree.sections.forEach(function (section) {
            if (!section || typeof section !== "object" || Array.isArray(section) ||
                typeof section.name !== "string" || !section.name.trim() ||
                section.name.length > MAX_NAME_LENGTH || !isValidPath(section.path)) {
                throw new Error("Hay una categoría principal no válida");
            }
            areas.push({
                name: section.name,
                path: section.path,
                pages: 0
            });
            queue.push({
                node: section,
                areaIndex: areas.length - 1,
                depth: 1
            });
        });

        var visited = 0;
        while (queue.length) {
            var current = queue.shift();
            var node = current.node;
            visited += 1;

            if (visited > MAX_NODES || current.depth > MAX_DEPTH ||
                typeof node.name !== "string" || !node.name.trim() ||
                node.name.length > MAX_NAME_LENGTH || !isValidPath(node.path) ||
                seenPaths.has(node.path)) {
                throw new Error("El índice contiene una entrada no válida");
            }

            seenPaths.add(node.path);
            totalPages += 1;
            areas[current.areaIndex].pages += 1;
            maxDepth = Math.max(maxDepth, current.depth);

            if (node.tags !== undefined) {
                if (!Array.isArray(node.tags) || node.tags.length > 30 ||
                    !node.tags.every(function (tag) {
                        return typeof tag === "string" && tag.trim() &&
                            tag.length <= MAX_TAG_LENGTH;
                    })) {
                    throw new Error("El índice contiene etiquetas no válidas");
                }

                var pageTags = new Set(node.tags);
                if (pageTags.size) taggedPages += 1;
                pageTags.forEach(function (tag) {
                    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                });
            }

            if (node.children !== undefined) {
                if (!Array.isArray(node.children) || node.children.length > MAX_NODES) {
                    throw new Error("La jerarquía del índice no es válida");
                }
                node.children.forEach(function (child) {
                    queue.push({
                        node: child,
                        areaIndex: current.areaIndex,
                        depth: current.depth + 1
                    });
                });
            }
        }

        var tags = Array.from(tagCounts.entries()).map(function (entry) {
            return { name: entry[0], count: entry[1] };
        }).sort(function (a, b) {
            return b.count - a.count || a.name.localeCompare(b.name, "es");
        });

        return {
            totalPages: totalPages,
            areaCount: areas.length,
            taggedPages: taggedPages,
            uniqueTags: tags.length,
            maxDepth: maxDepth,
            areas: areas,
            tags: tags.slice(0, MAX_VISIBLE_TAGS)
        };
    }

    function createElement(tagName, className, text) {
        var element = document.createElement(tagName);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    function renderMetric(container, label, value) {
        var card = createElement("div", "knowledge-metric");
        card.appendChild(createElement("span", "knowledge-metric-label", label));
        card.appendChild(createElement("strong", "knowledge-metric-value", formatNumber(value)));
        container.appendChild(card);
    }

    function renderKnowledge(stats) {
        var root = document.getElementById("knowledge-dashboard-content");
        var loading = document.getElementById("knowledge-dashboard-loading");
        var error = document.getElementById("knowledge-dashboard-error");
        var metrics = document.getElementById("knowledge-dashboard-metrics");
        var areas = document.getElementById("knowledge-dashboard-areas");
        var tags = document.getElementById("knowledge-dashboard-tags");

        if (!root || !loading || !error || !metrics || !areas || !tags) return;

        metrics.replaceChildren();
        areas.replaceChildren();
        tags.replaceChildren();

        renderMetric(metrics, "Páginas en el índice", stats.totalPages);
        renderMetric(metrics, "Áreas principales", stats.areaCount);
        renderMetric(metrics, "Páginas etiquetadas", stats.taggedPages);
        renderMetric(metrics, "Etiquetas únicas", stats.uniqueTags);

        var heading = createElement("h3", "knowledge-section-title", "Distribución por área");
        areas.appendChild(heading);

        stats.areas.forEach(function (area) {
            var row = createElement("div", "knowledge-area-row");
            var meta = createElement("div", "knowledge-area-meta");
            meta.appendChild(createElement("span", "knowledge-area-name", area.name));
            meta.appendChild(createElement("strong", "knowledge-area-count", formatNumber(area.pages)));
            var progress = document.createElement("progress");
            progress.className = "knowledge-area-progress";
            progress.max = stats.totalPages;
            progress.value = area.pages;
            progress.setAttribute("aria-label", area.name + ": " + formatNumber(area.pages) + " páginas");
            row.appendChild(meta);
            row.appendChild(progress);
            areas.appendChild(row);
        });

        tags.appendChild(createElement("h3", "knowledge-section-title", "Temas más documentados"));
        var tagList = createElement("div", "knowledge-tag-list");
        if (!stats.tags.length) {
            tagList.appendChild(createElement("p", "knowledge-empty", "Todavía no hay etiquetas."));
        } else {
            stats.tags.forEach(function (tag) {
                var chip = createElement("span", "knowledge-tag");
                chip.appendChild(createElement("span", "knowledge-tag-name", tag.name));
                chip.appendChild(createElement("strong", "knowledge-tag-count", formatNumber(tag.count)));
                tagList.appendChild(chip);
            });
        }
        tags.appendChild(tagList);

        var previousNote = root.querySelector(".knowledge-dashboard-note");
        if (previousNote) previousNote.remove();
        var note = createElement("p", "knowledge-dashboard-note",
            "Datos calculados automáticamente desde el árbol de documentación. Profundidad máxima: " +
            formatNumber(stats.maxDepth) + " niveles.");
        root.appendChild(note);

        loading.hidden = true;
        error.hidden = true;
        root.hidden = false;
    }

    function showError() {
        var loading = document.getElementById("knowledge-dashboard-loading");
        var root = document.getElementById("knowledge-dashboard-content");
        var error = document.getElementById("knowledge-dashboard-error");
        if (loading) loading.hidden = true;
        if (root) root.hidden = true;
        if (error) error.hidden = false;
    }

    function loadKnowledge() {
        var loading = document.getElementById("knowledge-dashboard-loading");
        var root = document.getElementById("knowledge-dashboard-content");
        var error = document.getElementById("knowledge-dashboard-error");
        if (!loading || !root || !error) return;

        loading.hidden = false;
        root.hidden = true;
        error.hidden = true;

        fetch(TREE_URL, {
            cache: "no-store",
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
        }).then(function (response) {
            if (!response.ok) throw new Error("No se pudo cargar el índice");
            if (response.redirected || new URL(response.url).origin !== window.location.origin) {
                throw new Error("Origen del índice no permitido");
            }
            if (!(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
                throw new Error("Tipo de contenido inesperado");
            }
            return readJsonLimited(response);
        }).then(function (tree) {
            renderKnowledge(collectKnowledge(tree));
        }).catch(function (loadError) {
            console.error("Error cargando el panel de conocimiento:", loadError);
            showError();
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        var retry = document.getElementById("knowledge-dashboard-retry");
        if (retry) retry.addEventListener("click", loadKnowledge);
        loadKnowledge();
    });
})();
