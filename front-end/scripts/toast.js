/**
 * toast.js — Lightweight toast notification system for InfraLynx CRIMS dashboards.
 *
 * Usage (after this script loads):
 *   window.CRIMS.toast.success("Record saved.")
 *   window.CRIMS.toast.error("Something went wrong.")
 *   window.CRIMS.toast.info("Loading data...")
 *   window.CRIMS.toast.confirm("Delete this record?", onConfirm)
 */
(function initToast(globalScope) {
    const DURATION = 3600;  // ms before auto-dismiss
    const SLIDE_OUT = 320;  // ms animation before removal

    function getContainer() {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "toast-container";
            container.setAttribute("aria-live", "polite");
            document.body.appendChild(container);
        }
        return container;
    }

    function dismiss(toastEl) {
        toastEl.classList.add("toast-out");
        setTimeout(() => toastEl.remove(), SLIDE_OUT);
    }

    function show(message, tone, icon) {
        const container = getContainer();
        const toastEl = document.createElement("div");
        toastEl.className = `toast toast-${tone}`;
        toastEl.setAttribute("role", "status");
        toastEl.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" type="button" aria-label="Dismiss">&times;</button>
    `;
        container.appendChild(toastEl);

        // Trigger animation
        requestAnimationFrame(() => toastEl.classList.add("toast-in"));

        // Close button
        toastEl.querySelector(".toast-close").addEventListener("click", () => dismiss(toastEl));

        // Auto-dismiss
        const timer = setTimeout(() => dismiss(toastEl), DURATION);
        toastEl.addEventListener("mouseenter", () => clearTimeout(timer));

        return toastEl;
    }

    /**
     * Show a confirm dialog overlay.
     * @param {string} message - Prompt shown to the user
     * @param {Function} onConfirm - Called if user confirms
     */
    function confirm(message, onConfirm) {
        const overlay = document.createElement("div");
        overlay.className = "confirm-overlay";
        overlay.innerHTML = `
      <div class="confirm-dialog glass-card" role="alertdialog" aria-modal="true" aria-label="Confirm action">
        <div class="confirm-icon" aria-hidden="true">⚠️</div>
        <p class="confirm-message">${message}</p>
        <div class="confirm-actions">
          <button class="button button-secondary" id="confirm-cancel" type="button">Cancel</button>
          <button class="button button-danger" id="confirm-ok" type="button">Delete</button>
        </div>
      </div>
    `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("confirm-open"));

        function close() {
            overlay.classList.remove("confirm-open");
            setTimeout(() => overlay.remove(), 260);
        }

        overlay.querySelector("#confirm-cancel").addEventListener("click", close);
        overlay.querySelector("#confirm-ok").addEventListener("click", () => {
            close();
            if (typeof onConfirm === "function") onConfirm();
        });
        overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    }

    // ── Live clock ──────────────────────────────────────────────────────────────
    function startClock(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const update = () => {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, "0");
            const m = String(now.getMinutes()).padStart(2, "0");
            const s = String(now.getSeconds()).padStart(2, "0");
            el.textContent = `${h}:${m}:${s}`;
        };
        update();
        setInterval(update, 1000);
    }

    // ── Public API ───────────────────────────────────────────────────────────────
    globalScope.CRIMS = globalScope.CRIMS || {};
    globalScope.CRIMS.toast = {
        success: (msg) => show(msg, "success", "✓"),
        error: (msg) => show(msg, "error", "✕"),
        info: (msg) => show(msg, "info", "ℹ"),
        confirm,
        startClock
    };

    // Auto-start clocks for known clock IDs
    document.addEventListener("DOMContentLoaded", () => {
        ["admin-clock", "cfo-clock", "qc-clock", "officer-clock", "engineer-clock"].forEach(startClock);
    });
})(window);
