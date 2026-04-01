(function bootstrapAdmin(globalScope) {
  const {
    REQUEST_STATUS_STEPS,
    clearSession,
    deleteAdminRequest,
    deleteDepartment,
    deleteOfficialAccount,
    formatStatus,
    getDepartmentById,
    getLanguage,
    getRoleByCode,
    getSession,
    getState,
    initializeStore,
    upsertAdminRequest,
    upsertWorkOrder,
    upsertDepartment,
    upsertOfficialAccount
  } = globalScope.CRIMS.store;
  const { bindLanguageSelector } = globalScope.CRIMS.i18n;

  const elements = {
    shell: document.querySelector("#admin-shell"),
    sideLinks: Array.from(document.querySelectorAll("[data-admin-nav]")),
    languageSelect: document.querySelector("#admin-language-select"),
    signOutButton: document.querySelector("#sign-out-button"),
    adminGreeting: document.querySelector("#admin-greeting"),
    sessionRoleLabel: document.querySelector("#session-role-label"),
    summaryGrid: document.querySelector("#summary-grid"),
    alertStrip: document.querySelector("#admin-alert-strip"),
    budgetStack: document.querySelector("#budget-stack"),
    activityFeed: document.querySelector("#activity-feed"),
    requestFilterSelect: document.querySelector("#request-filter-select"),
    requestTableBody: document.querySelector("#request-table-body"),
    requestForm: document.querySelector("#admin-request-form"),
    requestFormTitle: document.querySelector("#request-form-title"),
    requestResetButton: document.querySelector("#request-reset-button"),
    requestFormError: document.querySelector("#request-form-error"),
    requestTypeSelect: document.querySelector("#admin-request-type"),
    requestCategorySelect: document.querySelector("#admin-request-category"),
    requestDepartmentSelect: document.querySelector("#request-filter-dept-select"),
    requestUrgencySelect: document.querySelector("#admin-request-urgency"),
    requestStatusSelect: document.querySelector("#admin-request-status"),
    officialTableBody: document.querySelector("#official-table-body"),
    officialForm: document.querySelector("#official-account-form"),
    officialFormTitle: document.querySelector("#official-form-title"),
    officialResetButton: document.querySelector("#official-reset-button"),
    officialFormError: document.querySelector("#official-form-error"),
    officialRoleSelect: document.querySelector("#official-role-select"),
    officialDepartmentSelect: document.querySelector("#official-department-select"),
    departmentTableBody: document.querySelector("#department-table-body"),
    departmentForm: document.querySelector("#department-form"),
    departmentFormTitle: document.querySelector("#department-form-title"),
    departmentResetButton: document.querySelector("#department-reset-button"),
    departmentFormError: document.querySelector("#department-form-error"),
    adminWorkOrderTableBody: document.querySelector("#admin-work-order-table-body")
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showError(element, message) {
    if (!message) {
      element.textContent = "";
      element.classList.add("hidden");
      return;
    }

    element.textContent = message;
    element.classList.remove("hidden");
  }

  function getAuthorizedSession() {
    const session = getSession();
    return session && session.type === "official" && session.role === "ADMINISTRATOR" ? session : null;
  }

  function renderAccessGuard() {
    document.querySelector(".admin-main").innerHTML = `
      <section class="section">
        <article class="glass-card access-guard">
          <div class="section-kicker">Restricted workspace</div>
          <h2>City Administrator access is required</h2>
          <p>
            This page is reserved for the schema-aligned super user. Sign in through the official access portal with the City Administrator role to continue.
          </p>
          <div class="hero-admin-actions">
            <a class="button button-primary" href="./auth.html?mode=official">Go to official sign in</a>
            <a class="button button-secondary" href="./index.html">Return to public portal</a>
          </div>
        </article>
      </section>
    `;
  }

  function bindSectionNavigation() {
    if (!elements.sideLinks.length || !("IntersectionObserver" in globalScope)) {
      return;
    }

    const sectionMap = elements.sideLinks
      .map((link) => {
        const sectionId = link.getAttribute("href");
        return {
          link,
          section: sectionId ? document.querySelector(sectionId) : null
        };
      })
      .filter((entry) => entry.section);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!visibleEntry) {
          return;
        }

        sectionMap.forEach(({ link, section }) => {
          link.classList.toggle("is-active", section === visibleEntry.target);
        });
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.15, 0.3, 0.6]
      }
    );

    sectionMap.forEach(({ section }) => observer.observe(section));
  }

  function getOverviewMetrics() {
    const state = getState();
    const requests = state.requests;
    const officialCount = state.officialAccounts.length;
    const activeRequests = requests.filter((request) => request.status !== "CLOSED" && request.status !== "REJECTED").length;
    const receivedCount = requests.filter((request) => request.status === "RECEIVED").length;
    const planningCount = requests.filter((request) => request.status === "APPROVED_FOR_PLANNING").length;
    const totalBudget = state.departments.reduce((sum, department) => sum + Number(department.budgetCr || 0), 0);

    return [
      { label: "Open requests", value: activeRequests, detail: "Citizen requests still moving through the intake pipeline" },
      { label: "Awaiting review", value: receivedCount, detail: "Fresh requests currently in the RECEIVED state" },
      { label: "Planning-ready", value: planningCount, detail: "Requests cleared for planning and work-order conversion" },
      { label: "Official accounts", value: officialCount, detail: `Invite-only actors across ${state.officialRoles.length} schema roles` },
      { label: "Departments", value: state.departments.length, detail: "Operational city divisions tracked by the administrator" },
      {
        label: "Budget cap",
        value: `INR ${totalBudget.toFixed(1)} Cr`,
        detail: "Current departmental budget envelope in the prototype",
        mono: true
      }
    ];
  }

  function getWorkOrderActions(order) {
    if (order.status === "PENDING_OFFICER_APPROVAL") {
      return `
        <button class="text-button" type="button" data-workorder-approve="${order.id}">Approve</button>
        <button class="text-button danger" type="button" data-workorder-reject="${order.id}">Reject</button>
      `;
    }

    if (order.status === "APPROVED") {
      return `<button class="text-button" type="button" data-workorder-validate="${order.id}">Validate</button>`;
    }

    if (order.status === "COMPLETED") {
      return `<span class="mono">Validated</span>`;
    }

    return `<span class="mono">${escapeHtml(order.status || "No action")}</span>`;
  }

  function renderOverview() {
    const state = getState();
    const metrics = getOverviewMetrics();
    const averageUtilization = state.departments.length
      ? state.departments.reduce((sum, department) => sum + Number(department.utilization || 0), 0) / state.departments.length
      : 0;

    elements.summaryGrid.innerHTML = metrics
      .map((item) => {
        return `
          <article class="summary-item">
            <span>${escapeHtml(item.label)}</span>
            <strong class="${item.mono ? "mono" : ""}">${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `;
      })
      .join("") + `
        <article class="summary-item">
          <span>Administrative report</span>
          <strong>Generate a quick overview</strong>
          <button class="button button-secondary small-button" type="button" data-generate-report="true">Generate Report</button>
          <div class="report-summary" id="admin-report-summary">
            <p class="mono">No report generated yet.</p>
          </div>
        </article>
      `;

    elements.alertStrip.innerHTML = (state.adminAlerts || [])
      .map((alert) => {
        return `
          <article class="alert-item ${escapeHtml(alert.tone)}">
            <span>${escapeHtml(alert.label)}</span>
            <strong>${escapeHtml(alert.title)}</strong>
            <p>${escapeHtml(alert.detail)}</p>
          </article>
        `;
      })
      .join("");

    elements.budgetStack.innerHTML = state.departments
      .map((department) => {
        const utilization = Number(department.utilization || 0);
        const comparison = utilization >= averageUtilization ? "Above average utilization" : "Below average utilization";

        return `
          <article class="budget-row">
            <div class="budget-row-head">
              <strong>${escapeHtml(department.name)}</strong>
              <span class="status-pill neutral">${escapeHtml(String(utilization))}% utilized</span>
            </div>
            <div class="budget-meta">
              Lead: ${escapeHtml(department.lead)}
              <span class="mono"> / INR ${escapeHtml(Number(department.budgetCr).toFixed(1))} Cr</span>
            </div>
            <div class="budget-bar"><span style="width: ${Math.max(0, Math.min(100, utilization))}%"></span></div>
            <p class="budget-comparison">${escapeHtml(comparison)}</p>
          </article>
        `;
      })
      .join("");

    const workOrders = state.workOrders || [];
    const workOrderRows = workOrders
      .map((order) => {
        const department = getDepartmentById(order.departmentId);
        return `
          <tr>
            <td>${escapeHtml(order.title)}</td>
            <td>${escapeHtml((department && department.name) || "Unassigned")}</td>
            <td>${escapeHtml(order.status)}</td>
            <td>${getWorkOrderActions(order)}</td>
          </tr>
        `;
      })
      .join("");

    elements.activityFeed.innerHTML = `
      <article class="glass-card panel-card">
        <div class="panel-heading compact">
          <div>
            <div class="section-kicker">Work order approvals</div>
            <h3>Review operational work orders</h3>
          </div>
        </div>
        ${workOrders.length ? `
          <div class="table-shell">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${workOrderRows}
              </tbody>
            </table>
          </div>
        ` : '<div class="empty-state">No work orders are currently available.</div>'}
      </article>
      ${
        (state.activityFeed || [])
          .map((item) => {
            return `
              <article class="feed-item">
                <div class="feed-item-head">
                  <strong>${escapeHtml(item.title)}</strong>
                  <span class="status-pill neutral">${escapeHtml(item.meta)}</span>
                </div>
                <p>${escapeHtml(item.detail)}</p>
              </article>
            `;
          })
          .join("")
      }
    `;
  }

  function statusTone(status) {
    if (status === "RECEIVED") {
      return "neutral";
    }

    if (status === "UNDER_REVIEW" || status === "APPROVED_FOR_PLANNING") {
      return "warning";
    }

    if (status === "REJECTED") {
      return "alert";
    }

    return "";
  }

  function populateSelects() {
    const state = getState();
    const currentFilter = elements.requestFilterSelect.value;
    const currentRequestType = elements.requestTypeSelect.value;
    const currentCategory = elements.requestCategorySelect.value;
    const currentDepartment = elements.requestDepartmentSelect.value;
    const currentUrgency = elements.requestUrgencySelect.value;
    const currentStatus = elements.requestStatusSelect.value;
    const currentOfficialRole = elements.officialRoleSelect.value;
    const currentOfficialDepartment = elements.officialDepartmentSelect.value;

    elements.requestFilterSelect.innerHTML = [
      '<option value="ALL">All statuses</option>',
      ...REQUEST_STATUS_STEPS.map((status) => `<option value="${status}">${formatStatus(status)}</option>`),
      '<option value="REJECTED">Rejected</option>'
    ].join("");

    elements.requestTypeSelect.innerHTML = [
      '<option value="">Select request type</option>',
      '<option value="Complaint">Complaint</option>',
      '<option value="Improvement">Improvement</option>'
    ].join("");

    elements.requestCategorySelect.innerHTML = [
      '<option value="">Select category</option>',
      ...state.serviceCategories.map((category) => `<option value="${category.id}">${escapeHtml(category.label)}</option>`)
    ].join("");

    elements.requestUrgencySelect.innerHTML = [
      '<option value="">Select urgency</option>',
      '<option value="LOW">Low</option>',
      '<option value="MEDIUM">Medium</option>',
      '<option value="HIGH">High</option>',
      '<option value="EMERGENCY">Emergency</option>'
    ].join("");

    elements.requestDepartmentSelect.innerHTML = [
      '<option value="">Select department</option>',
      ...state.departments.length
        ? state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
        : ['<option value="" disabled>No departments available</option>']
    ].join("");

    elements.requestStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...REQUEST_STATUS_STEPS.map((status) => `<option value="${status}">${formatStatus(status)}</option>`),
      '<option value="REJECTED">Rejected</option>'
    ].join("");

    elements.officialRoleSelect.innerHTML = [
      '<option value="">Select role</option>',
      ...state.officialRoles.map((role) => `<option value="${role.code}">${escapeHtml(role.name)}</option>`)
    ].join("");

    elements.officialDepartmentSelect.innerHTML = [
      '<option value="">No department mapping</option>',
      ...state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
    ].join("");

    elements.requestFilterSelect.value = currentFilter || "ALL";
    elements.requestTypeSelect.value = currentRequestType;
    elements.requestCategorySelect.value = currentCategory;
    elements.requestDepartmentSelect.value = currentDepartment;
    elements.requestUrgencySelect.value = currentUrgency;
    elements.requestStatusSelect.value = currentStatus;
    elements.officialRoleSelect.value = currentOfficialRole;
    elements.officialDepartmentSelect.value = currentOfficialDepartment;
  }

  function renderRequestTable() {
    const state = getState();
    const filterValue = elements.requestFilterSelect.value || "ALL";
    const filteredRequests = state.requests.filter((request) => {
      return filterValue === "ALL" ? true : request.status === filterValue;
    });

    if (!filteredRequests.length) {
      elements.requestTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No requests match the selected filter.</div></td></tr>';
      return;
    }

    elements.requestTableBody.innerHTML = filteredRequests
      .map((request) => {
        const department = getDepartmentById(request.departmentId);
        return `
          <tr>
            <td>
              <strong class="mono">${escapeHtml(request.publicReferenceNo)}</strong>
              <span>${escapeHtml(request.title)}</span>
            </td>
            <td>${escapeHtml(request.requesterName)}</td>
            <td>${escapeHtml((department && department.name) || "Unassigned")}</td>
            <td><span class="status-pill ${statusTone(request.status)}">${escapeHtml(formatStatus(request.status))}</span></td>
            <td>${escapeHtml(formatStatus(request.urgency))}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-request-edit="${request.requestId}">Edit</button>
                <button class="text-button danger" type="button" data-request-delete="${request.requestId}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderOfficialTable() {
    const state = getState();

    elements.officialTableBody.innerHTML = state.officialAccounts
      .map((account) => {
        const role = getRoleByCode(account.role);
        const department = account.departmentId ? getDepartmentById(account.departmentId) : null;
        return `
          <tr>
            <td>${escapeHtml(account.name)}</td>
            <td>${escapeHtml((role && role.name) || account.role)}</td>
            <td>${escapeHtml((department && department.name) || "System-wide")}</td>
            <td class="mono">${escapeHtml(account.email)}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-official-edit="${account.id}">Edit</button>
                <button class="text-button danger" type="button" data-official-delete="${account.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderDepartmentTable() {
    const state = getState();

    elements.departmentTableBody.innerHTML = state.departments
      .map((department) => {
        return `
          <tr>
            <td>
              <strong>${escapeHtml(department.name)}</strong>
              <span>${escapeHtml(department.publicLabel)}</span>
            </td>
            <td>${escapeHtml(department.lead)}</td>
            <td><span class="mono">INR ${escapeHtml(Number(department.budgetCr).toFixed(1))} Cr</span></td>
            <td>${escapeHtml(String(department.utilization))}%</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-department-edit="${department.id}">Edit</button>
                <button class="text-button danger" type="button" data-department-delete="${department.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function generateAdminReport() {
    const state = getState();
    const totalRequests = state.requests.length;
    const totalWorkOrders = (state.workOrders || []).length;
    const totalBudget = state.departments.reduce((sum, department) => sum + Number(department.budgetCr || 0), 0);
    const totalUsage = state.departments.reduce((sum, department) => {
      return sum + (Number(department.budgetCr || 0) * Number(department.utilization || 0) / 100);
    }, 0);
    const usageText = totalBudget > 0 ? `${Math.round((totalUsage / totalBudget) * 100)}%` : "0%";
    const reportSummary = elements.summaryGrid.querySelector("#admin-report-summary");

    if (!reportSummary) {
      return;
    }

    reportSummary.innerHTML = `
      <div class="report-line">Total requests: <strong>${escapeHtml(String(totalRequests))}</strong></div>
      <div class="report-line">Total work orders: <strong>${escapeHtml(String(totalWorkOrders))}</strong></div>
      <div class="report-line">Budget usage: <strong>INR ${escapeHtml(totalUsage.toFixed(1))} Cr</strong> (${escapeHtml(usageText)})</div>
    `;
  }

  function updateWorkOrderStatus(workOrderId, nextStatus) {
    const state = getState();
    const workOrder = (state.workOrders || []).find((item) => item.id === workOrderId);
    if (!workOrder) {
      return;
    }

    upsertWorkOrder({
      ...workOrder,
      status: nextStatus
    });
  }

  function bindWorkOrderControls() {
    elements.activityFeed.addEventListener("click", (event) => {
      const approveButton = event.target.closest("[data-workorder-approve]");
      const rejectButton = event.target.closest("[data-workorder-reject]");
      const validateButton = event.target.closest("[data-workorder-validate]");

      if (approveButton) {
        updateWorkOrderStatus(approveButton.dataset.workorderApprove, "APPROVED");
        renderAll();
        return;
      }

      if (rejectButton) {
        updateWorkOrderStatus(rejectButton.dataset.workorderReject, "REJECTED");
        renderAll();
        return;
      }

      if (validateButton) {
        updateWorkOrderStatus(validateButton.dataset.workorderValidate, "COMPLETED");
        renderAll();
      }
    });
  }

  function bindReportControls() {
    elements.summaryGrid.addEventListener("click", (event) => {
      if (!event.target.closest("[data-generate-report]")) {
        return;
      }

      generateAdminReport();
    });
  }

  function renderAll() {
    renderOverview();
    populateSelects();
    renderRequestTable();
    renderOfficialTable();
    renderDepartmentTable();
    renderWorkOrderApprovalTable();
  }

  function resetRequestForm() {
    elements.requestForm.reset();
    elements.requestForm.elements.requestId.value = "";
    elements.requestForm.elements.publicReferenceNo.value = "";
    elements.requestForm.elements.receivedAt.value = "";
    elements.requestFormTitle.textContent = "Add request";
    showError(elements.requestFormError, "");
  }

  function resetOfficialForm() {
    elements.officialForm.reset();
    elements.officialForm.elements.id.value = "";
    elements.officialFormTitle.textContent = "Add official";
    showError(elements.officialFormError, "");
  }

  function resetDepartmentForm() {
    elements.departmentForm.reset();
    elements.departmentForm.elements.id.value = "";
    elements.departmentFormTitle.textContent = "Add department";
    showError(elements.departmentFormError, "");
  }

  function validateRequest(payload) {
    if (payload.requesterName.trim().length < 3) {
      return "Enter a citizen name with at least 3 characters.";
    }
    if (!/^[6-9]\d{9}$/.test(payload.requesterContact.trim())) {
      return "Enter a valid 10-digit Indian mobile number.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.requesterEmail.trim())) {
      return "Enter a valid citizen email address.";
    }
    if (!/^\d{12}$/.test(payload.citizenAadhaar.trim())) {
      return "Enter a valid 12-digit Aadhaar number.";
    }
    if (!payload.requestType || !payload.categoryId || !payload.urgency || !payload.status) {
      return "Complete the request type, category, urgency, and status fields.";
    }
    if (payload.title.trim().length < 6 || payload.description.trim().length < 20 || payload.locationText.trim().length < 6) {
      return "Title, description, and location need fuller detail before saving.";
    }
    return "";
  }

  function validateOfficial(payload) {
    if (payload.name.trim().length < 3) {
      return "Enter the official's full name.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
      return "Enter a valid official email address.";
    }
    if (!payload.role) {
      return "Select the official role.";
    }
    if (payload.password.trim().length < 8) {
      return "Provide a password with at least 8 characters.";
    }
    return "";
  }

  function validateDepartment(payload) {
    if (payload.name.trim().length < 3 || payload.publicLabel.trim().length < 3 || payload.lead.trim().length < 3) {
      return "Department name, public label, and lead must all be completed.";
    }
    if (Number(payload.budgetCr) <= 0) {
      return "Budget cap must be greater than zero.";
    }
    if (Number(payload.utilization) < 0 || Number(payload.utilization) > 100) {
      return "Utilization must stay between 0 and 100 percent.";
    }
    return "";
  }

  function bindRequestControls() {
    elements.requestFilterSelect.addEventListener("change", renderRequestTable);
    elements.requestResetButton.addEventListener("click", resetRequestForm);

    elements.requestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.requestForm).entries());
      const validationMessage = validateRequest(payload);
      showError(elements.requestFormError, "");

      if (validationMessage) {
        showError(elements.requestFormError, validationMessage);
        return;
      }

      try {
        upsertAdminRequest(payload);
        resetRequestForm();
        renderAll();
      } catch (error) {
        showError(elements.requestFormError, error.message);
      }
    });

    elements.requestTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-request-edit]");
      const deleteButton = event.target.closest("[data-request-delete]");

      if (editButton) {
        const request = getState().requests.find((item) => item.requestId === editButton.dataset.requestEdit);
        if (!request) {
          return;
        }

        Object.entries(request).forEach(([key, value]) => {
          if (elements.requestForm.elements[key]) {
            elements.requestForm.elements[key].value = value || "";
          }
        });
        elements.requestFormTitle.textContent = `Edit ${request.publicReferenceNo}`;
        showError(elements.requestFormError, "");
        return;
      }

      if (deleteButton) {
        try {
          deleteAdminRequest(deleteButton.dataset.requestDelete);
          resetRequestForm();
          renderAll();
        } catch (error) {
          showError(elements.requestFormError, error.message);
        }
      }
    });
  }

  function bindOfficialControls() {
    elements.officialResetButton.addEventListener("click", resetOfficialForm);

    elements.officialForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.officialForm).entries());
      const validationMessage = validateOfficial(payload);
      showError(elements.officialFormError, "");

      if (validationMessage) {
        showError(elements.officialFormError, validationMessage);
        return;
      }

      try {
        upsertOfficialAccount(payload);
        resetOfficialForm();
        renderAll();
      } catch (error) {
        showError(elements.officialFormError, error.message);
      }
    });

    elements.officialTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-official-edit]");
      const deleteButton = event.target.closest("[data-official-delete]");

      if (editButton) {
        const account = getState().officialAccounts.find((item) => item.id === editButton.dataset.officialEdit);
        if (!account) {
          return;
        }

        Object.entries(account).forEach(([key, value]) => {
          if (elements.officialForm.elements[key]) {
            elements.officialForm.elements[key].value = value || "";
          }
        });
        elements.officialFormTitle.textContent = `Edit ${account.name}`;
        showError(elements.officialFormError, "");
        return;
      }

      if (deleteButton) {
        try {
          deleteOfficialAccount(deleteButton.dataset.officialDelete);
          resetOfficialForm();
          renderAll();
        } catch (error) {
          showError(elements.officialFormError, error.message);
        }
      }
    });
  }

  function bindDepartmentControls() {
    elements.departmentResetButton.addEventListener("click", resetDepartmentForm);

    elements.departmentForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.departmentForm).entries());
      const validationMessage = validateDepartment(payload);
      showError(elements.departmentFormError, "");

      if (validationMessage) {
        showError(elements.departmentFormError, validationMessage);
        return;
      }

      try {
        upsertDepartment(payload);
        resetDepartmentForm();
        renderAll();
      } catch (error) {
        showError(elements.departmentFormError, error.message);
      }
    });

    elements.departmentTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-department-edit]");
      const deleteButton = event.target.closest("[data-department-delete]");

      if (editButton) {
        const department = getState().departments.find((item) => item.id === editButton.dataset.departmentEdit);
        if (!department) {
          return;
        }

        Object.entries(department).forEach(([key, value]) => {
          if (elements.departmentForm.elements[key]) {
            elements.departmentForm.elements[key].value = value || "";
          }
        });
        elements.departmentFormTitle.textContent = `Edit ${department.name}`;
        showError(elements.departmentFormError, "");
        return;
      }

      if (deleteButton) {
        try {
          deleteDepartment(deleteButton.dataset.departmentDelete);
          resetDepartmentForm();
          renderAll();
        } catch (error) {
          showError(elements.departmentFormError, error.message);
        }
      }
    });
  }

  function bindSessionControls(session) {
    const role = getRoleByCode(session.role);
    elements.adminGreeting.textContent = `City-wide control for ${session.name}`;
    elements.sessionRoleLabel.textContent = (role && role.name) || "Administrator authenticated";

    elements.signOutButton.addEventListener("click", () => {
      clearSession();
      globalScope.location.href = "./auth.html?mode=official";
    });
  }

  /* ── Work Order Approval Table ── */
  function renderWorkOrderApprovalTable() {
    if (!elements.adminWorkOrderTableBody) return;
    const state = getState();
    const workOrders = state.workOrders || [];
    if (!workOrders.length) {
      elements.adminWorkOrderTableBody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No work orders exist in the system yet.</div></td></tr>';
      return;
    }
    elements.adminWorkOrderTableBody.innerHTML = workOrders.map((wo) => {
      const dept = getDepartmentById(wo.departmentId);
      const approvalLabel = wo.approvedBy ? 'Approved' : 'Pending';
      const approvalTone = wo.approvedBy ? '' : 'warning';
      return `
        <tr>
          <td class="mono"><strong>${escapeHtml(wo.referenceNo)}</strong></td>
          <td>${escapeHtml(wo.title)}</td>
          <td>${escapeHtml((dept && dept.name) || 'Unknown')}</td>
          <td><span class="status-pill ${wo.priority === 'EMERGENCY' ? 'alert' : wo.priority === 'HIGH' ? 'warning' : 'neutral'}">${escapeHtml(formatStatus(wo.priority))}</span></td>
          <td><span class="status-pill neutral">${escapeHtml(formatStatus(wo.status))}</span></td>
          <td><span class="status-pill ${approvalTone}">${escapeHtml(approvalLabel)}</span></td>
          <td><div class="row-actions">
            ${!wo.approvedBy ? `<button class="text-button" type="button" data-wo-approve="${wo.id}">Approve</button>` : ''}
            <button class="text-button danger" type="button" data-wo-reject="${wo.id}">Reject</button>
          </div></td>
        </tr>`;
    }).join("");
  }

  function bindWorkOrderApprovalControls(session) {
    if (!elements.adminWorkOrderTableBody) return;
    elements.adminWorkOrderTableBody.addEventListener("click", (event) => {
      const approveBtn = event.target.closest("[data-wo-approve]");
      const rejectBtn = event.target.closest("[data-wo-reject]");
      if (approveBtn) {
        const state = getState();
        const wo = (state.workOrders || []).find((item) => item.id === approveBtn.dataset.woApprove);
        if (!wo) return;
        try {
          const nextStatus =
            wo.status === "DRAFT" || wo.status === "PENDING_OFFICER_APPROVAL" || wo.status === "PENDING_ADMIN_APPROVAL"
              ? "APPROVED"
              : wo.status;
          upsertWorkOrder({
            ...wo,
            approvedBy: session.officialId,
            approvedAt: new Date().toISOString(),
            rejectedBy: null,
            rejectedAt: null,
            status: nextStatus
          });
          renderAll();
          if (globalScope.CRIMS && globalScope.CRIMS.toast) globalScope.CRIMS.toast('Work order approved successfully.', 'success');
        } catch (err) {
          if (globalScope.CRIMS && globalScope.CRIMS.toast) globalScope.CRIMS.toast(err.message, 'error');
        }
      }
      if (rejectBtn) {
        const reason = globalScope.prompt('Enter rejection reason (optional):');
        const state = getState();
        const wo = (state.workOrders || []).find((item) => item.id === rejectBtn.dataset.woReject);
        if (!wo) return;
        try {
          upsertWorkOrder({
            ...wo,
            approvedBy: null,
            approvedAt: null,
            rejectedBy: session.officialId,
            rejectedAt: new Date().toISOString(),
            status: 'CANCELLED',
            notes: reason || 'Rejected by administrator.'
          });
          renderAll();
          if (globalScope.CRIMS && globalScope.CRIMS.toast) globalScope.CRIMS.toast('Work order rejected.', 'warning');
        } catch (err) {
          if (globalScope.CRIMS && globalScope.CRIMS.toast) globalScope.CRIMS.toast(err.message, 'error');
        }
      }
    });
  }

  function init() {
    initializeStore();
    const session = getAuthorizedSession();

    if (!session) {
      renderAccessGuard();
      return;
    }

    bindLanguageSelector(elements.languageSelect);
    bindSessionControls(session);
    renderAll();
    resetRequestForm();
    resetOfficialForm();
    resetDepartmentForm();
    bindSectionNavigation();
    bindRequestControls();
    bindOfficialControls();
    bindDepartmentControls();
    bindWorkOrderControls();
    bindReportControls();
    bindWorkOrderApprovalControls(session);
  }

  init();
})(window);
