(function bootstrapCfo(globalScope) {
  const {
    clearSession,
    deleteBudgetProposal,
    deleteProcurementBill,
    formatStatus,
    getDepartmentById,
    getRoleByCode,
    getSession,
    getState,
    initializeStore,
    upsertBudgetProposal,
    upsertProcurementBill
  } = globalScope.CRIMS.store;
  const { bindLanguageSelector } = globalScope.CRIMS.i18n;

  const PROPOSAL_STAGES = [
    "DRAFT",
    "PENDING_ADMIN_FORWARD",
    "PENDING_OFFICER_VERIFICATION",
    "PENDING_CFO_REVIEW",
    "APPROVED",
    "PARTIALLY_RELEASED",
    "FULLY_RELEASED",
    "REJECTED"
  ];
  const BILL_STATUSES = ["SUBMITTED", "UNDER_VERIFICATION", "APPROVED", "REJECTED", "PAID"];

  const elements = {
    languageSelect: document.querySelector("#cfo-language-select"),
    signOutButton: document.querySelector("#cfo-sign-out"),
    greeting: document.querySelector("#cfo-greeting"),
    copy: document.querySelector("#cfo-copy"),
    focusCard: document.querySelector("#cfo-focus-card"),
    watchCard: document.querySelector("#cfo-watch-card"),
    kpiGrid: document.querySelector("#cfo-kpis"),
    budgetList: document.querySelector("#cfo-budget-list"),
    feedList: document.querySelector("#cfo-feed-list"),
    proposalTableBody: document.querySelector("#proposal-table-body"),
    proposalForm: document.querySelector("#proposal-form"),
    proposalFormTitle: document.querySelector("#proposal-form-title"),
    proposalResetButton: document.querySelector("#proposal-reset"),
    proposalError: document.querySelector("#proposal-error"),
    proposalDepartmentSelect: document.querySelector("#proposal-department-select"),
    proposalStageSelect: document.querySelector("#proposal-stage-select"),
    billTableBody: document.querySelector("#bill-table-body"),
    billForm: document.querySelector("#bill-form"),
    billFormTitle: document.querySelector("#bill-form-title"),
    billResetButton: document.querySelector("#bill-reset"),
    billError: document.querySelector("#bill-error"),
    billDepartmentSelect: document.querySelector("#bill-department-select"),
    billWorkOrderSelect: document.querySelector("#bill-work-order-select"),
    billStatusSelect: document.querySelector("#bill-status-select")
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
    element.textContent = message || "";
    element.classList.toggle("hidden", !message);
  }

  function formatInr(value, unit) {
    return `INR ${Number(value || 0).toFixed(1)} ${unit}`;
  }

  function getAuthorizedSession() {
    const session = getSession();
    return session && session.type === "official" && session.role === "CFO" ? session : null;
  }

  function renderAccessGuard() {
    document.querySelector(".cfo-main").innerHTML = `
      <section class="section">
        <article class="glass-card access-guard">
          <div class="section-kicker">Restricted workspace</div>
          <h2>CFO access is required</h2>
          <p>Sign in through the official portal with a CFO account to continue.</p>
          <div class="row-actions">
            <a class="button button-primary" href="./auth.html?mode=official">Go to official sign in</a>
            <a class="button button-secondary" href="./index.html">Return to public portal</a>
          </div>
        </article>
      </section>
    `;
  }

  function statusTone(status) {
    if (status === "REJECTED") {
      return "alert";
    }

    if (String(status).includes("PENDING") || status === "UNDER_VERIFICATION" || status === "SUBMITTED") {
      return "warning";
    }

    return "neutral";
  }

  function populateSelects() {
    const state = getState();
    const currentProposalDepartment = elements.proposalDepartmentSelect.value;
    const currentProposalStage = elements.proposalStageSelect.value;
    const currentBillDepartment = elements.billDepartmentSelect.value;
    const currentBillWorkOrder = elements.billWorkOrderSelect.value;
    const currentBillStatus = elements.billStatusSelect.value;

    elements.proposalDepartmentSelect.innerHTML = [
      '<option value="">Select department</option>',
      ...state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
    ].join("");

    elements.billDepartmentSelect.innerHTML = [
      '<option value="">Select department</option>',
      ...state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
    ].join("");

    elements.billWorkOrderSelect.innerHTML = [
      '<option value="">No linked work order</option>',
      ...(state.workOrders || []).map((workOrder) => {
        return `<option value="${workOrder.id}">${escapeHtml(workOrder.referenceNo)} - ${escapeHtml(workOrder.title)}</option>`;
      })
    ].join("");

    elements.proposalStageSelect.innerHTML = [
      '<option value="">Select stage</option>',
      ...PROPOSAL_STAGES.map((stage) => `<option value="${stage}">${formatStatus(stage)}</option>`)
    ].join("");

    elements.billStatusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...BILL_STATUSES.map((status) => `<option value="${status}">${formatStatus(status)}</option>`)
    ].join("");

    elements.proposalDepartmentSelect.value = currentProposalDepartment;
    elements.proposalStageSelect.value = currentProposalStage;
    elements.billDepartmentSelect.value = currentBillDepartment;
    elements.billWorkOrderSelect.value = currentBillWorkOrder;
    elements.billStatusSelect.value = currentBillStatus;
  }

  function renderHero(session) {
    const state = getState();
    const pendingProposal =
      (state.budgetProposals || []).find((item) => item.stage === "PENDING_CFO_REVIEW") || (state.budgetProposals || [])[0];
    const gstRiskBill =
      (state.procurementBills || []).find((item) => !item.gstValid || item.status === "UNDER_VERIFICATION") ||
      (state.procurementBills || [])[0];

    elements.greeting.textContent = `Financial control for ${session.name}`;
    elements.copy.textContent =
      "Monitor budgets, validate procurement, and track decisions.";

    elements.focusCard.innerHTML = pendingProposal
      ? `
        <span class="field-label">Finance focus</span>
        <h3>${escapeHtml(pendingProposal.title)} needs release attention</h3>
        <p>
          ${escapeHtml((getDepartmentById(pendingProposal.departmentId) || {}).name || "Unmapped department")}
          is seeking <span class="mono">${escapeHtml(formatInr(pendingProposal.amountCr, "Cr"))}</span>
          and the proposal is currently <span class="mono">${escapeHtml(formatStatus(pendingProposal.stage))}</span>.
        </p>
      `
      : `
        <span class="field-label">Finance focus</span>
        <h3>No proposal is waiting for CFO review</h3>
        <p>The finance queue is currently clear of pending budget proposals.</p>
      `;

    elements.watchCard.innerHTML = gstRiskBill
      ? `
        <span class="field-label">Verification watch</span>
        <h3>${escapeHtml(gstRiskBill.vendor)} needs billing scrutiny</h3>
        <p>
          Bill status is <span class="mono">${escapeHtml(formatStatus(gstRiskBill.status))}</span> for
          <span class="mono">${escapeHtml(formatInr(gstRiskBill.amountLakhs, "L"))}</span>.
          GST validation is ${gstRiskBill.gstValid ? "complete" : "still pending"}.
        </p>
      `
      : `
        <span class="field-label">Verification watch</span>
        <h3>No procurement risk is currently highlighted</h3>
        <p>All visible finance items are in a steady state in this prototype.</p>
      `;
  }

  function renderOverview() {
    const state = getState();
    const pendingProposalCount = (state.budgetProposals || []).filter((item) => item.stage === "PENDING_CFO_REVIEW").length;
    const verificationBillCount = (state.procurementBills || []).filter((item) => item.status === "UNDER_VERIFICATION").length;
    const proposalExposure = (state.budgetProposals || []).reduce((total, item) => total + Number(item.amountCr || 0), 0);
    const approvedCount = (state.budgetProposals || []).filter((item) => item.stage === "APPROVED").length;

    elements.kpiGrid.innerHTML = [
      { label: "Pending proposals", value: pendingProposalCount, detail: "Awaiting finance review" },
      { label: "Bills in verification", value: verificationBillCount, detail: "Need billing validation" },
      { label: "Proposal exposure", value: formatInr(proposalExposure, "Cr"), detail: "Current funding pipeline", mono: true },
      { label: "Approved budgets", value: approvedCount, detail: "Ready for release governance" }
    ]
      .map((item) => {
        return `
          <article class="summary-item">
            <span>${escapeHtml(item.label)}</span>
            <strong class="${item.mono ? "mono" : ""}">${escapeHtml(item.value)}</strong>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `;
      })
      .join("");

    elements.budgetList.innerHTML = state.departments
      .map((department) => {
        return `
          <article class="stack-item">
            <div class="stack-head">
              <strong>${escapeHtml(department.name)}</strong>
              <span class="status-pill neutral">${escapeHtml(department.utilization)}% utilized</span>
            </div>
            <p>
              Lead: ${escapeHtml(department.lead)}
              <span class="mono"> / ${escapeHtml(formatInr(department.budgetCr, "Cr"))}</span>
            </p>
          </article>
        `;
      })
      .join("");

    elements.feedList.innerHTML = (state.activityFeed || [])
      .slice(0, 4)
      .map((item) => {
        return `
          <article class="stack-item">
            <div class="stack-head">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="status-pill neutral">${escapeHtml(item.meta)}</span>
            </div>
            <p>${escapeHtml(item.detail)}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderProposalTable() {
    const proposals = getState().budgetProposals || [];

    if (!proposals.length) {
      elements.proposalTableBody.innerHTML =
        '<tr><td colspan="5"><div class="empty-state">No proposals are currently in the finance queue.</div></td></tr>';
      return;
    }

    elements.proposalTableBody.innerHTML = proposals
      .map((proposal) => {
        const department = getDepartmentById(proposal.departmentId);
        return `
          <tr>
            <td><strong>${escapeHtml(proposal.title)}</strong></td>
            <td>${escapeHtml((department && department.name) || "Unknown department")}</td>
            <td><span class="mono">${escapeHtml(formatInr(proposal.amountCr, "Cr"))}</span></td>
            <td><span class="status-pill ${statusTone(proposal.stage)}">${escapeHtml(formatStatus(proposal.stage))}</span></td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-proposal-edit="${proposal.id}">Edit</button>
                <button class="text-button danger" type="button" data-proposal-delete="${proposal.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderBillTable() {
    const state = getState();
    const bills = state.procurementBills || [];

    if (!bills.length) {
      elements.billTableBody.innerHTML =
        '<tr><td colspan="6"><div class="empty-state">No procurement bills are currently in review.</div></td></tr>';
      return;
    }

    elements.billTableBody.innerHTML = bills
      .map((bill) => {
        const workOrder = (state.workOrders || []).find((item) => item.id === bill.workOrderId);
        return `
          <tr>
            <td><strong>${escapeHtml(bill.vendor)}</strong></td>
            <td>${escapeHtml((workOrder && workOrder.referenceNo) || "Unlinked")}</td>
            <td><span class="mono">${escapeHtml(formatInr(bill.amountLakhs, "L"))}</span></td>
            <td><span class="status-pill ${bill.gstValid ? "neutral" : "alert"}">${bill.gstValid ? "Verified" : "Missing"}</span></td>
            <td><span class="status-pill ${statusTone(bill.status)}">${escapeHtml(formatStatus(bill.status))}</span></td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-bill-edit="${bill.id}">Edit</button>
                <button class="text-button danger" type="button" data-bill-delete="${bill.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderAll(session) {
    renderHero(session);
    renderOverview();
    renderProposalTable();
    renderBillTable();
  }

  function resetProposalForm() {
    elements.proposalForm.reset();
    elements.proposalForm.elements.id.value = "";
    elements.proposalFormTitle.textContent = "Add proposal";
    showError(elements.proposalError, "");
  }

  function resetBillForm() {
    elements.billForm.reset();
    elements.billForm.elements.id.value = "";
    elements.billFormTitle.textContent = "Add bill";
    showError(elements.billError, "");
  }

  function bind(session) {
    elements.signOutButton.addEventListener("click", () => {
      clearSession();
      globalScope.location.href = "./auth.html?mode=official";
    });

    document.title = `InfraLynx | ${(getRoleByCode(session.role) || {}).name || "CFO"} Workspace`;

    populateSelects();
    renderAll(session);
    resetProposalForm();
    resetBillForm();

    elements.proposalResetButton.addEventListener("click", resetProposalForm);
    elements.billResetButton.addEventListener("click", resetBillForm);

    elements.proposalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.proposalForm).entries());

      if (!payload.departmentId || !payload.title.trim() || Number(payload.amountCr) <= 0 || !payload.stage || !payload.justification.trim()) {
        showError(elements.proposalError, "Complete the department, title, amount, stage, and justification.");
        return;
      }

      try {
        upsertBudgetProposal(payload);
        populateSelects();
        renderAll(session);
        resetProposalForm();
      } catch (error) {
        showError(elements.proposalError, error.message);
      }
    });

    elements.billForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.billForm).entries());

      if (!payload.departmentId || !payload.vendor.trim() || Number(payload.amountLakhs) <= 0 || !payload.status) {
        showError(elements.billError, "Complete the department, vendor, amount, and bill status.");
        return;
      }

      try {
        upsertProcurementBill(payload);
        populateSelects();
        renderAll(session);
        resetBillForm();
      } catch (error) {
        showError(elements.billError, error.message);
      }
    });

    elements.proposalTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-proposal-edit]");
      const deleteButton = event.target.closest("[data-proposal-delete]");

      if (editButton) {
        const proposal = (getState().budgetProposals || []).find((item) => item.id === editButton.dataset.proposalEdit);
        if (!proposal) {
          return;
        }

        Object.entries(proposal).forEach(([key, value]) => {
          if (elements.proposalForm.elements[key]) {
            elements.proposalForm.elements[key].value = value ?? "";
          }
        });
        elements.proposalFormTitle.textContent = `Edit ${proposal.title}`;
      }

      if (deleteButton) {
        try {
          deleteBudgetProposal(deleteButton.dataset.proposalDelete);
          populateSelects();
          renderAll(session);
          resetProposalForm();
        } catch (error) {
          showError(elements.proposalError, error.message);
        }
      }
    });

    elements.billTableBody.addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-bill-edit]");
      const deleteButton = event.target.closest("[data-bill-delete]");

      if (editButton) {
        const bill = (getState().procurementBills || []).find((item) => item.id === editButton.dataset.billEdit);
        if (!bill) {
          return;
        }

        Object.entries(bill).forEach(([key, value]) => {
          if (!elements.billForm.elements[key]) {
            return;
          }

          if (key === "gstValid") {
            elements.billForm.elements.gstValid.checked = Boolean(value);
            return;
          }

          elements.billForm.elements[key].value = value ?? "";
        });
        elements.billFormTitle.textContent = `Edit ${bill.vendor}`;
      }

      if (deleteButton) {
        try {
          deleteProcurementBill(deleteButton.dataset.billDelete);
          populateSelects();
          renderAll(session);
          resetBillForm();
        } catch (error) {
          showError(elements.billError, error.message);
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
    bind(session);
  }

  init();
})(window);
