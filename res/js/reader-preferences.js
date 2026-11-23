(function () {
    "use strict";

    var STORAGE_KEY = "libreta.reader-preferences.v1";
    var DEFAULTS = Object.freeze({
        textSize: "normal",
        readingWidth: "normal",
        spacing: "normal"
    });
    var ALLOWED = Object.freeze({
        textSize: ["small", "normal", "large"],
        readingWidth: ["compact", "normal", "wide"],
        spacing: ["compact", "normal", "relaxed"]
    });
    var current = Object.assign({}, DEFAULTS);

    function normalize(value) {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
            return Object.assign({}, DEFAULTS);
        }

        var result = {};
        Object.keys(DEFAULTS).forEach(function (key) {
            result[key] = ALLOWED[key].indexOf(value[key]) !== -1
                ? value[key]
                : DEFAULTS[key];
        });
        return result;
    }

    function readStoredPreferences() {
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            return raw ? normalize(JSON.parse(raw)) : Object.assign({}, DEFAULTS);
        } catch (error) {
            return Object.assign({}, DEFAULTS);
        }
    }

    function persistPreferences() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
            return true;
        } catch (error) {
            return false;
        }
    }

    function updateControls() {
        Object.keys(DEFAULTS).forEach(function (key) {
            var control = document.getElementById("reader-" + key);
            if (control) control.value = current[key];
        });
    }

    function applyToFrame() {
        var iframe = document.getElementById("page_frame");
        if (!iframe || !iframe.contentWindow) return false;

        try {
            iframe.contentWindow.postMessage({
                type: "reader-preferences",
                preferences: Object.assign({}, current)
            }, "*");
            return true;
        } catch (error) {
            return false;
        }
    }

    function announce(message) {
        var status = document.getElementById("reader-settings-status");
        if (status) status.textContent = message;
    }

    function updatePreference(key, value) {
        if (!Object.prototype.hasOwnProperty.call(ALLOWED, key) ||
            ALLOWED[key].indexOf(value) === -1) {
            return;
        }

        current[key] = value;
        persistPreferences();
        updateControls();
        applyToFrame();
        announce("Preferencias de lectura actualizadas.");
    }

    function initialize() {
        current = readStoredPreferences();
        updateControls();

        Object.keys(DEFAULTS).forEach(function (key) {
            var control = document.getElementById("reader-" + key);
            if (!control) return;
            control.addEventListener("change", function () {
                updatePreference(key, control.value);
            });
        });

        var reset = document.getElementById("reader-settings-reset");
        if (reset) {
            reset.addEventListener("click", function () {
                current = Object.assign({}, DEFAULTS);
                persistPreferences();
                updateControls();
                applyToFrame();
                announce("Preferencias restauradas.");
            });
        }

        var iframe = document.getElementById("page_frame");
        if (iframe) {
            iframe.addEventListener("load", applyToFrame);
        }

        window.ReaderPreferences = Object.freeze({
            applyToFrame: applyToFrame,
            get: function () {
                return Object.assign({}, current);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
