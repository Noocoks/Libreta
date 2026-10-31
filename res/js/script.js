var right_arrow_heavy = '&#129090;';
var left_arrow_heavy = '&#129088;';

var treeData = null;

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

    function existsInTree(nodes) {
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];

            if (
                typeof node.path === "string" &&
                node.path.replace(/^\/+/, "") === relativePath
            ) {
                return true;
            }

            if (
                node.children &&
                existsInTree(node.children)
            ) {
                return true;
            }
        }

        return false;
    }

    if (
        !treeData ||
        !Array.isArray(treeData.sections) ||
        !existsInTree(treeData.sections)
    ) {
        return null;
    }

    return relativePath;
}

function navigate(file_path, push = true) {

    var iframe = getIframe();
    var allowedPath = getAllowedPath(file_path);

    if (!iframe || !allowedPath) {
        console.warn("Navegación bloqueada: ruta no permitida.", file_path);
        return false;
    }

    iframe.style.opacity = 0;

    setTimeout(function () {

        iframe.onload = function () {

            iframe.style.opacity = 1;

            try {

                var breadcrumbData = findNodePath(
                    treeData.sections,
                    allowedPath
                );

                iframe.contentWindow.postMessage({
                    type: "breadcrumb",
                    path: allowedPath,
                    breadcrumb: breadcrumbData
                }, window.location.origin);

            } catch (e) {

                console.warn(
                    "No se pudo enviar breadcrumb",
                    e
                );

            }
        };

        iframe.src = new URL(
            allowedPath,
            window.location.href
        ).href;

    }, 120);

    if (push) {
        window.location.hash = allowedPath;
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
    } else {
        next.classList.add("hide");
        element.textContent = "+";
        element.dataset.open = "false";
        element.setAttribute("aria-expanded", "false");
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
            btn.setAttribute("aria-expanded", "false");
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
        btn.innerHTML = left_arrow_heavy;
        btn.setAttribute("aria-expanded", "true");
        btn.setAttribute("aria-label", "Ocultar índice");
    } else {
        tree.classList.add("hidden");
        document.body.classList.add("tree-hidden");
        btn.innerHTML = right_arrow_heavy;
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

function buildTree(data) {

    var root = document.getElementById("tree_root");

    if (!root) return;

    root.innerHTML = "";

    if (!data.sections) return;

    for (var i = 0; i < data.sections.length; i++) {

        root.appendChild(
            createTreeNode(data.sections[i])
        );

    }

    initTreeState();
}

function loadTree() {

    fetch("res/json/tree.json")
        .then(function (response) {
            return response.json();
        })

        .then(function (data) {

            treeData = data;

            buildTree(data);

            var page =
                window.location.hash.replace("#", "");

            if (page) {
                navigate(page, false);
            }

        })

        .catch(function (error) {

            console.error(
                "Error cargando index.json",
                error
            );

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

    li.style.display = "";

    var children = li.querySelectorAll("li");

    for (var i = 0; i < children.length; i++) {
        children[i].style.display = "";
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

    li.style.display = visible ? "" : "none";

    if (search !== "") {

        /* si coincide este nodo, mostrar toda la rama */
        if (selfMatch) {

            showAllChildren(li);

            if (subtree) {

                subtree.classList.remove("hide");

                if (btn) {
                    btn.textContent = "-";
                    btn.dataset.open = "true";
                }
            }
        }

        /* si coincide un hijo, abrir automáticamente */
        if (childMatch && subtree) {

            subtree.classList.remove("hide");

            if (btn) {
                btn.textContent = "-";
                btn.dataset.open = "true";
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

    if (
        !iframe ||
        event.source !== iframe.contentWindow ||
        event.origin !== window.location.origin ||
        !event.data ||
        typeof event.data !== "object"
    ) {
        return;
    }

    if (
        event.data.type === "navigate" &&
        typeof event.data.path === "string"
    ) {
        navigate(event.data.path, true);
    }

});

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
        }, window.location.origin);

    } catch (e) {

        console.warn("No se pudieron sincronizar las etiquetas.", e);

    }
}

/* ==============================
   INIT
============================== */
window.onload = function () {

    loadTree();

    document.onkeydown = function (ev) {

        if (ev.key === "Escape") {
            toggle_tree_panel();
        }

        if (ev.key === "!") {

            var input =
                document.getElementById(
                    "tree_search"
                );

            if (!input) return;

            ev.preventDefault();

            input.focus();
            input.select();
        }

    };

    var panels = document.getElementsByClassName("two-panels")[0];

    if (panels) {

        var btn = document.createElement("button");

        btn.onclick = toggle_tree_panel;
        btn.innerHTML = left_arrow_heavy;
        btn.id = "tree_panel_toggle_btn";
        btn.type = "button";
        btn.setAttribute("aria-label", "Ocultar índice");
        btn.setAttribute("aria-expanded", "true");

        panels.insertBefore(btn, panels.children[1]);
    }
};


console.log("script.js cargado");