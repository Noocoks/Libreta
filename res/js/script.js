var right_arrow_heavy = '&#129090;';
var left_arrow_heavy = '&#129088;';

var treeData = null;

/* ==============================
   ROUTER / IFRAME NAVIGATION
============================== */
function getIframe() {
    return document.getElementById("page_frame");
}

function navigate(file_path, push = true) {

    var iframe = getIframe();

    if (!iframe || !file_path) return;

    iframe.style.opacity = 0;

    setTimeout(function () {

        iframe.src = file_path;

        iframe.onload = function () {

            iframe.style.opacity = 1;

            try {

                var breadcrumbData = findNodePath(
                    treeData.sections,
                    file_path
                );

                iframe.contentWindow.postMessage({
                    type: "breadcrumb",
                    path: file_path,
                    breadcrumb: breadcrumbData
                }, "*");

            } catch (e) {

                console.warn(
                    "No se pudo enviar breadcrumb",
                    e
                );

            }
        };

    }, 120);

    if (push) {
        window.location.hash = file_path;
    }
}

function changeFrame(file_path) {

    file_path = file_path
        .replace(/^\/Libreta\//, "")
        .replace(/^\/+/, "");

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
    } else {
        next.classList.add("hide");
        element.textContent = "+";
        element.dataset.open = "false";
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
    } else {
        tree.classList.add("hidden");
        document.body.classList.add("tree-hidden");
        btn.innerHTML = right_arrow_heavy;
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

    if (item.cat) {
    li.dataset.cat = item.cat;
}

    if (item.children && item.children.length) {

        var btn = document.createElement("button");

        btn.onclick = function () {
            toggleSubTree(this);
        };

        btn.textContent = "+";

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

    var children = li.getElementsByTagName("li");

    for (var i = 0; i < children.length; i++) {
        children[i].style.display = "";
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

    if (!event.data) return;

    if (
        event.data.type === "navigate" &&
        event.data.path
    ) {
        navigate(
            event.data.path,
            true
        );
    }

});

/* ==============================
   TAGS SYNC
============================== */

function syncFrameTags(tag) {

    try {

        getIframe().contentWindow.postMessage({
            type: "highlight-tag",
            tag: tag || ""
        }, "*");

    } catch (e) { }

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

        panels.insertBefore(btn, panels.children[1]);
    }
};