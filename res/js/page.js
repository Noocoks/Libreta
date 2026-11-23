/* ==============================
   BREADCRUMBS CONSTANTES
============================== */
var parentOrigin = null;
try {
    parentOrigin = new URL(document.referrer).origin;
} catch (error) {
    parentOrigin = null;
}

window.addEventListener("message", function (e) {

    if (
        e.source !== window.parent ||
        e.origin !== parentOrigin ||
        !e.data ||
        typeof e.data !== "object" ||
        e.data.type !== "breadcrumb" ||
        !Array.isArray(e.data.breadcrumb)
    ) {
        return;
    }

    var breadcrumb =
        document.getElementById(
            "auto-breadcrumb"
        );

    if (!breadcrumb) {

        breadcrumb =
            document.createElement("div");

        breadcrumb.id =
            "auto-breadcrumb";

        var h1 =
            document.querySelector("h1");

        if (h1) {

            h1.parentNode.insertBefore(
                breadcrumb,
                h1
            );
        }
    }

    breadcrumb.replaceChildren();

    window.allowedTreePaths = Array.isArray(e.data.allowedPaths) ? e.data.allowedPaths : [];
    var nodes = e.data.breadcrumb;

    if (!nodes) {
        return;
    }

    for (var i = 0; i < nodes.length; i++) {

        var node = nodes[i];

        if (i < nodes.length - 1) {

            var link =
                document.createElement("a");

            link.href = "#";

            link.textContent =
                node.name;

            link.onclick = function (path) {

                return function (ev) {

                    ev.preventDefault();

                    var normalizedPath = typeof path === "string"
                        ? path.replace(/^\/+/, "")
                        : "";
                    var pathIndex = window.allowedTreePaths.indexOf(normalizedPath);

                    if (pathIndex !== -1) {
                        window.parent.postMessage({
                            type: "navigate",
                            pathIndex: pathIndex
                        }, "*");
                    }

                };

            }(node.path);

            breadcrumb.appendChild(link);

            var sep =
                document.createElement("span");

            sep.className =
                "separator";

            sep.textContent = "›";

            breadcrumb.appendChild(sep);

        } else {

            var current =
                document.createElement("span");

            current.className =
                "current";

            current.textContent =
                node.name;

            breadcrumb.appendChild(current);
        }
    }
});

/* ==============================
   INTERCEPTAR ENLACES INTERNOS (BREADCRUMBS)
============================== */
document.addEventListener("click", function (e) {

    if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
    ) {
        return;
    }

    var link = e.target.closest
        ? e.target.closest("a")
        : null;

    if (
        !link ||
        link.hasAttribute("download") ||
        (link.target && link.target.toLowerCase() !== "_self")
    ) {
        return;
    }

    var href = link.getAttribute("href");

    if (!href || href.trim().startsWith("#")) return;

    var target;

    try {
        target = new URL(href, window.location.href);
    } catch (error) {
        return;
    }

    /* Bloquear protocolos ejecutables; conservar mailto:, tel: y enlaces externos. */
    if (
        target.protocol === "javascript:" ||
        target.protocol === "data:" ||
        target.protocol === "vbscript:"
    ) {
        e.preventDefault();
        return;
    }

    if (
        target.origin !== window.location.origin ||
        (target.protocol !== "http:" && target.protocol !== "https:")
    ) {
        return;
    }

    var allowedPath = null;

    try {
        var basePath = new URL(".", document.referrer).pathname;
        var relative = target.pathname.startsWith(basePath)
            ? decodeURIComponent(target.pathname.slice(basePath.length))
            : "";
        allowedPath = window.allowedTreePaths.indexOf(relative) !== -1 ? relative : null;
    } catch (error) {
        return;
    }

    /*
     * Solo las páginas registradas en el árbol se cargan dentro del
     * enrutador principal. Los recursos internos (imágenes, archivos,
     * documentos o enlaces con fragmentos) conservan su navegación normal.
     */
    if (!allowedPath) {
        return;
    }

    var pathIndex = window.allowedTreePaths.indexOf(allowedPath);
    if (pathIndex === -1) {
        return;
    }

    e.preventDefault();
    window.parent.postMessage({
        type: "navigate",
        pathIndex: pathIndex
    }, "*");

});

/* ==============================
   ATAJOS DE TECLADO DESDE FRAME A "X"
============================== */
document.addEventListener("keydown", function (ev) {

    if (ev.key === "Escape") {
        ev.preventDefault();
        window.parent.postMessage({ type: "toggle-index" }, "*");

        return;
    }

    var target = ev.target;
    var isEditable = target && (
        target.isContentEditable ||
        /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)
    );

    if (ev.key !== "!" || isEditable) {
        return;
    }

    ev.preventDefault();
    window.parent.postMessage({ type: "focus-search" }, "*");
});

/* ==============================
   TAGS INTERACTIVAS
   Selección, deselección y
   sincronización con el buscador.
============================== */

/*INTERACCIÓN DESDE EL FRAME*/
function clearTagSelection() {

    var tags =
        document.querySelectorAll(
            ".tag"
        );

    for (var i = 0; i < tags.length; i++) {

        tags[i].classList.remove(
            "tag-match"
        );
    }
}

/* RESALTADO DESDE ÍNDICE */
window.addEventListener("message", function (e) {

    if (
        e.source !== window.parent ||
        e.origin !== parentOrigin ||
        !e.data ||
        typeof e.data !== "object" ||
        e.data.type !== "highlight-tag"
    ) {
        return;
    }

    clearTagSelection();

    if (!e.data.tag) {
        return;
    }

    var tags =
        document.querySelectorAll(
            ".tag"
        );

    for (var i = 0; i < tags.length; i++) {

        if (
            tags[i].textContent ===
            e.data.tag
        ) {
            tags[i].classList.add(
                "tag-match"
            );
        }
    }
});

/* FILTRADO POR TAGS */
document.addEventListener("click", function (ev) {

    if (!ev.target.classList.contains("tag")) {
        return;
    }

    var tag =
        ev.target.textContent.trim();

    /* si ya está seleccionada, desactivar */
    if (
        ev.target.classList.contains(
            "tag-match"
        )
    ) {

        clearTagSelection();

        window.parent.postMessage({ type: "clear-search" }, "*");

        return;
    }

    clearTagSelection();

    ev.target.classList.add(
        "tag-match"
    );

    window.parent.postMessage({ type: "search-tag", tag: tag }, "*");
});


/* ==============================
   PREFERENCIAS DE LECTURA
   El documento hijo no accede al almacenamiento del padre.
   Solo acepta valores enumerados enviados por la ventana contenedora.
============================== */
(function () {
    "use strict";

    var allowed = {
        textSize: ["small", "normal", "large"],
        readingWidth: ["compact", "normal", "wide"],
        spacing: ["compact", "normal", "relaxed"]
    };

    window.addEventListener("message", function (event) {
        if (event.source !== window.parent ||
            event.origin !== parentOrigin ||
            !event.data ||
            typeof event.data !== "object" ||
            event.data.type !== "reader-preferences") {
            return;
        }

        var values = event.data.preferences;
        if (!values || typeof values !== "object" || Array.isArray(values)) return;

        var normalized = {};
        Object.keys(allowed).forEach(function (key) {
            if (allowed[key].indexOf(values[key]) === -1) return;
            normalized[key] = values[key];
        });

        var page = document.querySelector(".page");
        if (!page) return;

        Object.keys(normalized).forEach(function (key) {
            page.dataset[key === "textSize" ? "textSize" :
                key === "readingWidth" ? "readingWidth" : "spacing"] = normalized[key];
        });
    });
})();


/* ==============================
   ÍNDICE DINÁMICO Y PROGRESO DE LECTURA
============================== */
(function () {
    "use strict";

    function createUniqueHeadingId(heading, usedIds, index) {
        var existing = heading.id;
        if (existing && !usedIds.has(existing)) {
            usedIds.add(existing);
            return existing;
        }

        var label = (heading.textContent || "").replace(/\s+/g, " ").trim();
        if (!label) return null;

        var slug = label.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "seccion";
        var candidate = existing && usedIds.has(existing)
            ? slug + "-seccion"
            : slug;
        var suffix = 2;

        while (usedIds.has(candidate) || document.getElementById(candidate)) {
            candidate = slug + "-" + suffix;
            suffix += 1;
        }

        heading.id = candidate;
        usedIds.add(candidate);
        return candidate;
    }

    function initReadingIndex() {
        var page = document.querySelector(".page");
        if (!page) return;

        var previousIndex = page.querySelector(".reading-index");
        if (previousIndex) previousIndex.remove();
        var previousProgress = document.querySelector(".reading-progress");
        if (previousProgress) previousProgress.remove();

        var headings = Array.prototype.slice.call(
            page.querySelectorAll("h2, h3, h4")
        ).filter(function (heading) {
            return heading.textContent.trim() &&
                !heading.closest("[hidden], [aria-hidden='true']") &&
                heading.getClientRects().length > 0;
        });

        if (!headings.length) return;

        var headingSet = new Set(headings);
        var usedIds = new Set(
            Array.prototype.map.call(document.querySelectorAll("[id]"), function (element) {
                return !headingSet.has(element) ? element.id : "";
            }).filter(Boolean)
        );
        var entries = [];

        headings.forEach(function (heading, index) {
            var id = createUniqueHeadingId(heading, usedIds, index);
            if (id) entries.push({ heading: heading, id: id });
        });

        if (!entries.length) return;

        var progress = document.createElement("progress");
        progress.className = "reading-progress";
        progress.max = 100;
        progress.value = 0;
        progress.setAttribute("role", "progressbar");
        progress.setAttribute("aria-label", "Progreso de lectura");
        progress.setAttribute("aria-valuemin", "0");
        progress.setAttribute("aria-valuemax", "100");
        progress.setAttribute("aria-valuenow", "0");
        document.body.appendChild(progress);

        var nav = document.createElement("nav");
        nav.className = "reading-index";
        nav.setAttribute("aria-label", "Índice del documento");

        var details = document.createElement("details");
        details.className = "reading-index-details";
        details.open = !window.matchMedia("(max-width: 700px)").matches;

        var summary = document.createElement("summary");
        summary.textContent = "En esta página";
        details.appendChild(summary);

        var list = document.createElement("ol");
        list.className = "reading-index-list";

        entries.forEach(function (entry) {
            var item = document.createElement("li");
            item.className = "reading-index-item";
            item.dataset.level = entry.heading.tagName.toLowerCase();

            var link = document.createElement("a");
            link.href = "#" + encodeURIComponent(entry.id);
            link.textContent = entry.heading.textContent.replace(/\s+/g, " ").trim();
            link.addEventListener("click", function () {
                setActive(entry.id);
                if (window.matchMedia("(max-width: 700px)").matches) {
                    details.open = false;
                }
            });

            item.appendChild(link);
            list.appendChild(item);
        });

        details.appendChild(list);
        nav.appendChild(details);

        var firstHeading = page.querySelector("h1");
        if (firstHeading && firstHeading.parentNode) {
            firstHeading.parentNode.insertBefore(nav, firstHeading.nextSibling);
        } else {
            page.insertBefore(nav, page.firstChild);
        }

        function setActive(id) {
            var items = list.querySelectorAll("a");
            items.forEach(function (link) {
                var active = decodeURIComponent(link.hash.slice(1)) === id;
                if (active) link.setAttribute("aria-current", "location");
                else link.removeAttribute("aria-current");
            });
        }

        function updateProgress() {
            var doc = document.documentElement;
            var maxScroll = Math.max(0, doc.scrollHeight - window.innerHeight);
            var percent = maxScroll > 0
                ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100))
                : 100;
            var value = Math.round(percent);
            progress.value = value;
            progress.setAttribute("aria-valuenow", String(value));
            progress.setAttribute("aria-valuetext", value + "% leído");
        }

        if ("IntersectionObserver" in window) {
            var observer = new IntersectionObserver(function (observations) {
                var visible = observations.filter(function (item) {
                    return item.isIntersecting;
                }).sort(function (a, b) {
                    return a.boundingClientRect.top - b.boundingClientRect.top;
                });
                if (visible.length) setActive(visible[0].target.id);
            }, {
                rootMargin: "-12% 0px -72% 0px",
                threshold: 0
            });
            entries.forEach(function (entry) {
                observer.observe(entry.heading);
            });
        } else {
            window.addEventListener("scroll", function () {
                var current = entries[0];
                entries.forEach(function (entry) {
                    if (entry.heading.getBoundingClientRect().top <= 140) current = entry;
                });
                if (current) setActive(current.id);
            }, { passive: true });
        }

        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);
        updateProgress();

        if (window.location.hash) {
            var targetId;
            try {
                targetId = decodeURIComponent(window.location.hash.slice(1));
            } catch (error) {
                targetId = "";
            }
            if (entries.some(function (entry) { return entry.id === targetId; })) {
                setActive(targetId);
            }
        }

    }

    window.initReadingIndex = initReadingIndex;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initReadingIndex, { once: true });
    } else {
        initReadingIndex();
    }
})();
