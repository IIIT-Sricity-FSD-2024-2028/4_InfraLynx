(function attachRoutes(globalScope) {
  const crims = (globalScope.CRIMS = globalScope.CRIMS || {});
  const pagePath = globalScope.location.pathname.replace(/\\/g, "/");
  const isInsidePages = pagePath.includes("/pages/");
  const pagePrefix = isInsidePages ? "./" : "./pages/";
  const homePath = isInsidePages ? "../index.html" : "./index.html";

  const routes = {
    home: homePath,
    auth: `${pagePrefix}auth.html`,
    forgotPassword: `${pagePrefix}forgot-password.html`,
    citizen: `${pagePrefix}citizen.html`,
    ADMINISTRATOR: `${pagePrefix}admin.html`,
    OFFICER: `${pagePrefix}officer.html`,
    ENGINEER: `${pagePrefix}engineer.html`,
    CFO: `${pagePrefix}cfo.html`,
    QC_REVIEWER: `${pagePrefix}qcreviewer.html`
  };

  function workspaceForRole(role) {
    return routes[role] || routes.auth;
  }

  crims.routes = {
    routes,
    workspaceForRole
  };
})(window);
