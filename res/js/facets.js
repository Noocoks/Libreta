(function () {
    "use strict";
    var KEY = "libreta.active-facet.v1";
    var labels = { index: "Índice", dictionary: "Diccionario", library: "Biblioteca", modding: "Modding" };
    var headings = { index: "// ÍNDICE", dictionary: "// DICCIONARIO", library: "// BIBLIOTECA", modding: "// MODDING" };
    var paths = { library: "subpags/software/index.html", modding: "subpags/modding/index.html" };
    var trigger = document.getElementById("facet-trigger");
    var switcher = document.getElementById("facet-switcher");
    var menu = document.getElementById("facet-menu");
    var close = document.getElementById("facet-menu-close");
    var heading = document.getElementById("facet-heading");
    var current = document.getElementById("facet-current-label");
    var treeRoot = document.getElementById("tree_root");
    var secondary = document.getElementById("facet-secondary-view");
    var options = Array.prototype.slice.call(document.querySelectorAll("[data-facet]"));
    if (!trigger || !menu || !heading || !current || !treeRoot || !secondary) return;

    var active = "index";
    var previousFocus = null;
    var glossary = null;
    var glossaryPromise = null;

    function placeMenu(open, mobile) {
        var destination = mobile && open ? document.body : switcher;
        if (menu.parentElement !== destination) destination.appendChild(menu);
    }

    function syncMenuLayout() {
        var mobile = window.matchMedia("(max-width: 900px)").matches;
        placeMenu(!menu.hidden, mobile);
        menu.setAttribute("aria-modal", String(mobile && !menu.hidden));
        var shell = document.querySelector(".two-panels");
        if (shell) {
            shell.inert = mobile && !menu.hidden;
            if (mobile && !menu.hidden) shell.setAttribute("aria-hidden", "true");
            else shell.removeAttribute("aria-hidden");
        }
        var treePanel = document.querySelector(".tree-panel");
        if (treePanel) treePanel.classList.toggle("facet-menu-expanded", !menu.hidden && !mobile);
    }

    function setMenu(open, restoreFocus) {
        var mobile = window.matchMedia("(max-width: 900px)").matches;
        if (open) previousFocus = document.activeElement;
        placeMenu(open, mobile);
        menu.hidden = !open;
        trigger.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("facet-menu-open", open);
        syncMenuLayout();
        if (open) {
            var first = menu.querySelector("[data-facet]");
            if (first) first.focus();
        } else if (restoreFocus !== false && previousFocus && typeof previousFocus.focus === "function") {
            previousFocus.focus();
            previousFocus = null;
        }
    }

    function getGlossary() {
        if (glossary) return Promise.resolve(glossary);
        if (!glossaryPromise) {
            var script = document.querySelector('script[src*="/res/js/facets.js"]');
            var source = script ? new URL(script.src, document.baseURI) : new URL("res/js/facets.js", document.baseURI);
            var dataUrl = new URL("../json/glossary.json", source);
            glossaryPromise = fetch(dataUrl.href, { credentials: "same-origin" })
                .then(function (response) {
                    if (!response.ok) throw new Error("No se pudo cargar el diccionario (" + response.status + ")");
                    return response.json();
                })
                .then(function (data) {
                    if (!data || data.version !== 1 || !Array.isArray(data.concepts)) throw new Error("Formato de diccionario no válido");
                    var ids = new Set();
                    data.concepts.forEach(function (item) {
                        if (!item || typeof item.id !== "string" || ids.has(item.id) ||
                            typeof item.term !== "string" || !item.term.trim() ||
                            typeof item.definition !== "string" || !item.definition.trim() ||
                            !Array.isArray(item.aliases) ||
                            !Array.isArray(item.related || [])) throw new Error("Entrada de diccionario no válida");
                        ids.add(item.id);
                    });
                    data.concepts.forEach(function (item) {
                        if ((item.related || []).some(function (id) {
                            return id === item.id || !ids.has(id);
                        })) throw new Error("Relación de diccionario desconocida o autorreferente: " + item.id);
                    });
                    glossary = data;
                    return data;
                })
                .catch(function (error) {
                    glossaryPromise = null;
                    throw error;
                });
        }
        return glossaryPromise;
    }

    function normalize(value) {
        return String(value || "").toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function renderDictionary() {
        secondary.replaceChildren();
        secondary.hidden = false;
        treeRoot.hidden = true;
        var intro = document.createElement("p");
        intro.className = "facet-view-intro";
        intro.textContent = "Consulta términos técnicos, siglas y conceptos relacionados.";
        var search = document.createElement("input");
        search.type = "search";
        search.className = "facet-dictionary-search";
        search.placeholder = "Buscar concepto, sigla o alias…";
        search.setAttribute("aria-label", "Buscar en el diccionario técnico");
        search.autocomplete = "off";
        var status = document.createElement("p");
        status.className = "facet-dictionary-status";
        status.setAttribute("role", "status");
        status.setAttribute("aria-live", "polite");
        var results = document.createElement("div");
        results.className = "facet-dictionary-results";
        secondary.append(intro, search, status, results);

        getGlossary().then(function (data) {
            function update() {
                var query = normalize(search.value.trim());
                var matches = data.concepts.filter(function (item) {
                    var relatedNames = (item.related || []).map(function (id) {
                        var related = data.concepts.find(function (candidate) { return candidate.id === id; });
                        return related ? related.term : "";
                    });
                    return !query || normalize([item.term, item.category].concat(item.aliases, relatedNames).join(" ")).indexOf(query) !== -1;
                }).sort(function (a, b) { return a.term.localeCompare(b.term, "es"); });
                results.replaceChildren();
                status.textContent = matches.length + (matches.length === 1 ? " concepto" : " conceptos");
                matches.forEach(function (item) {
                    var card = document.createElement("article");
                    card.className = "facet-dictionary-entry";
                    var button = document.createElement("button");
                    button.type = "button";
                    button.className = "facet-dictionary-term";
                    button.textContent = item.term;
                    button.setAttribute("aria-expanded", "false");
                    var category = document.createElement("span");
                    category.className = "facet-dictionary-category";
                    category.textContent = item.category;
                    var definition = document.createElement("p");
                    definition.className = "facet-dictionary-definition";
                    definition.textContent = item.definition;
                    definition.hidden = true;
                    var relatedBox = document.createElement("div");
                    relatedBox.className = "facet-dictionary-related";
                    relatedBox.hidden = true;
                    if ((item.related || []).length) {
                        var relatedLabel = document.createElement("span");
                        relatedLabel.textContent = "Conceptos relacionados";
                        relatedBox.appendChild(relatedLabel);
                        item.related.forEach(function (id) {
                            var relatedItem = data.concepts.find(function (candidate) { return candidate.id === id; });
                            if (!relatedItem) return;
                            var relatedButton = document.createElement("button");
                            relatedButton.type = "button";
                            relatedButton.textContent = relatedItem.term;
                            relatedButton.addEventListener("click", function () {
                                search.value = relatedItem.term;
                                update();
                                search.focus();
                            });
                            relatedBox.appendChild(relatedButton);
                        });
                    }
                    button.addEventListener("click", function () {
                        var expanded = button.getAttribute("aria-expanded") !== "true";
                        button.setAttribute("aria-expanded", String(expanded));
                        definition.hidden = !expanded;
                        relatedBox.hidden = !expanded || !relatedBox.children.length;
                    });
                    card.append(button, category, definition, relatedBox);
                    if (item.level >= 2 && item.path) {
                        var link = document.createElement("a");
                        link.className = "facet-dictionary-more";
                        link.href = "#";
                        link.textContent = "Desarrollo técnico →";
                        link.addEventListener("click", function (event) {
                            event.preventDefault();
                            if (typeof navigate === "function") navigate(item.path, true);
                        });
                        card.appendChild(link);
                    }
                    results.appendChild(card);
                });
            }
            search.addEventListener("input", update);
            update();
        }).catch(function (error) {
            status.textContent = "El diccionario no está disponible. Vuelve a intentarlo.";
            console.error("Error del diccionario técnico:", error);
        });
    }

    function setFacet(name, remember) {
        if (!Object.prototype.hasOwnProperty.call(labels, name)) return;
        active = name;
        current.textContent = labels[name];
        heading.textContent = headings[name];
        options.forEach(function (option) {
            var selected = option.dataset.facet === name;
            option.classList.toggle("is-active", selected);
            option.setAttribute("aria-pressed", String(selected));
        });
        if (name === "dictionary") {
            treeRoot.hidden = true;
            secondary.hidden = false;
            renderDictionary();
        } else {
            secondary.hidden = true;
            treeRoot.hidden = false;
            Array.prototype.forEach.call(treeRoot.children, function (node) {
                var cat = node.dataset.cat || "";
                node.hidden = name === "library" ? cat !== "software" :
                    name === "modding" ? cat !== "modding" : false;
            });
            if (name === "library" || name === "modding") {
                if (typeof navigate === "function") navigate(paths[name], true);
                var panel = document.querySelector(".tree-panel");
                if (panel && window.matchMedia("(max-width: 900px)").matches && !panel.classList.contains("hidden")) {
                    if (typeof toggle_tree_panel === "function") toggle_tree_panel();
                }
            }
        }
        if (remember) {
            try { window.localStorage.setItem(KEY, name); } catch (error) { /* Preferencia opcional. */ }
        }
        setMenu(false, false);
    }

    window.addEventListener("resize", function () {
        if (!menu.hidden) syncMenuLayout();
    });

    trigger.addEventListener("click", function () { setMenu(menu.hidden); });
    if (close) close.addEventListener("click", function () { setMenu(false); });
    menu.addEventListener("click", function (event) {
        var option = event.target.closest("[data-facet]");
        if (option) setFacet(option.dataset.facet, true);
    });
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && !menu.hidden) {
            setMenu(false);
            trigger.focus();
        }
        if (event.key === "Tab" && !menu.hidden && window.matchMedia("(max-width: 900px)").matches) {
            var focusable = Array.prototype.slice.call(menu.querySelectorAll("button:not([disabled]),a[href],input:not([disabled])"));
            if (!focusable.length) return;
            var first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
    document.addEventListener("click", function (event) {
        if (menu.hidden || menu.contains(event.target) || trigger.contains(event.target)) return;
        if (!window.matchMedia("(max-width: 900px)").matches) setMenu(false);
    });

    try {
        var stored = window.localStorage.getItem(KEY);
        if (stored && Object.prototype.hasOwnProperty.call(labels, stored)) active = stored;
    } catch (error) { /* La vista inicial sigue siendo Índice. */ }
    if (active !== "index") setFacet(active, false);
    else setFacet("index", false);
    window.addEventListener("libreta:tree-ready", function () {
        if (active !== "index") setFacet(active, false);
    });

    window.libretaSetFacet = function (name) { setFacet(name, true); };
})();