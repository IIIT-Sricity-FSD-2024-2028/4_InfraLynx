(function attachToast(globalScope) {
  /* Toast notification system â€” requires a #toast-container element in the page. */

  const CRIMS = (globalScope.CRIMS = globalScope.CRIMS || {});

  /**
   * Show a toast notification.
   * @param {string} message - The message to display
   * @param {'success'|'error'|'warning'|'info'} [type='success'] - Colour variant
   * @param {number} [duration=3000] - Duration in ms before auto-dismiss
   */
  function showToast(message, type, duration) {
    var container = document.getElementById("toast-container");
    if (!container) return;

    var validType = type === "error" || type === "warning" || type === "info" ? type : "success";
    var ms = typeof duration === "number" ? duration : 3200;

    var el = document.createElement("div");
    el.className = "toast-item toast-" + validType;
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.textContent = message;

    // Close button
    var close = document.createElement("button");
    close.className = "toast-close";
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "Ã—";
    close.addEventListener("click", function () {
      dismiss(el);
    });
    el.appendChild(close);

    container.appendChild(el);

    // Animate in
    requestAnimationFrame(function () {
      el.classList.add("toast-visible");
    });

    // Auto-dismiss
    var timer = setTimeout(function () {
      dismiss(el);
    }, ms);

    el._toastTimer = timer;
  }

  function dismiss(el) {
    clearTimeout(el._toastTimer);
    el.classList.remove("toast-visible");
    el.classList.add("toast-hiding");
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 320);
  }

  CRIMS.toast = showToast;

  // Also expose on utils if it already exists
  if (CRIMS.utils) {
    CRIMS.utils.toast = showToast;
  }
})(window);

