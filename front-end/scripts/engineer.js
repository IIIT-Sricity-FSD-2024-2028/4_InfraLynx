(function bootstrapEngineer(globalScope) {
  const {
    clearSession,
    deleteInspection,
    deleteIssueReport,
    deleteProgressReport,
    deleteResourceRequest,
    deleteMaintenanceLog,
    deleteTaskMaterialLog,
    deleteSensorDeployment,
    formatDisplayDate,
    formatStatus,
    getDepartmentById,
    getRoleByCode,
    getSession,
    getState,
    initializeStore,
    upsertInspection,
    upsertIssueReport,
    upsertProgressReport,
    upsertResourceRequest,
    upsertWorkOrder,
    upsertMaintenanceLog,
    upsertTaskMaterialLog,
    upsertSensorDeployment
  } = globalScope.CRIMS.store;
  const { bindLanguageSelector } = globalScope.CRIMS.i18n;

  const INSPECTION_SEVERITIES = ["LOW", "MODERATE", "SEVERE", "CRITICAL"];
  const INSPECTION_STATUSES = ["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const ISSUE_STATUSES = ["OPEN", "UNDER_REVIEW", "RESOLVED", "CLOSED", "REJECTED"];
  const RESOURCE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "FULFILLED"];
  const REPORT_STATUSES = ["DRAFT", "SUBMITTED", "ACKNOWLEDGED"];
  const MLOG_STATUSES = ["COMPLETED", "PARTIAL", "CANCELLED"];
  const SENSOR_STATUSES = ["ACTIVE", "OFFLINE", "DECOMMISSIONED"];
  const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

  const elements = {
    sideLinks: Array.from(document.querySelectorAll("[data-engineer-nav]")),
    languageSelect: document.querySelector("#engineer-language-select"),
    signOutButton: document.querySelector("#engineer-sign-out"),
    engineerGreeting: document.querySelector("#engineer-greeting"),
    engineerEmergencyCard: document.querySelector("#engineer-emergency-card"),
    engineerKpiGrid: document.querySelector("#engineer-kpi-grid"),
    engineerNotificationList: document.querySelector("#engineer-notification-list"),
    assignedWorkList: document.querySelector("#assigned-work-list"),
    inspectionTableBody: document.querySelector("#inspection-table-body"),
    inspectionForm: document.querySelector("#inspection-form"),
    inspectionFormTitle: document.querySelector("#inspection-form-title"),
    inspectionReset: document.querySelector("#inspection-reset"),
    inspectionError: document.querySelector("#inspection-error"),
    inspectionSeveritySelect: document.querySelector("#inspection-severity-select"),
    inspectionStatusSelect: document.querySelector("#inspection-status-select"),
    issueTableBody: document.querySelector("#issue-table-body"),
    issueForm: document.querySelector("#issue-form"),
    issueFormTitle: document.querySelector("#issue-form-title"),
    issueReset: document.querySelector("#issue-reset"),
    issueError: document.querySelector("#issue-error"),
    issueSeveritySelect: document.querySelector("#issue-severity-select"),
    issueStatusSelect: document.querySelector("#issue-status-select"),
    resourceTableBody: document.querySelector("#resource-table-body"),
    resourceForm: document.querySelector("#resource-form"),
    resourceFormTitle: document.querySelector("#resource-form-title"),
    resourceReset: document.querySelector("#resource-reset"),
    resourceError: document.querySelector("#resource-error"),
    resourceUrgencySelect: document.querySelector("#resource-urgency-select"),
    resourceStatusSelect: document.querySelector("#resource-status-select"),
    reportTableBody: document.querySelector("#report-table-body"),
    reportForm: document.querySelector("#report-form"),
    reportFormTitle: document.querySelector("#report-form-title"),
    reportReset: document.querySelector("#report-reset"),
    reportError: document.querySelector("#report-error"),
    reportWorkOrderSelect: document.querySelector("#report-work-order-select"),
    reportStatusSelect: document.querySelector("#report-status-select"),
    mlogTableBody: document.querySelector("#mlog-table-body"),
    mlogForm: document.querySelector("#mlog-form"),
    mlogFormTitle: document.querySelector("#mlog-form-title"),
    mlogReset: document.querySelector("#mlog-reset"),
    mlogError: document.querySelector("#mlog-error"),
    mlogStatusSelect: document.querySelector("#mlog-status-select"),
    matlogTableBody: document.querySelector("#matlog-table-body"),
    matlogForm: document.querySelector("#matlog-form"),
    matlogFormTitle: document.querySelector("#matlog-form-title"),
    matlogReset: document.querySelector("#matlog-reset"),
    matlogError: document.querySelector("#matlog-error"),
    matlogWorkOrderSelect: document.querySelector("#matlog-work-order-select"),
    sensorTableBody: document.querySelector("#sensor-table-body"),
    sensorForm: document.querySelector("#sensor-form"),
    sensorFormTitle: document.querySelector("#sensor-form-title"),
    sensorReset: document.querySelector("#sensor-reset"),
    sensorError: document.querySelector("#sensor-error"),
    sensorStatusSelect: document.querySelector("#sensor-status-select")
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
    return session && session.type === "official" && session.role === "ENGINEER" ? session : null;
  }

  async function getEngineerContext() {
    const session = getAuthorizedSession();
    if (!session) {
      return null;
    }
    const account = (await getState()).officialAccounts.find((item) => item.id === session.officialId);
    if (!account || !account.departmentId) {
      return null;
    }
    return {
      session,
      account,
      department: getDepartmentById(account.departmentId)
    };
  }

  function renderAccessGuard() {
    document.querySelector(".engineer-main").innerHTML = `
      <section class="section">
        <article class="glass-card access-guard">
          <div class="section-kicker">Restricted workspace</div>
          <h2>Field Engineer access is required</h2>
          <p>
            This page is reserved for the Field Engineer role. Sign in through the official portal with an engineer account to continue.
          </p>
          <div class="hero-engineer-actions">
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

  function statusTone(status) {
    if (status === "CRITICAL" || status === "REJECTED" || status === "OPEN") {
      return "alert";
    }
    if (
      status === "UNDER_REVIEW" ||
      status === "PENDING" ||
      status === "ASSIGNED" ||
      status === "SUBMITTED" ||
      status === "SEVERE" ||
      status === "HIGH" ||
      status === "EMERGENCY"
    ) {
      return "warning";
    }
    return "neutral";
  }

  async function getEngineerData(context) {
    const state = await getState();
    return {
      workOrders: (state.workOrders || []).filter((item) => item.engineerId === context.account.id),
      inspections: (state.inspections || []).filter((item) => item.engineerId === context.account.id),
      issues: (state.issueReports || []).filter((item) => item.engineerId === context.account.id),
      resources: (state.resourceRequests || []).filter((item) => item.engineerId === context.account.id),
      reports: (state.progressReports || []).filter((item) => item.engineerId === context.account.id),
      maintenanceLogs: (state.maintenanceLogs || []).filter((item) => item.engineerId === context.account.id),
      materialLogs: (state.taskMaterialLogs || []).filter((item) => item.engineerId === context.account.id),
      sensorDeployments: (state.sensorDeployments || []).filter((item) => item.engineerId === context.account.id),
      notifications: (state.activityFeed || []).slice(0, 4)
    };
  }

  async function renderHero(context) {
    const data = await getEngineerData(context);
    const activeOrders = data.workOrders.filter((item) => item.status === "IN_PROGRESS").length;
    const pendingInspections = data.inspections.filter((item) => item.status !== "COMPLETED").length;
    const openIssues = data.issues.filter((item) => item.status === "OPEN" || item.status === "UNDER_REVIEW").length;
    const pendingResources = data.resources.filter((item) => item.status === "PENDING").length;

    elements.engineerGreeting.textContent = `Good morning, ${context.account.name}`;
    const urgentOrder = data.workOrders.find((item) => item.priority === "EMERGENCY") || data.workOrders[0];
    elements.engineerEmergencyCard.innerHTML = urgentOrder
      ? `
        <span class="field-label">Emergency task active</span>
        <h3>${escapeHtml(urgentOrder.referenceNo)} requires field attention</h3>
        <p>${escapeHtml(urgentOrder.title)} at ${escapeHtml(urgentOrder.locationText)} is due on ${escapeHtml(
          urgentOrder.dueDate
        )} and is currently ${escapeHtml(formatStatus(urgentOrder.status))}.</p>
      `
      : `
        <span class="field-label">Emergency task active</span>
        <h3>No emergency task is active</h3>
        <p>Your current field queue does not include an emergency-priority work order.</p>
      `;

    elements.engineerKpiGrid.innerHTML = [
      { label: "Assigned work", value: data.workOrders.length, detail: "Current mapped work orders" },
      { label: "In progress", value: activeOrders, detail: "Execution already underway" },
      { label: "Pending inspections", value: pendingInspections, detail: "Site checks still outstanding" },
      { label: "Open issues", value: openIssues, detail: "New or unresolved field findings" },
      { label: "Resource requests", value: data.resources.length, detail: "Material and tool requests" },
      { label: "Pending resources", value: pendingResources, detail: "Requests awaiting response" }
    ]
      .map((item) => {
        return `
          <article class="kpi-item">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `;
      })
      .join("");
  }

  async function renderNotifications(context) {
    const data = await getEngineerData(context);
    elements.engineerNotificationList.innerHTML = data.notifications
      .map((item) => {
        return `
          <article class="notification-item">
            <div class="notification-item-head">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-pill neutral">${escapeHtml(item.meta)}</span>
            </div>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `;
      })
      .join("");
  }

  async function renderAssignedWork(context) {
    const data = await getEngineerData(context);
    if (!data.workOrders.length) {
      elements.assignedWorkList.innerHTML = '<div class="empty-state">No work orders are assigned to this engineer yet.</div>';
      return;
    }

    elements.assignedWorkList.innerHTML = data.workOrders
      .map((item) => {
        const controls = [];
        if (item.status === "APPROVED") {
          controls.push(`<button class="text-button" type="button" data-work-status="${item.id}" data-next-status="IN_PROGRESS">Start work</button>`);
        }
        if (item.status === "IN_PROGRESS") {
          controls.push(`<button class="text-button" type="button" data-work-status="${item.id}" data-next-status="PENDING_QC">Submit for QC</button>`);
        }
        if (item.status === "PENDING_QC") {
          controls.push(`<span class="mono">Awaiting QC review</span>`);
        }
        if (item.status === "COMPLETED") {
          controls.push(`<span class="mono">QC approved / completed</span>`);
        }
        return `
          <article class="work-card">
            <div class="work-card-head">
              <strong>${escapeHtml(item.referenceNo)}</strong>
              <span class="status-pill ${statusTone(item.priority)}">${escapeHtml(formatStatus(item.priority))}</span>
            </div>
            <p>${escapeHtml(item.title)}</p>
            <p>${escapeHtml(item.locationText)} / Due ${escapeHtml(item.dueDate)} / ${escapeHtml(formatStatus(item.status))}</p>
            <div class="row-actions">${controls.join("") || '<span class="mono">No action available</span>'}</div>
          </article>
        `;
      })
      .join("");
  }

  function bindAssignedWorkControls(context) {
    elements.assignedWorkList.addEventListener("click", async (event) => {
      const statusButton = event.target.closest("[data-work-status]");
      if (!statusButton) return;

      const nextStatus = statusButton.dataset.nextStatus;
      const workOrderId = statusButton.dataset.workStatus;
      const state = await getState();
      const workOrder = (state.workOrders || []).find((item) => item.id === workOrderId);
      if (!workOrder) return;

      try {
        await upsertWorkOrder({
          ...workOrder,
          status: nextStatus
        });
        renderAll(context);
      } catch (error) {
        globalScope.CRIMS.utils.showError(elements.reportError, error.message);
      }
    });
  }

  async function populateSelects(context) {
    const data = await getEngineerData(context);
    const currentInspectionSeverity = elements.inspectionSeveritySelect.value;
    const currentInspectionStatus = elements.inspectionStatusSelect.value;
    const currentIssueSeverity = elements.issueSeveritySelect.value;
    const currentIssueStatus = elements.issueStatusSelect.value;
    const currentResourceUrgency = elements.resourceUrgencySelect.value;
    const currentResourceStatus = elements.resourceStatusSelect.value;
    const currentReportStatus = elements.reportStatusSelect.value;
    const currentReportWorkOrder = elements.reportWorkOrderSelect.value;

    elements.inspectionSeveritySelect.innerHTML = [
      '<option value="">Select severity</option>',
      ...INSPECTION_SEVERITIES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.inspectionStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...INSPECTION_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.issueSeveritySelect.innerHTML = [
      '<option value="">Select severity</option>',
      ...INSPECTION_SEVERITIES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.issueStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...ISSUE_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.resourceUrgencySelect.innerHTML = [
      '<option value="">Select urgency</option>',
      ...PRIORITIES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.resourceStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...RESOURCE_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.reportStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...REPORT_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.reportWorkOrderSelect.innerHTML = [
      '<option value="">No linked work order</option>',
      ...data.workOrders.map((item) => `<option value="${item.id}">${escapeHtml(item.referenceNo)} - ${escapeHtml(item.title)}</option>`)
    ].join("");

    if (elements.mlogStatusSelect) {
      const curMlogStatus = elements.mlogStatusSelect.value;
      elements.mlogStatusSelect.innerHTML = [
        '<option value="">Select status</option>',
        ...MLOG_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
      ].join("");
      elements.mlogStatusSelect.value = curMlogStatus;
    }

    if (elements.matlogWorkOrderSelect) {
      const curMatWO = elements.matlogWorkOrderSelect.value;
      elements.matlogWorkOrderSelect.innerHTML = [
        '<option value="">No linked work order</option>',
        ...data.workOrders.map((item) => `<option value="${item.id}">${escapeHtml(item.referenceNo)} - ${escapeHtml(item.title)}</option>`)
      ].join("");
      elements.matlogWorkOrderSelect.value = curMatWO;
    }

    if (elements.sensorStatusSelect) {
      const curSensorStatus = elements.sensorStatusSelect.value;
      elements.sensorStatusSelect.innerHTML = [
        '<option value="">Select status</option>',
        ...SENSOR_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
      ].join("");
      elements.sensorStatusSelect.value = curSensorStatus;
    }

    elements.inspectionSeveritySelect.value = currentInspectionSeverity;
    elements.inspectionStatusSelect.value = currentInspectionStatus;
    elements.issueSeveritySelect.value = currentIssueSeverity;
    elements.issueStatusSelect.value = currentIssueStatus;
    elements.resourceUrgencySelect.value = currentResourceUrgency;
    elements.resourceStatusSelect.value = currentResourceStatus;
    elements.reportStatusSelect.value = currentReportStatus;
    elements.reportWorkOrderSelect.value = currentReportWorkOrder;
  }

  async function renderInspectionTable(context) {
    const data = await getEngineerData(context);
    if (!data.inspections.length) {
      elements.inspectionTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No inspections are currently assigned.</div></td></tr>';
      return;
    }

    elements.inspectionTableBody.innerHTML = data.inspections
      .map((item) => {
        return `
          <tr>
            <td><strong>${escapeHtml(item.title)}</strong></td>
            <td>${escapeHtml(item.locationText)}</td>
            <td><span class="status-pill ${statusTone(item.severity)}">${escapeHtml(formatStatus(item.severity))}</span></td>
            <td><span class="status-pill ${statusTone(item.status)}">${escapeHtml(formatStatus(item.status))}</span></td>
            <td>${escapeHtml(item.dueDate)}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-inspection-edit="${item.id}">Edit</button>
                <button class="text-button danger" type="button" data-inspection-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function renderIssueTable(context) {
    const data = await getEngineerData(context);
    if (!data.issues.length) {
      elements.issueTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No issue reports are currently logged.</div></td></tr>';
      return;
    }

    elements.issueTableBody.innerHTML = data.issues
      .map((item) => {
        return `
          <tr>
            <td><strong>${escapeHtml(item.title)}</strong></td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.locationText)}</td>
            <td><span class="status-pill ${statusTone(item.severity)}">${escapeHtml(formatStatus(item.severity))}</span></td>
            <td><span class="status-pill ${statusTone(item.status)}">${escapeHtml(formatStatus(item.status))}</span></td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-issue-edit="${item.id}">Edit</button>
                <button class="text-button danger" type="button" data-issue-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function renderResourceTable(context) {
    const data = await getEngineerData(context);
    if (!data.resources.length) {
      elements.resourceTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No resource requests are currently present.</div></td></tr>';
      return;
    }

    elements.resourceTableBody.innerHTML = data.resources
      .map((item) => {
        return `
          <tr>
            <td><strong>${escapeHtml(item.item)}</strong></td>
            <td>${escapeHtml(item.quantity)}</td>
            <td><span class="status-pill ${statusTone(item.urgency)}">${escapeHtml(formatStatus(item.urgency))}</span></td>
            <td><span class="status-pill ${statusTone(item.status)}">${escapeHtml(formatStatus(item.status))}</span></td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-resource-edit="${item.id}">Edit</button>
                <button class="text-button danger" type="button" data-resource-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function renderReportTable(context) {
    const data = await getEngineerData(context);
    const state = await getState();
    if (!data.reports.length) {
      elements.reportTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No progress reports have been submitted yet.</div></td></tr>';
      return;
    }

    elements.reportTableBody.innerHTML = data.reports
      .map((item) => {
        const workOrder = item.workOrderId ? state.workOrders.find((record) => record.id === item.workOrderId) : null;
        return `
          <tr>
            <td><strong>${escapeHtml(item.title)}</strong></td>
            <td>${escapeHtml((workOrder && workOrder.referenceNo) || "Unlinked")}</td>
            <td><span class="status-pill ${statusTone(item.status)}">${escapeHtml(formatStatus(item.status))}</span></td>
            <td>${escapeHtml(formatDisplayDate(item.submittedAt))}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-report-edit="${item.id}">Edit</button>
                <button class="text-button danger" type="button" data-report-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function renderAll(context) {
    renderHero(context);
    await renderNotifications(context);
    await renderAssignedWork(context);
    populateSelects(context);
    await renderInspectionTable(context);
    await renderIssueTable(context);
    await renderResourceTable(context);
    await renderReportTable(context);
    await renderMlogTable(context);
    await renderMatlogTable(context);
    await renderSensorTable(context);
  }

  function resetInspectionForm(context) {
    elements.inspectionForm.reset();
    elements.inspectionForm.elements.id.value = "";
    elements.inspectionForm.elements.departmentId.value = context.department.id;
    elements.inspectionForm.elements.engineerId.value = context.account.id;
    elements.inspectionFormTitle.textContent = "Add inspection";
    showError(elements.inspectionError, "");
  }

  function resetIssueForm(context) {
    elements.issueForm.reset();
    elements.issueForm.elements.id.value = "";
    elements.issueForm.elements.departmentId.value = context.department.id;
    elements.issueForm.elements.engineerId.value = context.account.id;
    elements.issueFormTitle.textContent = "Add issue report";
    showError(elements.issueError, "");
  }

  function resetResourceForm(context) {
    elements.resourceForm.reset();
    elements.resourceForm.elements.id.value = "";
    elements.resourceForm.elements.departmentId.value = context.department.id;
    elements.resourceForm.elements.engineerId.value = context.account.id;
    elements.resourceFormTitle.textContent = "Add resource request";
    showError(elements.resourceError, "");
  }

  function resetReportForm(context) {
    elements.reportForm.reset();
    elements.reportForm.elements.id.value = "";
    elements.reportForm.elements.departmentId.value = context.department.id;
    elements.reportForm.elements.engineerId.value = context.account.id;
    elements.reportForm.elements.submittedAt.value = "";
    elements.reportFormTitle.textContent = "Add progress report";
    showError(elements.reportError, "");
  }

  function validateInspection(payload) {
    if (!payload.title.trim() || !payload.locationText.trim() || !payload.severity || !payload.status || !payload.dueDate) {
      return "Complete the inspection title, location, severity, status, and due date.";
    }
    return "";
  }

  function validateIssue(payload) {
    if (!payload.title.trim() || !payload.category.trim() || !payload.locationText.trim() || !payload.severity || !payload.status) {
      return "Complete the issue title, category, location, severity, and status.";
    }
    return "";
  }

  function validateResource(payload) {
    if (!payload.item.trim() || !payload.quantity.trim() || !payload.urgency || !payload.status) {
      return "Complete the item, quantity, urgency, and status fields.";
    }
    return "";
  }

  function validateReport(payload) {
    if (!payload.title.trim() || !payload.summary.trim() || !payload.status) {
      return "Complete the report title, summary, and status.";
    }
    if (payload.summary.trim().length < 16) {
      return "Write a slightly more detailed field summary before saving the report.";
    }
    return "";
  }

  function bindInspectionControls(context) {
    elements.inspectionReset.addEventListener("click", () => resetInspectionForm(context));
    elements.inspectionForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.inspectionForm).entries());
      const error = validateInspection(payload);
      showError(elements.inspectionError, "");
      if (error) {
        showError(elements.inspectionError, error);
        return;
      }
      try {
        await upsertInspection(payload);
        resetInspectionForm(context);
        renderAll(context);
      } catch (err) {
        showError(elements.inspectionError, err.message);
      }
    });

    elements.inspectionTableBody.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-inspection-edit]");
      const deleteButton = event.target.closest("[data-inspection-delete]");
      if (editButton) {
        const record = (await getState()).inspections.find((item) => item.id === editButton.dataset.inspectionEdit);
        if (!record) return;
        Object.entries(record).forEach(([key, value]) => {
          if (elements.inspectionForm.elements[key]) {
            elements.inspectionForm.elements[key].value = value || "";
          }
        });
        elements.inspectionFormTitle.textContent = `Edit ${record.title}`;
        return;
      }
      if (deleteButton) {
        try {
          await deleteInspection(deleteButton.dataset.inspectionDelete);
          resetInspectionForm(context);
          renderAll(context);
        } catch (err) {
          showError(elements.inspectionError, err.message);
        }
      }
    });
  }

  function bindIssueControls(context) {
    elements.issueReset.addEventListener("click", () => resetIssueForm(context));
    elements.issueForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.issueForm).entries());
      const error = validateIssue(payload);
      showError(elements.issueError, "");
      if (error) {
        showError(elements.issueError, error);
        return;
      }
      try {
        await upsertIssueReport(payload);
        resetIssueForm(context);
        renderAll(context);
      } catch (err) {
        showError(elements.issueError, err.message);
      }
    });

    elements.issueTableBody.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-issue-edit]");
      const deleteButton = event.target.closest("[data-issue-delete]");
      if (editButton) {
        const record = (await getState()).issueReports.find((item) => item.id === editButton.dataset.issueEdit);
        if (!record) return;
        Object.entries(record).forEach(([key, value]) => {
          if (elements.issueForm.elements[key]) {
            elements.issueForm.elements[key].value = value || "";
          }
        });
        elements.issueFormTitle.textContent = `Edit ${record.title}`;
        return;
      }
      if (deleteButton) {
        try {
          await deleteIssueReport(deleteButton.dataset.issueDelete);
          resetIssueForm(context);
          renderAll(context);
        } catch (err) {
          showError(elements.issueError, err.message);
        }
      }
    });
  }

  function bindResourceControls(context) {
    elements.resourceReset.addEventListener("click", () => resetResourceForm(context));
    elements.resourceForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.resourceForm).entries());
      const error = validateResource(payload);
      showError(elements.resourceError, "");
      if (error) {
        showError(elements.resourceError, error);
        return;
      }
      try {
        await upsertResourceRequest(payload);
        resetResourceForm(context);
        renderAll(context);
      } catch (err) {
        showError(elements.resourceError, err.message);
      }
    });

    elements.resourceTableBody.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-resource-edit]");
      const deleteButton = event.target.closest("[data-resource-delete]");
      if (editButton) {
        const record = (await getState()).resourceRequests.find((item) => item.id === editButton.dataset.resourceEdit);
        if (!record) return;
        Object.entries(record).forEach(([key, value]) => {
          if (elements.resourceForm.elements[key]) {
            elements.resourceForm.elements[key].value = value || "";
          }
        });
        elements.resourceFormTitle.textContent = `Edit ${record.item}`;
        return;
      }
      if (deleteButton) {
        try {
          await deleteResourceRequest(deleteButton.dataset.resourceDelete);
          resetResourceForm(context);
          renderAll(context);
        } catch (err) {
          showError(elements.resourceError, err.message);
        }
      }
    });
  }

  function bindReportControls(context) {
    elements.reportReset.addEventListener("click", () => resetReportForm(context));
    elements.reportForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.reportForm).entries());
      const error = validateReport(payload);
      showError(elements.reportError, "");
      if (error) {
        showError(elements.reportError, error);
        return;
      }
      try {
        await upsertProgressReport(payload);
        resetReportForm(context);
        renderAll(context);
      } catch (err) {
        showError(elements.reportError, err.message);
      }
    });

    elements.reportTableBody.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-report-edit]");
      const deleteButton = event.target.closest("[data-report-delete]");
      if (editButton) {
        const record = (await getState()).progressReports.find((item) => item.id === editButton.dataset.reportEdit);
        if (!record) return;
        Object.entries(record).forEach(([key, value]) => {
          if (elements.reportForm.elements[key]) {
            elements.reportForm.elements[key].value = value || "";
          }
        });
        elements.reportFormTitle.textContent = `Edit ${record.title}`;
        return;
      }
      if (deleteButton) {
        try {
          await deleteProgressReport(deleteButton.dataset.reportDelete);
          resetReportForm(context);
          renderAll(context);
        } catch (err) {
          showError(elements.reportError, err.message);
        }
      }
    });
  }

  /* â”€â”€ Maintenance Log rendering â”€â”€ */
  async function renderMlogTable(context) {
    if (!elements.mlogTableBody) return;
    const data = await getEngineerData(context);
    if (!data.maintenanceLogs.length) {
      elements.mlogTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No maintenance logs recorded yet.</div></td></tr>';
      return;
    }
    elements.mlogTableBody.innerHTML = data.maintenanceLogs.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.title)}</strong></td>
        <td>${escapeHtml(item.date)}</td>
        <td>${escapeHtml(String(item.hoursSpent || 0))} hr</td>
        <td><span class="status-pill neutral">${escapeHtml(formatStatus(item.status))}</span></td>
        <td><div class="row-actions">
          <button class="text-button" type="button" data-mlog-edit="${item.id}">Edit</button>
          <button class="text-button danger" type="button" data-mlog-delete="${item.id}">Delete</button>
        </div></td>
      </tr>`).join("");
  }

  function resetMlogForm(context) {
    if (!elements.mlogForm) return;
    elements.mlogForm.reset();
    elements.mlogForm.elements.id.value = "";
    elements.mlogForm.elements.departmentId.value = context.department.id;
    elements.mlogForm.elements.engineerId.value = context.account.id;
    elements.mlogFormTitle.textContent = "Add maintenance log";
    globalScope.CRIMS.utils.showError(elements.mlogError, "");
  }

  function validateMlog(payload) {
    if (!payload.title.trim() || !payload.activity.trim() || !payload.date || !payload.status) {
      return "Title, description, date, and status are all required.";
    }
    if (payload.activity.trim().length < 12) return "Write a more detailed activity description.";
    return "";
  }

  function bindMlogControls(context) {
    if (!elements.mlogForm) return;
    elements.mlogReset.addEventListener("click", () => resetMlogForm(context));
    elements.mlogForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.mlogForm).entries());
      const error = validateMlog(payload);
      globalScope.CRIMS.utils.showError(elements.mlogError, "");
      if (error) { globalScope.CRIMS.utils.showError(elements.mlogError, error); return; }
      try {
        await upsertMaintenanceLog(payload);
        resetMlogForm(context);
        renderAll(context);
      } catch (err) { globalScope.CRIMS.utils.showError(elements.mlogError, err.message); }
    });
    elements.mlogTableBody.addEventListener("click", async (event) => {
      const editBtn = event.target.closest("[data-mlog-edit]");
      const delBtn = event.target.closest("[data-mlog-delete]");
      if (editBtn) {
        const record = (await getState()).maintenanceLogs.find((item) => item.id === editBtn.dataset.mlogEdit);
        if (!record) return;
        Object.entries(record).forEach(([k, v]) => { if (elements.mlogForm.elements[k]) elements.mlogForm.elements[k].value = v || ""; });
        elements.mlogFormTitle.textContent = `Edit: ${record.title}`;
      }
      if (delBtn) {
        try { await deleteMaintenanceLog(delBtn.dataset.mlogDelete); resetMlogForm(context); renderAll(context); }
        catch (err) { globalScope.CRIMS.utils.showError(elements.mlogError, err.message); }
      }
    });
  }

  /* â”€â”€ Material Log rendering â”€â”€ */
  async function renderMatlogTable(context) {
    if (!elements.matlogTableBody) return;
    const data = await getEngineerData(context);
    if (!data.materialLogs.length) {
      elements.matlogTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No material usage logged yet.</div></td></tr>';
      return;
    }
    elements.matlogTableBody.innerHTML = data.materialLogs.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.material)}</strong></td>
        <td>${escapeHtml(item.quantity)}</td>
        <td>${escapeHtml(item.unit)}</td>
        <td>${escapeHtml(item.usedOn)}</td>
        <td><div class="row-actions">
          <button class="text-button" type="button" data-matlog-edit="${item.id}">Edit</button>
          <button class="text-button danger" type="button" data-matlog-delete="${item.id}">Delete</button>
        </div></td>
      </tr>`).join("");
  }

  function resetMatlogForm(context) {
    if (!elements.matlogForm) return;
    elements.matlogForm.reset();
    elements.matlogForm.elements.id.value = "";
    elements.matlogForm.elements.departmentId.value = context.department.id;
    elements.matlogForm.elements.engineerId.value = context.account.id;
    elements.matlogFormTitle.textContent = "Add material usage";
    globalScope.CRIMS.utils.showError(elements.matlogError, "");
  }

  function validateMatlog(payload) {
    if (!payload.material.trim() || payload.material.trim().length < 3) return "Enter a valid material name (min 3 characters).";
    if (!payload.quantity.trim()) return "Quantity is required.";
    if (!payload.usedOn) return "Enter the date the material was used.";
    return "";
  }

  function bindMatlogControls(context) {
    if (!elements.matlogForm) return;
    elements.matlogReset.addEventListener("click", () => resetMatlogForm(context));
    elements.matlogForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.matlogForm).entries());
      const error = validateMatlog(payload);
      globalScope.CRIMS.utils.showError(elements.matlogError, "");
      if (error) { globalScope.CRIMS.utils.showError(elements.matlogError, error); return; }
      try {
        await upsertTaskMaterialLog(payload);
        resetMatlogForm(context);
        renderAll(context);
      } catch (err) { globalScope.CRIMS.utils.showError(elements.matlogError, err.message); }
    });
    elements.matlogTableBody.addEventListener("click", async (event) => {
      const editBtn = event.target.closest("[data-matlog-edit]");
      const delBtn = event.target.closest("[data-matlog-delete]");
      if (editBtn) {
        const record = (await getState()).taskMaterialLogs.find((item) => item.id === editBtn.dataset.matlogEdit);
        if (!record) return;
        Object.entries(record).forEach(([k, v]) => { if (elements.matlogForm.elements[k]) elements.matlogForm.elements[k].value = v || ""; });
        elements.matlogFormTitle.textContent = `Edit: ${record.material}`;
      }
      if (delBtn) {
        try { await deleteTaskMaterialLog(delBtn.dataset.matlogDelete); resetMatlogForm(context); renderAll(context); }
        catch (err) { globalScope.CRIMS.utils.showError(elements.matlogError, err.message); }
      }
    });
  }

  /* â”€â”€ Sensor Deployment rendering â”€â”€ */
  async function renderSensorTable(context) {
    if (!elements.sensorTableBody) return;
    const data = await getEngineerData(context);
    if (!data.sensorDeployments.length) {
      elements.sensorTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No sensor deployments recorded yet.</div></td></tr>';
      return;
    }
    elements.sensorTableBody.innerHTML = data.sensorDeployments.map((item) => `
      <tr>
        <td><strong>${escapeHtml(item.sensorType)}</strong></td>
        <td>${escapeHtml(item.assetLocation)}</td>
        <td class="mono">${escapeHtml(item.serialNo || 'â€“')}</td>
        <td><span class="status-pill ${item.status === 'ACTIVE' ? '' : 'alert'}">${escapeHtml(formatStatus(item.status))}</span></td>
        <td><div class="row-actions">
          <button class="text-button" type="button" data-sensor-edit="${item.id}">Edit</button>
          <button class="text-button danger" type="button" data-sensor-delete="${item.id}">Delete</button>
        </div></td>
      </tr>`).join("");
  }

  function resetSensorForm(context) {
    if (!elements.sensorForm) return;
    elements.sensorForm.reset();
    elements.sensorForm.elements.id.value = "";
    elements.sensorForm.elements.departmentId.value = context.department.id;
    elements.sensorForm.elements.engineerId.value = context.account.id;
    elements.sensorFormTitle.textContent = "Add deployment";
    globalScope.CRIMS.utils.showError(elements.sensorError, "");
  }

  function validateSensor(payload) {
    if (!payload.sensorType.trim() || payload.sensorType.trim().length < 3) return "Enter a valid sensor/equipment type.";
    if (!payload.assetLocation.trim() || payload.assetLocation.trim().length < 4) return "Enter the asset installation location.";
    if (!payload.status) return "Select the current sensor status.";
    return "";
  }

  function bindSensorControls(context) {
    if (!elements.sensorForm) return;
    elements.sensorReset.addEventListener("click", () => resetSensorForm(context));
    elements.sensorForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.sensorForm).entries());
      const error = validateSensor(payload);
      globalScope.CRIMS.utils.showError(elements.sensorError, "");
      if (error) { globalScope.CRIMS.utils.showError(elements.sensorError, error); return; }
      try {
        await upsertSensorDeployment(payload);
        resetSensorForm(context);
        renderAll(context);
      } catch (err) { globalScope.CRIMS.utils.showError(elements.sensorError, err.message); }
    });
    elements.sensorTableBody.addEventListener("click", async (event) => {
      const editBtn = event.target.closest("[data-sensor-edit]");
      const delBtn = event.target.closest("[data-sensor-delete]");
      if (editBtn) {
        const record = (await getState()).sensorDeployments.find((item) => item.id === editBtn.dataset.sensorEdit);
        if (!record) return;
        Object.entries(record).forEach(([k, v]) => { if (elements.sensorForm.elements[k]) elements.sensorForm.elements[k].value = v || ""; });
        elements.sensorFormTitle.textContent = `Edit: ${record.sensorType}`;
      }
      if (delBtn) {
        try { await deleteSensorDeployment(delBtn.dataset.sensorDelete); resetSensorForm(context); renderAll(context); }
        catch (err) { globalScope.CRIMS.utils.showError(elements.sensorError, err.message); }
      }
    });
  }

  function bindSession(context) {
    elements.signOutButton.addEventListener("click", () => {
      clearSession();
      globalScope.location.href = "./auth.html?mode=official";
    });

    const role = getRoleByCode(context.session.role);
    document.title = `InfraLynx | ${role ? role.name : "Field Engineer"} Workspace`;
  }

  async function init() {
    await initializeStore();
    const context = await getEngineerContext();
    if (!context) {
      renderAccessGuard();
      return;
    }

    bindLanguageSelector(elements.languageSelect);
    bindSession(context);
    renderAll(context);
    resetInspectionForm(context);
    resetIssueForm(context);
    resetResourceForm(context);
    resetReportForm(context);
    resetMlogForm(context);
    resetMatlogForm(context);
    resetSensorForm(context);
    bindSectionNavigation();
    bindInspectionControls(context);
    bindIssueControls(context);
    bindResourceControls(context);
    bindReportControls(context);
    bindMlogControls(context);
    bindMatlogControls(context);
    bindSensorControls(context);
    bindAssignedWorkControls(context);
  }

  init();
})(window);


