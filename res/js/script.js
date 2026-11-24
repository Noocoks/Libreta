
var treeData = null;
var activeNavigationPath = null;
var recentPages = [];
var RECENT_PAGES_KEY = "libreta.recent-pages.v1";
var RECENT_PAGES_LIMIT = 8;

function findTreeNode(nodes, targetPath) {
    if (!Array.isArray(nodes)) return null;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node && typeof node.path === "string" &&
            node.path.replace(/^\/+/, "") === targetPath) return node;
        var child = findTreeNode(node && node.children, targetPath);
        if (child) return child;
    }
    return null;
}

function renderRecentPages() {
    var list = document.getElementById("recent-pages-list");
    var empty = document.getElementById("recent-pages-empty");
    var clear = document.getElementById("recent-pages-clear");
    if (!list || !empty || !clear) return;

    list.replaceChildren();
    empty.hidden = recentPages.length > 0;
    clear.disabled = recentPages.length === 0;

    recentPages.forEach(function (entry) {
        var item = document.createElement("li");
        var button = document.createElement("button");
        button.type = "button";
        button.className = "recent-page-link";
        button.textContent = entry.title;
        button.title = entry.path;
        button.addEventListener("click", function () {
            navigate(entry.path, true);
        });
        item.appendChild(button);
        list.appendChild(item);
    });
}

function loadRecentPages() {
    recentPages = [];
    try {
        var stored = window.localStorage.getItem(RECENT_PAGES_KEY);
        if (stored) {
            var parsed = JSON.parse(stored);
            if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
                var allowed = collectAllowedPaths(treeData.sections);
                parsed.items.forEach(function (entry) {
                    if (!entry || typeof entry.path !== "string" ||
                        allowed.indexOf(entry.path) === -1 ||
                        recentPages.some(function (item) { return item.path === entry.path; })) return;
                    var node = findTreeNode(treeData.sections, entry.path);
                    if (!node || typeof node.name !== "string") return;
                    recentPages.push({ path: entry.path, title: node.name });
                });
                recentPages = recentPages.slice(0, RECENT_PAGES_LIMIT);
            }
        }
    } catch (error) {
        recentPages = [];
    }
    renderRecentPages();
}

function saveRecentPages() {
    try {
        window.localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify({
            version: 1,
            items: recentPages
        }));
    } catch (error) {
        /* El historial sigue disponible durante la sesión si el almacenamiento está bloqueado. */
    }
}

function rememberRecentPage(path) {
    var node = findTreeNode(treeData.sections, path);
    if (!node) return;

    recentPages = recentPages.filter(function (entry) {
        return entry.path !== path;
    });
    recentPages.unshift({ path: path, title: node.name });
    recentPages = recentPages.slice(0, RECENT_PAGES_LIMIT);
    saveRecentPages();
    renderRecentPages();
}

function clearRecentPages() {
    recentPages = [];
    try {
        window.localStorage.removeItem(RECENT_PAGES_KEY);
    } catch (error) {
        /* El estado en memoria se limpia aunque el almacenamiento no esté disponible. */
    }
    renderRecentPages();
    var status = document.getElementById("recent-pages-status");
    if (status) status.textContent = "Historial limpiado";
}

/* ==============================
   ROUTER / IFRAME NAVIGATION
============================== */
function getIframe() {
    return document.getElementById("page_frame");
}

function getAllowedPath(file_path) {

    if (
        typeof file_path !== "string" ||
        !file_path.trim() ||
        /[\\\\\u0000-\u001f]/.test(file_path) ||
        /%2f|%5c/i.test(file_path)
    ) {
        return null;
    }

    var rawPath = file_path.trim();

    if (
        rawPath.startsWith("//") ||
        /(?:^|\/)\.\.?\//.test(rawPath) ||
        /(?:^|\/)\.\.?$/.test(rawPath)
    ) {
        return null;
    }

    var target;

    try {
        target = new URL(rawPath, window.location.href);
    } catch (e) {
        return null;
    }

    if (
        target.origin !== window.location.origin ||
        (target.protocol !== "http:" && target.protocol !== "https:") ||
        target.search ||
        target.hash
    ) {
        return null;
    }

    var basePath = new URL(".", window.location.href).pathname;

    if (!target.pathname.startsWith(basePath)) {
        return null;
    }

    var relativePath;

    try {
        relativePath = decodeURIComponent(
            target.pathname.slice(basePath.length)
        );
    } catch (e) {
        return null;
    }

    if (
        !relativePath ||
        relativePath.startsWith("/") ||
        relativePath.split("/").some(function (part) {
            return part === "." || part === "..";
        })
    ) {
        return null;
    }

    /*
     * Devuelve la ruta canónica almacenada en el árbol, nunca la cadena
     * proporcionada por la URL. La comparación exacta aplica la allowlist:
     * el valor que llega al sink de navegación procede de tree.json.
     */
    function findCanonicalTreePath(nodes, candidate) {
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];

            if (typeof node.path === "string") {
                var canonicalPath = node.path.replace(/^\/+/, "");
                if (canonicalPath === candidate) {
                    return canonicalPath;
                }
            }

            if (Array.isArray(node.children)) {
                var childPath = findCanonicalTreePath(node.children, candidate);
                if (childPath !== null) {
                    return childPath;
                }
            }
        }

        return null;
    }

    if (!treeData || !Array.isArray(treeData.sections)) {
        return null;
    }

    return findCanonicalTreePath(treeData.sections, relativePath);
}

function navigate(file_path, push = true) {

    var iframe = getIframe();
    var allowedPath = getAllowedPath(file_path);

    if (!iframe || !allowedPath) {
        console.warn("Navegación bloqueada: ruta no permitida.", file_path);
        return false;
    }

    activeNavigationPath = allowedPath;
    rememberRecentPage(allowedPath);
    var pagePanel = iframe.closest(".page-panel");
    if (pagePanel) {
        pagePanel.classList.remove("is-entering");
        pagePanel.classList.add("is-loading");
    }

    iframe.onload = function () {

        if (activeNavigationPath !== allowedPath) {
            return;
        }

        if (pagePanel) {
            pagePanel.classList.remove("is-loading");
            pagePanel.classList.add("is-entering");
        }

        try {

            var breadcrumbData = findNodePath(
                treeData.sections,
                allowedPath
            );

            iframe.contentWindow.postMessage({
                type: "breadcrumb",
                path: allowedPath,
                breadcrumb: breadcrumbData,
                allowedPaths: collectAllowedPaths(treeData.sections)
            }, "*");

        } catch (e) {

            console.warn(
                "No se pudo enviar breadcrumb",
                e
            );

        }
    };

    iframe.onerror = function () {
        if (pagePanel) pagePanel.classList.remove("is-loading", "is-entering");
    };

    var targetUrl = new URL(allowedPath, window.location.href).href;
    if (iframe.hasAttribute("src") && iframe.contentWindow) {
        /* Reemplazar el documento hijo evita que sus cargas contaminen atrás/adelante del padre. */
        try {
            iframe.contentWindow.location.replace(targetUrl);
        } catch (error) {
            iframe.src = targetUrl;
        }
    } else {
        iframe.src = targetUrl;
    }

    if (push) {
        var nextUrl = new URL(window.location.href);
        nextUrl.hash = allowedPath;
        if (nextUrl.href !== window.location.href) {
            window.history.pushState({ libretaPath: allowedPath }, "", nextUrl.href);
        }
    }

    return true;
}

function changeFrame(file_path) {
    navigate(file_path, true);
}

/* ==============================
   TOGGLE NODE
============================== */
function toggleSubTree(element) {
    var next = element.parentElement.querySelector("ul.subtree");
    if (!next) return;

    if (next.classList.contains("hide")) {
        next.classList.remove("hide");
        element.textContent = "-";
        element.dataset.open = "true";
        element.setAttribute("aria-expanded", "true");
        element.setAttribute("aria-label", "Contraer " + element.parentElement.querySelector("a").textContent);
    } else {
        next.classList.add("hide");
        element.textContent = "+";
        element.dataset.open = "false";
        element.setAttribute("aria-expanded", "false");
        element.setAttribute("aria-label", "Expandir " + element.parentElement.querySelector("a").textContent);
    }
}

/* ==============================
   EXPAND ALL
============================== */
function expandAllSubtrees() {
    var subtrees = document.getElementsByClassName("subtree");

    for (var i = 0; i < subtrees.length; i++) {
        subtrees[i].classList.remove("hide");

        var btn = subtrees[i].parentElement.querySelector("button");
        if (btn) {
            btn.textContent = "-";
            btn.dataset.open = "true";
            btn.setAttribute("aria-expanded", "true");
            var link = btn.parentElement.querySelector("a");
            if (link) btn.setAttribute("aria-label", "Contraer " + link.textContent);
        }
    }
}

/* ==============================
   COLLAPSE ALL
============================== */
function collapseAllSubtrees() {
    var subtrees = document.getElementsByClassName("subtree");

    for (var i = 0; i < subtrees.length; i++) {
        subtrees[i].classList.add("hide");

        var btn = subtrees[i].parentElement.querySelector("button");
        if (btn) {
            btn.textContent = "+";
            btn.dataset.open = "false";
            btn.setAttribute("aria-expanded", "false");
            var link = btn.parentElement.querySelector("a");
            if (link) btn.setAttribute("aria-label", "Expandir " + link.textContent);
        }
    }
}

/* ==============================
   INIT TREE
============================== */
function initTreeState() {

    var tree = document.querySelector(".tree");
    var subtrees = document.getElementsByClassName("subtree");

    if (tree) {
        tree.classList.add("no-anim");
        tree.classList.remove("ready");
    }

    for (var i = 0; i < subtrees.length; i++) {
        subtrees[i].classList.add("hide");

        var btn = subtrees[i].parentElement.querySelector("button");
        if (btn) {
            btn.textContent = "+";
            btn.dataset.open = "false";
            btn.setAttribute("aria-expanded", "false");
            var link = btn.parentElement.querySelector("a");
            if (link) btn.setAttribute("aria-label", "Expandir " + link.textContent);
        }
    }

    void document.body.offsetHeight;

    requestAnimationFrame(function () {
        if (tree) {
            tree.classList.remove("no-anim");
            tree.classList.add("ready");
        }
    });
}

/* ==============================
   PANEL TOGGLE
============================== */
function toggle_tree_panel() {
    var tree = document.getElementsByClassName("tree-panel")[0];
    var btn = document.getElementById("tree_panel_toggle_btn");

    if (!tree || !btn) return;

    if (tree.classList.contains("hidden")) {
        tree.classList.remove("hidden");
        document.body.classList.remove("tree-hidden");
        btn.textContent = "❮";
        btn.setAttribute("aria-expanded", "true");
        btn.setAttribute("aria-label", "Ocultar índice");
    } else {
        tree.classList.add("hidden");
        document.body.classList.add("tree-hidden");
        btn.textContent = "❯";
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-label", "Mostrar índice");
    }
}

/* ==============================
   HELPERS
============================== */
function get_tree() {
    return document.getElementsByClassName("tree")[0];
}

function get_tree_panel() {
    return document.getElementsByClassName("tree-panel")[0];
}

/* ==============================
   JSON TREE LOADER
============================== */

function createTreeNode(item) {

    var li = document.createElement("li");

    /* categoría para iconos */
    if (item.cat) {
        li.dataset.cat = item.cat;
    }

    if (item.children && item.children.length) {

        var btn = document.createElement("button");

        btn.onclick = function () {
            toggleSubTree(this);
        };

        btn.textContent = "+";
        btn.type = "button";
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-label", "Expandir " + item.name);

        li.appendChild(btn);
    }

    var link = document.createElement("a");

    link.href = "#";
    link.textContent = item.name;

    link.onclick = function (e) {
        e.preventDefault();
        changeFrame(item.path);
    };

    li.appendChild(link);

    /* tags */
    if (item.tags && item.tags.length) {

        li.dataset.tags = item.tags.join(" ");

        var tagsDiv = document.createElement("div");
        tagsDiv.className = "node-tags";

        for (var t = 0; t < item.tags.length; t++) {

            var tag = document.createElement("span");

            tag.className = "tag";
            tag.textContent = item.tags[t];

            tag.onclick = function (e) {

                e.stopPropagation();

                searchByTag(
                    this.textContent
                );
            };

            tagsDiv.appendChild(tag);
        }

        li.appendChild(tagsDiv);
    }

    if (item.children && item.children.length) {

        var ul = document.createElement("ul");
        ul.className = "subtree";

        for (var i = 0; i < item.children.length; i++) {

            ul.appendChild(
                createTreeNode(item.children[i])
            );
        }

        li.appendChild(ul);
    }

    return li;
}

function isValidTreeNode(node) {

    if (
        !node ||
        typeof node !== "object" ||
        Array.isArray(node) ||
        typeof node.name !== "string" ||
        !node.name.trim() ||
        typeof node.path !== "string" ||
        !node.path.trim() ||
        (node.cat !== undefined && typeof node.cat !== "string") ||
        (node.tags !== undefined && (
            !Array.isArray(node.tags) ||
            !node.tags.every(function (tag) {
                return typeof tag === "string";
            })
        )) ||
        (node.children !== undefined && !Array.isArray(node.children))
    ) {
        return false;
    }

    return !node.children || node.children.every(isValidTreeNode);
}

function isValidTree(data) {

    return Boolean(
        data &&
        Array.isArray(data.sections) &&
        data.sections.every(isValidTreeNode)
    );
}

function buildTree(data) {

    var root = document.getElementById("tree_root");

    if (!root) return;

    root.replaceChildren();

    if (!isValidTree(data)) return;

    for (var i = 0; i < data.sections.length; i++) {

        root.appendChild(
            createTreeNode(data.sections[i])
        );

    }

    initTreeState();
}

function loadTree() {

    fetch(new URL("res/json/tree.json", document.baseURI).href)
        .then(function (response) {
            if (!response.ok) {
                throw new Error("No se pudo cargar tree.json (" + response.status + ")");
            }

            return response.json();
        })

        .then(function (data) {
            if (!isValidTree(data)) {
                throw new Error("tree.json contiene una estructura de navegación no válida");
            }

            treeData = data;
            buildTree(data);
            loadRecentPages();

            // En móvil y tablet, priorizar el contenido y dejar el índice como drawer.
            // El botón ya está creado por el evento load antes de que termine este fetch.
            var panelToggle = document.getElementById("tree_panel_toggle_btn");
            if (window.matchMedia("(max-width: 900px)").matches &&
                panelToggle && panelToggle.getAttribute("aria-expanded") === "true") {
                toggle_tree_panel();
            }

            // Reutiliza la validación del historial también en la carga inicial.
            // Los fragmentos manipulados se eliminan antes de cualquier navegación.
            syncNavigationFromLocation();
        })

        .catch(function (error) {
            console.error("Error cargando tree.json:", error);

            var root = document.getElementById("tree_root");
            if (root) {
                root.replaceChildren();
                var message = document.createElement("li");
                message.className = "tree-load-error";
                message.textContent = "No se pudo cargar el índice. Recarga la página o inténtalo más tarde.";
                root.appendChild(message);
            }
        });
}

function searchByTag(tag) {

    var input =
        document.getElementById(
            "tree_search"
        );

    if (!input) return;

    /* toggle */
    if (input.value === tag) {

        input.value = "";

        filterTree("");

        return;
    }

    input.value = tag;

    filterTree(tag);

    input.focus();
}

/* ==============================
   TREE SEARCH
============================== */

function clearTreeSearch() {

    var input = document.getElementById("tree_search");

    if (!input) return;

    input.value = "";

    filterTree("");

    input.focus();
}

function normalizeSearchText(text) {

    return text
        .toLowerCase()
        .replace(/ñ/g, "n")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function showAllChildren(li) {

    li.classList.remove("search-hidden");

    var children = li.querySelectorAll("li");

    for (var i = 0; i < children.length; i++) {
        children[i].classList.remove("search-hidden");
    }

    var subtrees = li.querySelectorAll("ul.subtree");

    for (var j = 0; j < subtrees.length; j++) {
        subtrees[j].classList.remove("hide");
    }

    var buttons = li.querySelectorAll("button[aria-expanded]");

    for (var k = 0; k < buttons.length; k++) {
        buttons[k].textContent = "-";
        buttons[k].dataset.open = "true";
        buttons[k].setAttribute("aria-expanded", "true");
        var link = buttons[k].parentElement.querySelector("a");
        if (link) buttons[k].setAttribute("aria-label", "Contraer " + link.textContent);
    }
}

function filterTree(search) {

    search = normalizeSearchText(search.trim());

    var root = document.getElementById("tree_root");

    if (!root) return;

    var nodes = root.children;

    for (var i = 0; i < nodes.length; i++) {
        filterTreeNode(nodes[i], search);
    }

    /* restaurar árbol al limpiar */
    if (search === "") {
        initTreeState();
    }

    syncFrameTags(search);
}

function filterTreeNode(li, search) {

    var link = null;
    var subtree = null;
    var btn = null;

    for (var i = 0; i < li.children.length; i++) {

        var child = li.children[i];

        if (child.tagName === "A") {
            link = child;
        }

        if (
            child.tagName === "UL" &&
            child.classList.contains("subtree")
        ) {
            subtree = child;
        }

        if (child.tagName === "BUTTON") {
            btn = child;
        }
    }

    var selfMatch = false;
    var tagMatch = false;

    if (link) {

        var text = normalizeSearchText(
            link.textContent
        );

        var tags = normalizeSearchText(
            li.dataset.tags || ""
        );

        tagMatch =
            search !== "" &&
            tags.includes(search);

        selfMatch =
            search === "" ||
            text.includes(search) ||
            tagMatch;
    }

    var childMatch = false;

    if (subtree) {

        var children = subtree.children;

        for (var j = 0; j < children.length; j++) {

            if (filterTreeNode(children[j], search)) {
                childMatch = true;
            }
        }
    }

    var visible = selfMatch || childMatch;

    li.classList.toggle("search-hidden", !visible);

    if (search !== "") {

        /* si coincide este nodo, mostrar toda la rama */
        if (selfMatch) {

            showAllChildren(li);

            if (subtree) {

                subtree.classList.remove("hide");

                if (btn) {
                    btn.textContent = "-";
                    btn.dataset.open = "true";
                    btn.setAttribute("aria-expanded", "true");
                    btn.setAttribute("aria-label", "Contraer " + link.textContent);
                }
            }
        }

        /* si coincide un hijo, abrir automáticamente */
        if (childMatch && subtree) {

            subtree.classList.remove("hide");

            if (btn) {
                btn.textContent = "-";
                btn.dataset.open = "true";
                btn.setAttribute("aria-expanded", "true");
                btn.setAttribute("aria-label", "Contraer " + link.textContent);
            }
        }
    }

    /* resaltar tags coincidentes */
    var tagsElements =
        li.querySelectorAll(".tag");

    for (var k = 0; k < tagsElements.length; k++) {

        tagsElements[k].classList.remove(
            "tag-match"
        );

        if (
            search !== "" &&
            normalizeSearchText(
                tagsElements[k].textContent
            ).includes(search)
        ) {
            tagsElements[k].classList.add(
                "tag-match"
            );
        }
    }

    return visible;
}

/* ==============================
   BREADCRUMB HELPERS
============================== */

function collectAllowedPaths(nodes, result) {
    result = result || [];
    if (!Array.isArray(nodes)) return result;
    nodes.forEach(function (node) {
        if (node && typeof node.path === "string") {
            var path = node.path;
            while (path.charAt(0) === "/") path = path.slice(1);
            result.push(path);
        }
        if (node && Array.isArray(node.children)) collectAllowedPaths(node.children, result);
    });
    return result;
}

function findNodePath(
    nodes,
    targetPath,
    currentPath
) {

    currentPath = currentPath || [];

    targetPath = targetPath.replace(/^\/+/, "");

    for (var i = 0; i < nodes.length; i++) {

        var node = nodes[i];

        var nodePath =
            (node.path || "")
                .replace(/^\/+/, "");

        var newPath =
            currentPath.concat(node);

        if (nodePath === targetPath) {
            return newPath;
        }

        if (node.children) {

            var result = findNodePath(
                node.children,
                targetPath,
                newPath
            );

            if (result) {
                return result;
            }
        }
    }

    return null;
}

/* ==============================
   IFRAME -> PARENT NAVIGATION
============================== */

window.addEventListener("message", function (event) {
    var iframe = getIframe();
    var data = event.data;
    if (!iframe || event.source !== iframe.contentWindow ||
        event.origin !== "null" || !data || typeof data !== "object") return;

    if (data.type === "navigate" && Number.isSafeInteger(data.pathIndex)) {
        if (treeData && Array.isArray(treeData.sections)) {
            var allowedPaths = collectAllowedPaths(treeData.sections);
            if (data.pathIndex >= 0 && data.pathIndex < allowedPaths.length) {
                navigate(allowedPaths[data.pathIndex], true);
            }
        }
    } else if (data.type === "search-tag" && typeof data.tag === "string" &&
        data.tag.length > 0 && data.tag.length <= 100) {
        searchByTag(data.tag);
    } else if (data.type === "clear-search") {
        clearTreeSearch();
    } else if (data.type === "toggle-index") {
        toggle_tree_panel();
    } else if (data.type === "focus-search") {
        var input = document.getElementById("tree_search");
        if (input) { input.focus(); input.select(); }
    } else if (data.type === "print-document") {
        if (!Number.isSafeInteger(data.height) || data.height <= 0 || data.height > 200000) {
            iframe.contentWindow.postMessage({ type: "print-finished" }, "*");
            return;
        }

        pendingPrintHeight = data.height;
        showPrintConfirmation();
    }
});

var pendingPrintHeight = null;

function showPrintConfirmation() {
    var panel = document.getElementById("pdf-print-confirmation");
    if (!panel) {
        panel = document.createElement("div");
        panel.id = "pdf-print-confirmation";
        panel.className = "pdf-print-confirmation";
        panel.setAttribute("role", "group");
        panel.setAttribute("aria-label", "Confirmar impresión");
        panel.setAttribute("aria-live", "polite");

        var message = document.createElement("span");
        message.textContent = "El documento está preparado para imprimir.";
        panel.appendChild(message);

        var confirmButton = document.createElement("button");
        confirmButton.type = "button";
        confirmButton.className = "pdf-print-confirm";
        confirmButton.textContent = "Continuar e imprimir";
        confirmButton.addEventListener("click", function () {
            var iframe = getIframe();
            if (!iframe || !iframe.contentWindow || !Number.isSafeInteger(pendingPrintHeight)) {
                finishPrintRequest();
                return;
            }

            iframe.setAttribute("height", String(pendingPrintHeight));
            document.body.classList.add("printing-document");
            window.print();
        });
        panel.appendChild(confirmButton);

        var cancelButton = document.createElement("button");
        cancelButton.type = "button";
        cancelButton.className = "pdf-print-cancel";
        cancelButton.textContent = "Cancelar";
        cancelButton.addEventListener("click", finishPrintRequest);
        panel.appendChild(cancelButton);

        document.body.appendChild(panel);
    }
    panel.hidden = false;
    panel.querySelector(".pdf-print-confirm").focus();
}

function finishPrintRequest() {
    var iframe = getIframe();
    if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "print-finished" }, "*");
        iframe.removeAttribute("height");
    }
    pendingPrintHeight = null;
    document.body.classList.remove("printing-document");
    var panel = document.getElementById("pdf-print-confirmation");
    if (panel) panel.hidden = true;
}

window.addEventListener("afterprint", finishPrintRequest);

/* ==============================
   TAGS SYNC
============================== */

function syncFrameTags(tag) {

    var iframe = getIframe();

    if (!iframe || !iframe.contentWindow) return;

    try {

        iframe.contentWindow.postMessage({
            type: "highlight-tag",
            tag: tag || ""
        }, "*");

    } catch (e) {

        console.warn("No se pudieron sincronizar las etiquetas.", e);

    }
}

/* ==============================
   INIT
============================== */
/* ==============================
   BROWSER HISTORY NAVIGATION
============================== */
function syncNavigationFromLocation() {
    var path = window.location.hash.slice(1);
    try {
        path = decodeURIComponent(path);
    } catch (error) {
        path = "";
    }

    path = (path || "").trim().replace(/^\/+/, "");

    if (!path) {
        activeNavigationPath = null;
        var iframe = getIframe();
        if (iframe && iframe.hasAttribute("src")) iframe.removeAttribute("src");
        return;
    }

    /*
     * Convierte el fragmento externo en una ruta canónica del árbol autorizado
     * antes de entregarlo al router. Nunca se pasa el fragmento original a
     * navigate ni al destino del iframe.
     */
    var canonicalPath = getAllowedPath(path);
    if (!canonicalPath) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        activeNavigationPath = null;
        var blockedIframe = getIframe();
        if (blockedIframe && blockedIframe.hasAttribute("src")) blockedIframe.removeAttribute("src");
        return;
    }

    if (canonicalPath !== activeNavigationPath && !navigate(canonicalPath, false)) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        activeNavigationPath = null;
        var invalidIframe = getIframe();
        if (invalidIframe && invalidIframe.hasAttribute("src")) invalidIframe.removeAttribute("src");
    }
}

window.addEventListener("popstate", syncNavigationFromLocation);
window.addEventListener("hashchange", syncNavigationFromLocation);

window.addEventListener("load", function () {

    var clearRecentButton = document.getElementById("recent-pages-clear");
    if (clearRecentButton) {
        clearRecentButton.addEventListener("click", clearRecentPages);
    }

    loadTree();

    document.addEventListener("keydown", function (ev) {

        if (ev.key === "Escape") {
            var toggle = document.getElementById("tree_panel_toggle_btn");

            if (toggle && toggle.getAttribute("aria-expanded") === "true") {
                toggle_tree_panel();
            }

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

        var input = document.getElementById("tree_search");

        if (!input) return;

        ev.preventDefault();
        input.focus();
        input.select();

    });

    var panels = document.getElementsByClassName("two-panels")[0];

    if (panels) {

        var btn = document.createElement("button");

        btn.onclick = toggle_tree_panel;
        btn.textContent = "❮";
        btn.id = "tree_panel_toggle_btn";
        btn.type = "button";
        btn.setAttribute("aria-label", "Ocultar índice");
        btn.setAttribute("aria-expanded", "true");

        panels.insertBefore(btn, panels.children[1]);
    }
});


