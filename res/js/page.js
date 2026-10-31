/* ==============================
   BREADCRUMBS CONSTANTES
============================== */
window.addEventListener("message", function (e) {

    if (
        e.source !== window.parent ||
        e.origin !== window.location.origin ||
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

    breadcrumb.innerHTML = "";

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

                    window.parent.changeFrame(path);

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
        allowedPath = window.parent.getAllowedPath(target.pathname);
    } catch (error) {
        return;
    }

    /* Bloquear páginas internas que no estén declaradas en el índice. */
    if (!allowedPath) {
        e.preventDefault();
        return;
    }

    e.preventDefault();
    window.parent.changeFrame(allowedPath);

});

/* ==============================
   ATAJOS DE TECLADO DESDE FRAME A "X"
============================== */
document.addEventListener("keydown", function (ev) {

    /* abrir buscador */
    if (ev.key === "!") {

        ev.preventDefault();

        var input =
            window.parent.document.getElementById(
                "tree_search"
            );

        if (!input) {
            return;
        }

        input.focus();
        input.select();

        return;
    }

    /* mostrar/ocultar índice */
    if (ev.key === "Escape") {

        ev.preventDefault();

        window.parent.toggle_tree_panel();
    }
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
        e.origin !== window.location.origin ||
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

    console.log(
        "[" + tag + "]",
        tag.length
    );

    /* si ya está seleccionada, desactivar */
    if (
        ev.target.classList.contains(
            "tag-match"
        )
    ) {

        clearTagSelection();

        window.parent.clearTreeSearch();

        return;
    }

    clearTagSelection();

    ev.target.classList.add(
        "tag-match"
    );

    window.parent.searchByTag(tag);
});
