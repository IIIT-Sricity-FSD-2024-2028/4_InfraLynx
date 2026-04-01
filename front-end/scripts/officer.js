(function bootstrapOfficer(globalScope) {
  const {
    clearSession,
    deleteMaintenanceSchedule,
    deleteQuotation,
    deleteWorkOrder,
    deleteOutcomeReport,
    deleteProgressReport,
    formatDisplayDate,
    formatStatus,
    getDepartmentById,
    getRoleByCode,
    getSession,
    getState,
    initializeStore,
    upsertMaintenanceSchedule,
    upsertOutcomeReport,
    upsertProgressReport,
    upsertQuotation,
    upsertWorkOrder
  } = globalScope.CRIMS.store;
  const { bindLanguageSelector } = globalScope.CRIMS.i18n;

  const WORK_ORDER_STATUSES = [
    "DRAFT",
    "PENDING_OFFICER_APPROVAL",
    "PENDING_ADMIN_APPROVAL",
    "APPROVED",
    "IN_PROGRESS",
    "PENDING_QC",
    "COMPLETED",
    "REJECTED"
  ];

  const QUOTATION_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"];
  const MAINTENANCE_FREQUENCIES = ["ONE_TIME", "WEEKLY", "MONTHLY", "QUARTERLY", "ANNUAL"];

  const elements = {
    sideLinks: Array.from(document.querySelectorAll("[data-officer-nav]")),
    languageSelect: document.querySelector("#officer-language-select"),
    signOutButton: document.querySelector("#officer-sign-out"),
    officerGreeting: document.querySelector("#officer-greeting"),
    officerDepartmentName: document.querySelector("#officer-department-name"),
    officerKpiGrid: document.querySelector("#officer-kpi-grid"),
    officerAlertCard: document.querySelector("#officer-alert-card"),
    planningQueue: document.querySelector("#planning-queue"),
    engineerList: document.querySelector("#engineer-list"),
    workOrderTableBody: document.querySelector("#work-order-table-body"),
    workOrderForm: document.querySelector("#work-order-form"),
    workOrderFormTitle: document.querySelector("#work-order-form-title"),
    workOrderReset: document.querySelector("#work-order-reset"),
    workOrderError: document.querySelector("#work-order-error"),
    workOrderRequestSelect: document.querySelector("#work-order-request-select"),
    workOrderEngineerSelect: document.querySelector("#work-order-engineer-select"),
    workOrderPrioritySelect: document.querySelector("#work-order-priority-select"),
    workOrderStatusSelect: document.querySelector("#work-order-status-select"),
    quotationTableBody: document.querySelector("#quotation-table-body"),
    quotationForm: document.querySelector("#quotation-form"),
    quotationFormTitle: document.querySelector("#quotation-form-title"),
    quotationReset: document.querySelector("#quotation-reset"),
    quotationError: document.querySelector("#quotation-error"),
    quotationStatusSelect: document.querySelector("#quotation-status-select"),
    scheduleTableBody: document.querySelector("#schedule-table-body"),
    scheduleForm: document.querySelector("#schedule-form"),
    scheduleFormTitle: document.querySelector("#schedule-form-title"),
    scheduleReset: document.querySelector("#schedule-reset"),
    scheduleError: document.querySelector("#schedule-error"),
    scheduleFrequencySelect: document.querySelector("#schedule-frequency-select"),
    scheduleAssigneeSelect: document.querySelector("#schedule-assignee-select"),
    progressInboxBody: document.querySelector("#progress-inbox-body"),
    outcomeTableBody: document.querySelector("#outcome-table-body"),
    outcomeForm: document.querySelector("#outcome-form"),
    outcomeFormTitle: document.querySelector("#outcome-form-title"),
    outcomeReset: document.querySelector("#outcome-reset"),
    outcomeError: document.querySelector("#outcome-error"),
    outcomeWorkOrderSelect: document.querySelector("#outcome-work-order-select")
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
    return session && session.type === "official" && session.role === "OFFICER" ? session : null;
  }

  function getOfficerContext() {
    const session = getAuthorizedSession();
    if (!session) {
      return null;
    }

    const account = getState().officialAccounts.find((item) => item.id === session.officialId);
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
    document.querySelector(".officer-main").innerHTML = `
      <section class="section">
        <article class="glass-card access-guard">
          <div class="section-kicker">Restricted workspace</div>
          <h2>Department Officer access is required</h2>
          <p>
            This page is reserved for the operational officer role. Sign in through the official portal with a Department Officer account to continue.
          </p>
          <div class="hero-officer-actions">
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
    if (status === "REJECTED") {
      return "alert";
    }
    if (
      status === "UNDER_REVIEW" ||
      status === "PENDING_OFFICER_APPROVAL" ||
      status === "PENDING_ADMIN_APPROVAL" ||
      status === "PENDING_QC"
    ) {
      return "warning";
    }
    return "neutral";
  }

  function getDepartmentData(departmentId) {
    const state = getState();
    return {
      requests: state.requests.filter((request) => request.departmentId === departmentId),
      workOrders: (state.workOrders || []).filter((item) => item.departmentId === departmentId),
      quotations: (state.quotations || []).filter((item) => item.departmentId === departmentId),
      schedules: (state.maintenanceSchedules || []).filter((item) => item.departmentId === departmentId),
      engineers: state.officialAccounts.filter((item) => item.role === "ENGINEER" && item.departmentId === departmentId),
      progressReports: (state.progressReports || []).filter((item) => item.departmentId === departmentId),
      outcomeReports: (state.outcomeReports || []).filter((item) => item.departmentId === departmentId)
    };
  }

  function renderHero(context) {
    const { department, account } = context;
    const data = getDepartmentData(department.id);
    const assignedCount = data.workOrders.filter((item) => item.engineerId).length;
    const reviewCount = data.quotations.filter((item) => item.status === "UNDER_REVIEW").length;
    const pendingQueue = data.requests.filter((item) => item.status === "RECEIVED" || item.status === "UNDER_REVIEW").length;

    elements.officerGreeting.textContent = `Operational control for ${account.name}`;
    elements.officerDepartmentName.textContent = department.name;

    elements.officerKpiGrid.innerHTML = [
      {
        label: "Open work orders",
        value: data.workOrders.length,
        detail: "Department execution queue"
      },
      {
        label: "Assigned engineers",
        value: assignedCount,
        detail: "Orders already mapped to field staff"
      },
      {
        label: "Quotes in review",
        value: reviewCount,
        detail: "Verification still pending"
      },
      {
        label: "Intake backlog",
        value: pendingQueue,
        detail: "Requests waiting on officer action"
      }
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

    const urgentOrder = data.workOrders.find((item) => item.priority === "EMERGENCY") || data.workOrders[0];
    elements.officerAlertCard.innerHTML = urgentOrder
      ? `
        <span class="field-label">Priority watch</span>
        <h3>${escapeHtml(urgentOrder.referenceNo)} needs operational focus</h3>
        <p>${escapeHtml(urgentOrder.title)} at ${escapeHtml(urgentOrder.locationText)} is currently ${escapeHtml(
          formatStatus(urgentOrder.status)
        )} and due on ${escapeHtml(urgentOrder.dueDate)}.</p>
      `
      : `
        <span class="field-label">Priority watch</span>
        <h3>No urgent work order is active</h3>
        <p>The department queue is currently clear of emergency execution items.</p>
      `;
  }

  function renderPlanningQueue(context) {
    const { department } = context;
    const queue = getDepartmentData(department.id).requests.filter((item) => item.status !== "CLOSED");

    if (!queue.length) {
      elements.planningQueue.innerHTML = '<div class="empty-state">No department requests are currently visible in the officer queue.</div>';
      return;
    }

    elements.planningQueue.innerHTML = queue
      .map((request) => {
        return `
          <article class="queue-item">
            <div class="queue-item-head">
              <strong>${escapeHtml(request.publicReferenceNo)}</strong>
              <span class="status-pill ${statusTone(request.status)}">${escapeHtml(formatStatus(request.status))}</span>
            </div>
            <p>${escapeHtml(request.title)}</p>
            <p>${escapeHtml(request.locationText)} / ${escapeHtml(formatStatus(request.urgency))} priority</p>
          </article>
        `;
      })
      .join("");
  }

  function renderEngineerList(context) {
    const { department } = context;
    const data = getDepartmentData(department.id);

    if (!data.engineers.length) {
      elements.engineerList.innerHTML = '<div class="empty-state">No engineers are mapped to this department yet.</div>';
      return;
    }

    elements.engineerList.innerHTML = data.engineers
      .map((engineer) => {
        const assigned = data.workOrders.filter((item) => item.engineerId === engineer.id).length;
        return `
          <article class="engineer-item">
            <div class="engineer-item-head">
              <strong>${escapeHtml(engineer.name)}</strong>
              <span class="status-pill neutral">${assigned} assigned</span>
            </div>
            <p>${escapeHtml(engineer.email)}</p>
          </article>
        `;
      })
      .join("");
  }

  function populateSelects(context) {
    const { department } = context;
    const data = getDepartmentData(department.id);

    const currentWorkOrderRequest = elements.workOrderRequestSelect.value;
    const currentWorkOrderEngineer = elements.workOrderEngineerSelect.value;
    const currentPriority = elements.workOrderPrioritySelect.value;
    const currentWorkStatus = elements.workOrderStatusSelect.value;
    const currentQuotationStatus = elements.quotationStatusSelect.value;
    const currentScheduleFrequency = elements.scheduleFrequencySelect.value;
    const currentScheduleAssignee = elements.scheduleAssigneeSelect.value;

    const currentOutcomeWorkOrder = elements.outcomeWorkOrderSelect ? elements.outcomeWorkOrderSelect.value : "";

    elements.workOrderRequestSelect.innerHTML = [
      '<option value="">No linked request</option>',
      ...data.requests.map((item) => `<option value="${item.requestId}">${escapeHtml(item.publicReferenceNo)} - ${escapeHtml(item.title)}</option>`)
    ].join("");

    elements.workOrderEngineerSelect.innerHTML = [
      '<option value="">Unassigned</option>',
      ...data.engineers.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
    ].join("");

    elements.workOrderPrioritySelect.innerHTML = [
      '<option value="">Select priority</option>',
      '<option value="LOW">Low</option>',
      '<option value="MEDIUM">Medium</option>',
      '<option value="HIGH">High</option>',
      '<option value="EMERGENCY">Emergency</option>'
    ].join("");

    elements.workOrderStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...WORK_ORDER_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.quotationStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...QUOTATION_STATUSES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.scheduleFrequencySelect.innerHTML = [
      '<option value="">Select frequency</option>',
      ...MAINTENANCE_FREQUENCIES.map((item) => `<option value="${item}">${formatStatus(item)}</option>`)
    ].join("");

    elements.scheduleAssigneeSelect.innerHTML = [
      '<option value="">Unassigned</option>',
      ...data.engineers.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
    ].join("");

    elements.workOrderRequestSelect.value = currentWorkOrderRequest;
    elements.workOrderEngineerSelect.value = currentWorkOrderEngineer;
    elements.workOrderPrioritySelect.value = currentPriority;
    elements.workOrderStatusSelect.value = currentWorkStatus;
    elements.quotationStatusSelect.value = currentQuotationStatus;
    elements.scheduleFrequencySelect.value = currentScheduleFrequency;
    elements.scheduleAssigneeSelect.value = currentScheduleAssignee;

    if (elements.outcomeWorkOrderSelect) {
      elements.outcomeWorkOrderSelect.innerHTML = [
        '<option value="">No linked work order</option>',
        ...data.workOrders.map((item) => `<option value="${item.id}">${escapeHtml(item.referenceNo)} — ${escapeHtml(item.title)}</option>`)
      ].join("");
      elements.outcomeWorkOrderSelect.value = currentOutcomeWorkOrder;
    }
  }

  function renderWorkOrders(context) {
    const { department } = context;
    const data = getDepartmentData(department.id);

    if (!data.workOrders.length) {
      elements.workOrderTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No work orders exist for this department yet.</div></td></tr>';
      return;
    }

    elements.workOrderTableBody.innerHTML = data.workOrders
      .map((item) => {
        const engineer = item.engineerId ? getState().officialAccounts.find((account) => account.id === item.engineerId) : null;
        return `
          <tr>
            <td><strong class="mono">${escapeHtml(item.referenceNo)}</strong><span>${escapeHtml(item.title)}</span></td>
            <td>${escapeHtml((engineer && engineer.name) || "Unassigned")}</td>
            <td><span class="status-pill ${statusTone(item.status)}">${escapeHtml(formatStatus(item.status))}</span></td>
            <td>${escapeHtml(formatStatus(item.priority))}</td>
            <td>${escapeHtml(item.dueDate)}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-work-edit="${item.id}">Edit</button>
                <button class="text-button danger" type="button" data-work-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderQuotations(context) {
    const { department } = context;
    const data = getDepartmentData(department.id);

    if (!data.quotations.length) {
      elements.quotationTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No quotations are currently registered for this department.</div></td></tr>';
      return;
    }

    elements.quotationTableBody.innerHTML = data.quotations
      .map((item) => {
        return `
          <tr>
            <td>${escapeHtml(item.vendor)}</td>
            <td>${escapeHtml(item.item)}</td>
            <td><span class="mono">INR ${escapeHtml(Number(item.amountLakhs).toFixed(1))} L</span></td>
            <td><span class="status-pill ${item.gstValid ? "neutral" : "alert"}">${item.gstValid ? "Verified" : "Missing"}</span></td>
            <td><span class="status-pill ${statusTone(item.status)}">${escapeHtml(formatStatus(item.status))}</span></td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-quote-edit="${item.id}">Edit</button>
                <button class="text-button danger" type="button" data-quote-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderSchedules(context) {
    const { department } = context;
    const data = getDepartmentData(department.id);

    if (!data.schedules.length) {
      elements.scheduleTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No maintenance schedules exist for this department.</div></td></tr>';
      return;
    }

    elements.scheduleTableBody.innerHTML = data.schedules
      .map((item) => {
        const engineer = item.assignee ? getState().officialAccounts.find((account) => account.id === item.assignee) : null;
        return `
          <tr>
            <td><strong>${escapeHtml(item.title)}</strong></td>
            <td>${escapeHtml(formatStatus(item.frequency))}</td>
            <td>${escapeHtml(item.nextDate)}</td>
            <td>${escapeHtml((engineer && engineer.name) || "Unassigned")}</td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-schedule-edit="${item.id}">Edit</button>
                <button class="text-button danger" type="button" data-schedule-delete="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderAll(context) {
    renderHero(context);
    renderPlanningQueue(context);
    renderEngineerList(context);
    populateSelects(context);
    renderWorkOrders(context);
    renderQuotations(context);
    renderSchedules(context);
    renderProgressInbox(context);
    renderOutcomeTable(context);
  }

  function resetWorkOrderForm(context) {
    elements.workOrderForm.reset();
    elements.workOrderForm.elements.id.value = "";
    elements.workOrderForm.elements.referenceNo.value = "";
    elements.workOrderForm.elements.departmentId.value = context.department.id;
    elements.workOrderFormTitle.textContent = "Add work order";
    showError(elements.workOrderError, "");
  }

  function resetQuotationForm(context) {
    elements.quotationForm.reset();
    elements.quotationForm.elements.id.value = "";
    elements.quotationForm.elements.departmentId.value = context.department.id;
    elements.quotationFormTitle.textContent = "Add quotation";
    showError(elements.quotationError, "");
  }

  function resetScheduleForm(context) {
    elements.scheduleForm.reset();
    elements.scheduleForm.elements.id.value = "";
    elements.scheduleForm.elements.departmentId.value = context.department.id;
    elements.scheduleFormTitle.textContent = "Add schedule";
    showError(elements.scheduleError, "");
  }

  function validateWorkOrder(payload) {
    if (!payload.title.trim() || !payload.locationText.trim() || !payload.priority || !payload.status || !payload.dueDate) {
      return "Complete the work order title, location, priority, status, and due date.";
    }
    if (payload.notes.trim().length < 8) {
      return "Add a short operational note before saving the work order.";
    }
    return "";
  }

  function validateQuotation(payload) {
    if (!payload.vendor.trim() || !payload.item.trim() || !payload.status) {
      return "Vendor, item, and status are required for quotations.";
    }
    if (Number(payload.amountLakhs) <= 0) {
      return "Quotation amount must be greater than zero.";
    }
    return "";
  }

  function validateSchedule(payload) {
    if (!payload.title.trim() || !payload.frequency || !payload.nextDate) {
      return "Title, frequency, and next inspection date are required.";
    }
    return "";
  }

  function bindWorkOrderControls(context) {
    elements.workOrderReset.addEventListener("click", () => resetWorkOrderForm(context));

    elements.workOrderForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.workOrderForm).entries());
      const validationMessage = validateWorkOrder(payload);
      showError(elements.workOrderError, "");

      if (validationMessage) {
        showError(elements.workOrderError, validationMessage);
        return;
      }

      try {
        upsertWorkOrder(payload);
        resetWorkOrderForm(context);
        renderAll(context);
      } catch (error) {
        showError(elements.workOrderError, error.message);
      }
    });

    elements.workOrderTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-work-edit]");
      const deleteButton = event.target.closest("[data-work-delete]");

      if (editButton) {
        const workOrder = getState().workOrders.find((item) => item.id === editButton.dataset.workEdit);
        if (!workOrder) {
          return;
        }

        Object.entries(workOrder).forEach(([key, value]) => {
          if (elements.workOrderForm.elements[key]) {
            elements.workOrderForm.elements[key].value = value || "";
          }
        });
        elements.workOrderFormTitle.textContent = `Edit ${workOrder.referenceNo}`;
        showError(elements.workOrderError, "");
        return;
      }

      if (deleteButton) {
        try {
          deleteWorkOrder(deleteButton.dataset.workDelete);
          resetWorkOrderForm(context);
          renderAll(context);
        } catch (error) {
          showError(elements.workOrderError, error.message);
        }
      }
    });
  }

  function bindQuotationControls(context) {
    elements.quotationReset.addEventListener("click", () => resetQuotationForm(context));

    elements.quotationForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.quotationForm).entries());
      const validationMessage = validateQuotation(payload);
      showError(elements.quotationError, "");

      if (validationMessage) {
        showError(elements.quotationError, validationMessage);
        return;
      }

      try {
        upsertQuotation(payload);
        resetQuotationForm(context);
        renderAll(context);
      } catch (error) {
        showError(elements.quotationError, error.message);
      }
    });

    elements.quotationTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-quote-edit]");
      const deleteButton = event.target.closest("[data-quote-delete]");

      if (editButton) {
        const quote = getState().quotations.find((item) => item.id === editButton.dataset.quoteEdit);
        if (!quote) {
          return;
        }

        Object.entries(quote).forEach(([key, value]) => {
          if (elements.quotationForm.elements[key]) {
            if (key === "gstValid") {
              elements.quotationForm.elements.gstValid.checked = Boolean(value);
            } else {
              elements.quotationForm.elements[key].value = value || "";
            }
          }
        });
        elements.quotationFormTitle.textContent = `Edit ${quote.vendor}`;
        showError(elements.quotationError, "");
        return;
      }

      if (deleteButton) {
        try {
          deleteQuotation(deleteButton.dataset.quoteDelete);
          resetQuotationForm(context);
          renderAll(context);
        } catch (error) {
          showError(elements.quotationError, error.message);
        }
      }
    });
  }

  function bindScheduleControls(context) {
    elements.scheduleReset.addEventListener("click", () => resetScheduleForm(context));

    elements.scheduleForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.scheduleForm).entries());
      const validationMessage = validateSchedule(payload);
      showError(elements.scheduleError, "");

      if (validationMessage) {
        showError(elements.scheduleError, validationMessage);
        return;
      }

      try {
        upsertMaintenanceSchedule(payload);
        resetScheduleForm(context);
        renderAll(context);
      } catch (error) {
        showError(elements.scheduleError, error.message);
      }
    });

    elements.scheduleTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-schedule-edit]");
      const deleteButton = event.target.closest("[data-schedule-delete]");

      if (editButton) {
        const schedule = getState().maintenanceSchedules.find((item) => item.id === editButton.dataset.scheduleEdit);
        if (!schedule) {
          return;
        }

        Object.entries(schedule).forEach(([key, value]) => {
          if (elements.scheduleForm.elements[key]) {
            elements.scheduleForm.elements[key].value = value || "";
          }
        });
        elements.scheduleFormTitle.textContent = `Edit ${schedule.title}`;
        showError(elements.scheduleError, "");
        return;
      }

      if (deleteButton) {
        try {
          deleteMaintenanceSchedule(deleteButton.dataset.scheduleDelete);
          resetScheduleForm(context);
          renderAll(context);
        } catch (error) {
          showError(elements.scheduleError, error.message);
        }
      }
    });
  }

  /* ── Progress inbox ── */
  function renderProgressInbox(context) {
    if (!elements.progressInboxBody) return;
    const data = getDepartmentData(context.department.id);
    if (!data.progressReports.length) {
      elements.progressInboxBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No progress reports in the inbox yet.</div></td></tr>';
      return;
    }
    elements.progressInboxBody.innerHTML = data.progressReports.map((item) => {
      const dt = item.submittedAt ? new Date(item.submittedAt).toLocaleDateString("en-IN") : "";
      const isAcknowledged = item.status === "ACKNOWLEDGED";
      return `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td>${escapeHtml(dt)}</td>
          <td>${escapeHtml(item.summary ? item.summary.slice(0, 60) + (item.summary.length > 60 ? '…' : '') : '')}</td>
          <td><span class="status-pill ${isAcknowledged ? 'neutral' : 'warning'}">${escapeHtml(formatStatus(item.status))}</span></td>
          <td><div class="row-actions">
            ${!isAcknowledged ? `<button class="text-button" type="button" data-report-ack="${item.id}">Acknowledge</button>` : '<span class="mono">Done</span>'}
          </div></td>
        </tr>`;
    }).join("");
  }

  /* ── Outcome reports ── */
  function renderOutcomeTable(context) {
    if (!elements.outcomeTableBody) return;
    const data = getDepartmentData(context.department.id);
    if (!data.outcomeReports.length) {
      elements.outcomeTableBody.innerHTML = '<tr><td colspan="5"><div class="empty-state">No outcome reports submitted yet for this department.</div></td></tr>';
      return;
    }
    elements.outcomeTableBody.innerHTML = data.outcomeReports.map((item) => {
      const wo = item.workOrderId ? getState().workOrders.find((w) => w.id === item.workOrderId) : null;
      return `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td>${escapeHtml(wo ? wo.referenceNo : 'Unlinked')}</td>
          <td><span class="status-pill ${item.outcome === 'SUCCESSFUL' ? '' : 'warning'}">${escapeHtml(formatStatus(item.outcome))}</span></td>
          <td class="mono">INR ${escapeHtml(Number(item.budgetUsed).toFixed(2))} Cr</td>
          <td><div class="row-actions">
            <button class="text-button" type="button" data-outcome-edit="${item.id}">Edit</button>
            <button class="text-button danger" type="button" data-outcome-delete="${item.id}">Delete</button>
          </div></td>
        </tr>`;
    }).join("");
  }

  function resetOutcomeForm(context) {
    if (!elements.outcomeForm) return;
    elements.outcomeForm.reset();
    elements.outcomeForm.elements.id.value = "";
    elements.outcomeForm.elements.departmentId.value = context.department.id;
    elements.outcomeForm.elements.preparedBy.value = context.account.id;
    elements.outcomeFormTitle.textContent = "Add outcome report";
    globalScope.CRIMS.utils.showError(elements.outcomeError, "");
  }

  function validateOutcomeReport(payload) {
    if (!payload.title.trim() || payload.title.trim().length < 6) return "Enter a descriptive report title.";
    if (!payload.summary.trim() || payload.summary.trim().length < 20) return "Write a summary of at least 20 characters.";
    if (!payload.outcome) return "Select the project outcome.";
    if (Number(payload.budgetSanctioned) <= 0) return "Enter the sanctioned budget amount.";
    return "";
  }

  function bindProgressInboxControls(context) {
    if (!elements.progressInboxBody) return;
    elements.progressInboxBody.addEventListener("click", (event) => {
      const ackButton = event.target.closest("[data-report-ack]");
      if (!ackButton) return;
      const state = getState();
      const report = state.progressReports.find((item) => item.id === ackButton.dataset.reportAck);
      if (!report) return;
      upsertProgressReport({ ...report, status: "ACKNOWLEDGED" });
      renderAll(context);
    });
  }

  function bindOutcomeControls(context) {
    if (!elements.outcomeForm) return;
    elements.outcomeReset.addEventListener("click", () => resetOutcomeForm(context));
    elements.outcomeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.outcomeForm).entries());
      const error = validateOutcomeReport(payload);
      globalScope.CRIMS.utils.showError(elements.outcomeError, "");
      if (error) { globalScope.CRIMS.utils.showError(elements.outcomeError, error); return; }
      try {
        upsertOutcomeReport(payload);
        resetOutcomeForm(context);
        renderAll(context);
      } catch (err) { globalScope.CRIMS.utils.showError(elements.outcomeError, err.message); }
    });
    elements.outcomeTableBody.addEventListener("click", (event) => {
      const editBtn = event.target.closest("[data-outcome-edit]");
      const delBtn = event.target.closest("[data-outcome-delete]");
      if (editBtn) {
        const record = getState().outcomeReports.find((item) => item.id === editBtn.dataset.outcomeEdit);
        if (!record) return;
        Object.entries(record).forEach(([k, v]) => { if (elements.outcomeForm.elements[k]) elements.outcomeForm.elements[k].value = v == null ? "" : v; });
        elements.outcomeFormTitle.textContent = `Edit: ${record.title}`;
        return;
      }
      if (delBtn) {
        try { deleteOutcomeReport(delBtn.dataset.outcomeDelete); resetOutcomeForm(context); renderAll(context); }
        catch (err) { globalScope.CRIMS.utils.showError(elements.outcomeError, err.message); }
      }
    });
  }

  function bindSession(context) {
    elements.signOutButton.addEventListener("click", () => {
      clearSession();
      globalScope.location.href = "./auth.html?mode=official";
    });

    const role = getRoleByCode(context.session.role);
    document.title = `InfraLynx | ${role ? role.name : "Department Officer"} Workspace`;
  }

  function init() {
    initializeStore();
    const context = getOfficerContext();

    if (!context) {
      renderAccessGuard();
      return;
    }

    bindLanguageSelector(elements.languageSelect);
    bindSession(context);
    renderAll(context);
    resetWorkOrderForm(context);
    resetQuotationForm(context);
    resetScheduleForm(context);
    resetOutcomeForm(context);
    bindSectionNavigation();
    bindWorkOrderControls(context);
    bindQuotationControls(context);
    bindScheduleControls(context);
    bindProgressInboxControls(context);
    bindOutcomeControls(context);
  }

  init();
})(window);
