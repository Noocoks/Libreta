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

    var cleanupReadingIndex = null;

    function createUniqueHeadingId(heading, usedIds) {
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
        if (cleanupReadingIndex) {
            cleanupReadingIndex();
            cleanupReadingIndex = null;
        }

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
            var id = createUniqueHeadingId(heading, usedIds);
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

        var observer = null;
        var fallbackScrollHandler = null;

        if ("IntersectionObserver" in window) {
            observer = new IntersectionObserver(function (observations) {
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
            fallbackScrollHandler = function () {
                var current = entries[0];
                entries.forEach(function (entry) {
                    if (entry.heading.getBoundingClientRect().top <= 140) current = entry;
                });
                if (current) setActive(current.id);
            };
            window.addEventListener("scroll", fallbackScrollHandler, { passive: true });
        }

        function handleHashChange() {
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

        window.addEventListener("scroll", updateProgress, { passive: true });
        window.addEventListener("resize", updateProgress);
        window.addEventListener("hashchange", handleHashChange);
        cleanupReadingIndex = function () {
            if (observer) observer.disconnect();
            if (fallbackScrollHandler) {
                window.removeEventListener("scroll", fallbackScrollHandler);
            }
            window.removeEventListener("scroll", updateProgress);
            window.removeEventListener("resize", updateProgress);
            window.removeEventListener("hashchange", handleHashChange);
        };
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


/* ==============================
   BLOQUES DE CÓDIGO AVANZADOS
   Copia limpia, lenguaje, líneas y plegado sin dependencias externas.
============================== */
(function () {
    "use strict";

    var LANGUAGE_LABELS = {
        bash: "Bash", shell: "Shell", sh: "Shell",
        javascript: "JavaScript", js: "JavaScript",
        python: "Python", py: "Python", json: "JSON", css: "CSS"
    };

    var KEYWORDS = {
        javascript: "const let var function return if else for while switch case break continue class new this async await try catch throw import export from default true false null undefined typeof instanceof",
        js: "const let var function return if else for while switch case break continue class new this async await try catch throw import export from default true false null undefined typeof instanceof",
        python: "def class return if elif else for while in break continue import from as try except finally raise with lambda yield async await pass True False None and or not is",
        py: "def class return if elif else for while in break continue import from as try except finally raise with lambda yield async await pass True False None and or not is",
        json: "true false null",
        bash: "if then else elif fi for while do done case esac function export local readonly sudo",
        sh: "if then else elif fi for while do done case esac function export local readonly sudo",
        shell: "if then else elif fi for while do done case esac function export local readonly sudo",
        css: "important"
    };

    function normalizeLanguage(value) {
        if (typeof value !== "string") return "";
        var language = value.trim().toLowerCase().replace(/^language-/, "").replace(/^lang-/, "");
        if (language === "zsh") return "shell";
        return Object.prototype.hasOwnProperty.call(LANGUAGE_LABELS, language) ? language : "";
    }

    function inferLanguage(pre, code, source) {
        var candidates = [
            code.getAttribute("data-language"),
            pre.getAttribute("data-language"),
            code.className,
            pre.className
        ];

        for (var i = 0; i < candidates.length; i += 1) {
            var candidate = candidates[i] || "";
            var match = candidate.match(/(?:^|\s)(?:language|lang)-([a-z0-9+#.-]+)/i);
            var normalized = normalizeLanguage(match ? match[1] : candidate);
            if (normalized) return normalized;
        }

        var filename = pre.closest(".code-card");
        var title = filename && filename.querySelector(".code-header strong");
        var extension = title && title.textContent.match(/\.([a-z0-9]+)\s*$/i);
        if (extension) {
            var byExtension = {
                sh: "bash", bash: "bash", js: "javascript", mjs: "javascript",
                py: "python", json: "json", css: "css"
            };
            if (byExtension[extension[1].toLowerCase()]) return byExtension[extension[1].toLowerCase()];
        }

        if (/^#!.*\b(?:python|python3)\b/.test(source)) return "python";
        if (/^#!.*\b(?:bash|sh)\b/.test(source)) return "bash";
        return "";
    }

    function appendTokenizedLine(container, line, language) {
        var keywords = (KEYWORDS[language] || "").split(/\s+/);
        var pattern = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\x60(?:\\.|[^\x60\\])*\x60|\/\/.*|#.*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
        var cursor = 0;
        var match;

        while ((match = pattern.exec(line))) {
            if (match.index > cursor) {
                container.appendChild(document.createTextNode(line.slice(cursor, match.index)));
            }

            var token = match[0];
            var className = "";
            if (/^(["'\x60])/.test(token)) className = "code-token-string";
            else if (/^(\/\/|#)/.test(token)) className = "code-token-comment";
            else if (/^\d/.test(token)) className = "code-token-number";
            else if (keywords.indexOf(token) !== -1) className = "code-token-keyword";

            if (className) {
                var span = document.createElement("span");
                span.className = className;
                span.textContent = token;
                container.appendChild(span);
            } else {
                container.appendChild(document.createTextNode(token));
            }
            cursor = pattern.lastIndex;
        }

        if (cursor < line.length) container.appendChild(document.createTextNode(line.slice(cursor)));
    }

    function createCodeShell(pre, code, source, lineCount, language) {
        var shell = document.createElement("div");
        shell.className = "code-block-shell";

        var gutter = document.createElement("ol");
        gutter.className = "code-block-line-gutter";
        gutter.setAttribute("aria-hidden", "true");
        gutter.hidden = true;

        var normalized = source.replace(/\r\n?/g, "\n");
        var lines = normalized.split("\n");
        var hasTrailingNewline = lines.length > 1 && lines[lines.length - 1] === "";
        if (hasTrailingNewline) lines.pop();
        lines.forEach(function (line, index) {
            var lineElement = document.createElement("span");
            lineElement.className = "code-line";
            appendTokenizedLine(lineElement, line, language);
            code.appendChild(lineElement);
            if (index < lines.length - 1 || hasTrailingNewline) {
                code.appendChild(document.createTextNode("\n"));
            }

            var number = document.createElement("li");
            number.textContent = String(index + 1);
            gutter.appendChild(number);
        });

        shell.appendChild(gutter);
        shell.dataset.lineCount = String(lineCount);
        return { shell: shell, gutter: gutter };
    }

    function copyWithFallback(text) {
        var textarea = document.createElement("textarea");
        textarea.className = "code-copy-fallback";
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        var copied = false;
        try {
            copied = document.execCommand("copy");
        } catch (error) {
            copied = false;
        }
        textarea.remove();
        return copied;
    }

    function copyText(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            return navigator.clipboard.writeText(text).then(function () {
                return true;
            }).catch(function () {
                return copyWithFallback(text);
            });
        }
        return Promise.resolve(copyWithFallback(text));
    }

    function createToolbar(language, lineCount, shell, gutter, source) {
        var toolbar = document.createElement("div");
        toolbar.className = "code-block-toolbar";

        var metadata = document.createElement("div");
        metadata.className = "code-block-metadata";

        if (language) {
            var languageLabel = document.createElement("span");
            languageLabel.className = "code-block-language";
            languageLabel.textContent = LANGUAGE_LABELS[language];
            metadata.appendChild(languageLabel);
        }

        var count = document.createElement("span");
        count.className = "code-block-line-count";
        count.textContent = lineCount + (lineCount === 1 ? " línea" : " líneas");
        metadata.appendChild(count);

        var actions = document.createElement("div");
        actions.className = "code-block-actions";

        var lineButton = document.createElement("button");
        lineButton.className = "code-block-lines-toggle";
        lineButton.type = "button";
        lineButton.textContent = "N.º líneas";
        lineButton.setAttribute("aria-pressed", "false");
        lineButton.addEventListener("click", function () {
            var active = lineButton.getAttribute("aria-pressed") !== "true";
            lineButton.setAttribute("aria-pressed", String(active));
            shell.classList.toggle("has-line-numbers", active);
            gutter.hidden = !active;
        });

        var copyButton = document.createElement("button");
        copyButton.className = "code-block-copy";
        copyButton.type = "button";
        copyButton.textContent = "Copiar";
        var status = document.createElement("span");
        status.className = "code-block-copy-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");

        copyButton.addEventListener("click", function () {
            copyButton.disabled = true;
            copyText(source).then(function (success) {
                copyButton.textContent = success ? "Copiado" : "Error al copiar";
                status.textContent = success
                    ? "Código copiado al portapapeles."
                    : "No se ha podido copiar el código. Selecciónalo manualmente.";
            }).catch(function () {
                copyButton.textContent = "Error al copiar";
                status.textContent = "No se ha podido copiar el código. Selecciónalo manualmente.";
            }).finally(function () {
                copyButton.disabled = false;
            });
        });

        actions.appendChild(lineButton);
        actions.appendChild(copyButton);
        toolbar.appendChild(metadata);
        toolbar.appendChild(actions);
        toolbar.appendChild(status);
        return toolbar;
    }

    function enhanceCodeBlock(pre) {
        if (pre.dataset.codeEnhanced === "true") return;
        pre.dataset.codeEnhanced = "true";

        var code = pre.querySelector(":scope > code");
        if (!code) {
            code = document.createElement("code");
            while (pre.firstChild) code.appendChild(pre.firstChild);
            pre.appendChild(code);
        }

        var source = code.textContent || "";
        var language = inferLanguage(pre, code, source);
        var normalized = source.replace(/\r\n?/g, "\n");
        var lines = normalized.split("\n");
        var lineCount = Math.max(1, lines.length - (lines.length > 1 && lines[lines.length - 1] === "" ? 1 : 0));

        code.replaceChildren();

        var built = createCodeShell(pre, code, source, lineCount, language);
        var toolbar = createToolbar(language, lineCount, built.shell, built.gutter, source);

        var existingCard = pre.closest(".code-card");
        var existingDetails = pre.closest("details");
        if (existingCard) {
            var descriptor = existingCard.querySelector(".code-header span");
            if (descriptor) {
                descriptor.textContent = (language ? LANGUAGE_LABELS[language] : "Código") +
                    " · " + lineCount + (lineCount === 1 ? " línea" : " líneas");
            }
        }

        if (!existingDetails && lineCount >= 18) {
            var details = document.createElement("details");
            details.className = "code-block-fold";
            var summary = document.createElement("summary");
            summary.textContent = (language ? LANGUAGE_LABELS[language] : "Código") +
                " · " + lineCount + " líneas";
            pre.parentNode.replaceChild(details, pre);
            details.appendChild(summary);
            details.appendChild(toolbar);
            details.appendChild(built.shell);
            built.shell.appendChild(pre);
        } else {
            pre.parentNode.insertBefore(toolbar, pre);
            pre.parentNode.replaceChild(built.shell, pre);
            built.shell.appendChild(pre);
        }
    }

    function initCodeBlocks() {
        var page = document.querySelector(".page");
        if (!page) return;
        page.querySelectorAll("pre").forEach(enhanceCodeBlock);
    }

    window.initCodeBlocks = initCodeBlocks;
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initCodeBlocks, { once: true });
    } else {
        initCodeBlocks();
    }
})();


/* ==============================
   EXPORTACIÓN A PDF
   Utiliza el diálogo nativo del navegador; no transmite el documento.
============================== */
(function () {
    "use strict";

    function initPdfExport() {
        var page = document.querySelector(".page");
        if (!page || page.querySelector(".page-export-toolbar")) return;

        var collapsedDetails = [];

        function preparePrintDetails() {
            collapsedDetails = [];
            var detailsElements = page.querySelectorAll("details:not([open])");
            for (var i = 0; i < detailsElements.length; i++) {
                var details = detailsElements[i];
                collapsedDetails.push(details);
                details.open = true;
            }
        }

        function restorePrintDetails() {
            collapsedDetails.forEach(function (details) {
                details.open = false;
            });
            collapsedDetails = [];
        }

        window.addEventListener("afterprint", restorePrintDetails);
        window.addEventListener("message", function (event) {
            if (event.source === window.parent && event.origin === parentOrigin &&
                event.data && event.data.type === "print-finished") {
                restorePrintDetails();
            }
        });

        var toolbar = document.createElement("div");
        toolbar.className = "page-export-toolbar";
        toolbar.setAttribute("role", "group");
        toolbar.setAttribute("aria-label", "Exportar documentación");

        var button = document.createElement("button");
        button.className = "page-export-button";
        button.type = "button";
        button.textContent = "Imprimir / Guardar como PDF";
        button.addEventListener("click", function () {
            try {
                preparePrintDetails();
            } catch (error) {
                restorePrintDetails();
                console.error("No se pudo preparar el contenido desplegable para imprimir.", error);
                return;
            }

            if (window.parent !== window) {
                var documentHeight = Math.ceil(Math.max(
                    document.documentElement.scrollHeight,
                    document.body ? document.body.scrollHeight : 0
                ));
                window.parent.postMessage({
                    type: "print-document",
                    height: documentHeight
                }, "*");
            } else {
                window.print();
            }
        });

        toolbar.appendChild(button);

        var breadcrumb = page.querySelector("#auto-breadcrumb");
        if (breadcrumb && breadcrumb.parentNode === page) {
            breadcrumb.insertAdjacentElement("afterend", toolbar);
        } else {
            page.insertBefore(toolbar, page.firstChild);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initPdfExport, { once: true });
    } else {
        initPdfExport();
    }
})();
