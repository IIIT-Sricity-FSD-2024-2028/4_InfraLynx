/**
 * nav-tabs.js â€” SPA-style panel switcher for all CRIMS role dashboards.
 *
 * Works with any sidebar/topnav link that carries a data attribute like:
 *   data-admin-nav, data-officer-nav, data-engineer-nav
 * The link's href must be a hash matching the section's id, e.g. href="#inspections".
 *
 * Adds/removes .nav-panel-hidden / .nav-panel-active on the section elements.
 * Updates the active-link class (.is-active) on the nav links.
 */
(function initNavTabs(globalScope) {
  const NAV_SELECTORS = [
    "[data-admin-nav]",
    "[data-officer-nav]",
    "[data-engineer-nav]",
    "[data-cfo-nav]",
    "[data-qc-nav]"
  ];

  function getNavLinks() {
    return Array.from(document.querySelectorAll(NAV_SELECTORS.join(",")));
  }

  function getSectionIds(links) {
    return links
      .map((link) => link.getAttribute("href"))
      .filter((href) => href && href.startsWith("#"))
      .map((href) => href.slice(1));
  }

  function showSection(sectionId, links, sectionIds) {
    // Update section visibility
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id === sectionId) {
        el.classList.remove("nav-panel-hidden");
        el.classList.add("nav-panel-active");
      } else {
        el.classList.add("nav-panel-hidden");
        el.classList.remove("nav-panel-active");
      }
    });

    // Update active link
    links.forEach((link) => {
      const href = link.getAttribute("href");
      const active = href === "#" + sectionId;
      link.classList.toggle("is-active", active);
      link.setAttribute("aria-current", active ? "page" : "false");
    });

    // Update URL hash without scroll jump
    if (globalScope.history && globalScope.history.replaceState) {
      globalScope.history.replaceState(null, "", "#" + sectionId);
    }
  }

  function getInitialSection(links) {
    const hash = globalScope.location.hash.slice(1);
    const validIds = getSectionIds(links);
    if (hash && validIds.includes(hash)) {
      return hash;
    }
    // Default to first section
    return validIds[0] || null;
  }

  function init() {
    const links = getNavLinks();
    if (!links.length) return;

    const sectionIds = getSectionIds(links);
    if (!sectionIds.length) return;

    // Hide all sections first
    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("nav-panel-hidden");
        el.classList.remove("nav-panel-active");
      }
    });

    // Show initial section
    const initial = getInitialSection(links);
    if (initial) {
      showSection(initial, links, sectionIds);
    }

    // Bind click handlers
    links.forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || !href.startsWith("#")) return;
        event.preventDefault();
        const sectionId = href.slice(1);
        showSection(sectionId, links, sectionIds);
        // Scroll workspace back to top
        const workspace = link.closest(".admin-workspace, .officer-workspace, .engineer-workspace, .cfo-workspace, .qc-workspace");
        if (workspace) {
          workspace.scrollTop = 0;
        } else {
          globalScope.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);

