/* ==============================
   BREADCRUMBS CONSTANTES
============================== */
window.addEventListener("message", function (e) {

    if (e.data.type !== "breadcrumb") {
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

    var link = e.target.closest("a");

    if (!link) return;

    var href = link.getAttribute("href");

    if (!href) return;

    /* ignorar anchors externos */
    if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("#")
    ) {
        return;
    }

    e.preventDefault();

    var targetPath =
        new URL(
            href,
            window.location.href
        ).pathname;

    window.parent.changeFrame(
        targetPath
    );

});

/* ==============================
   BUSCA DESDE EL FRAME CON !
============================== */
document.addEventListener("keydown", function (ev) {

    if (ev.key !== "!") {
        return;
    }

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
        !e.data ||
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
        ev.target.textContent;

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