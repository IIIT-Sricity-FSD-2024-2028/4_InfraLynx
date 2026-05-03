(function attachUtils(globalScope) {
  const crims = (globalScope.CRIMS = globalScope.CRIMS || {});

  /* â”€â”€ HTML escaping â”€â”€ */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* â”€â”€ Inline error display â”€â”€ */
  function showError(element, message) {
    if (!element) return;
    if (!message) {
      element.textContent = "";
      element.classList.add("hidden");
      return;
    }
    element.textContent = message;
    element.classList.remove("hidden");
  }

  /* â”€â”€ Toast notification (requires #toast-container in the page) â”€â”€ */
  function toast(message, type) {
    const toneClass = type === "error" ? "toast-error" : type === "warning" ? "toast-warning" : "toast-success";
    const container = document.getElementById("toast-container");
    if (!container) return;

    const el = document.createElement("div");
    el.className = `toast-item ${toneClass}`;
    el.textContent = message;
    container.appendChild(el);

    requestAnimationFrame(() => el.classList.add("toast-visible"));
    setTimeout(() => {
      el.classList.remove("toast-visible");
      setTimeout(() => el.remove(), 350);
    }, 3200);
  }

  /* â”€â”€ Confirm dialog (returns Promise<boolean>) â”€â”€ */
  function confirmAction(message) {
    return Promise.resolve(globalScope.confirm(message));
  }

  /* â”€â”€ Format a status string (e.g. "IN_PROGRESS" â†’ "In Progress") â”€â”€ */
  function formatStatus(status) {
    if (!status) return "Unknown";
    return String(status)
      .split("_")
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(" ");
  }

  crims.utils = {
    escapeHtml,
    showError,
    toast,
    confirmAction,
    formatStatus
  };
})(window);

