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