(function bootstrapCfo(globalScope) {
  const {
    clearSession,
    deleteBudgetProposal,
    deleteProcurementBill,
    deleteFundRelease,
    formatStatus,
    getDepartmentById,
    getRoleByCode,
    getSession,
    getState,
    initializeStore,
    upsertBudgetProposal,
    upsertProcurementBill,
    upsertFundRelease
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
    billStatusSelect: document.querySelector("#bill-status-select"),
    releaseTableBody: document.querySelector("#release-table-body"),
    releaseForm: document.querySelector("#release-form"),
    releaseFormTitle: document.querySelector("#release-form-title"),
    releaseResetButton: document.querySelector("#release-reset"),
    releaseError: document.querySelector("#release-error"),
    releaseDepartmentSelect: document.querySelector("#release-department-select")
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

  async function populateSelects() {
    const state = await getState();
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

    if (elements.releaseDepartmentSelect) {
      const curReleaseDept = elements.releaseDepartmentSelect.value;
      elements.releaseDepartmentSelect.innerHTML = [
        '<option value="">Select department</option>',
        ...state.departments.map((d) => `<option value="${d.id}">${escapeHtml(d.name)}</option>`)
      ].join("");
      elements.releaseDepartmentSelect.value = curReleaseDept;
    }
  }

  async function renderHero(session) {
    const state = await getState();
    const pendingProposal =
      (state.budgetProposals || []).find((item) => item.stage === "PENDING_CFO_REVIEW") || (state.budgetProposals || [])[0];
    const gstRiskBill =
      (state.procurementBills || []).find((item) => !item.gstValid || item.status === "UNDER_VERIFICATION") ||
      (state.procurementBills || [])[0];

    elements.greeting.textContent = `Financial control for ${session.name}`;

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

  async function renderOverview() {
    const state = await getState();
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

  async function renderProposalTable() {
    const proposals = (await getState()).budgetProposals || [];

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

  async function renderBillTable() {
    const state = await getState();
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

  async function renderAll(session) {
    await renderHero(session);
    await renderOverview();
    await renderProposalTable();
    await renderBillTable();
    await renderReleaseTable();
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

  async function renderReleaseTable() {
    if (!elements.releaseTableBody) return;
    const releases = (await getState()).fundReleases || [];
    if (!releases.length) {
      elements.releaseTableBody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No fund releases are recorded yet.</div></td></tr>';
      return;
    }
    elements.releaseTableBody.innerHTML = releases.map((item) => {
      const dept = getDepartmentById(item.departmentId);
      return `
        <tr>
          <td><strong>${escapeHtml(item.title)}</strong></td>
          <td>${escapeHtml((dept && dept.name) || 'Unknown')}</td>
          <td class="mono">INR ${escapeHtml(Number(item.amountCr).toFixed(2))} Cr</td>
          <td>${escapeHtml(item.quarter || 'â€”')}</td>
          <td><span class="status-pill ${item.status === 'RELEASED' ? '' : item.status === 'WITHHELD' ? 'alert' : 'warning'}">${escapeHtml(formatStatus(item.status))}</span></td>
          <td><div class="row-actions">
            <button class="text-button" type="button" data-release-edit="${item.id}">Edit</button>
            <button class="text-button danger" type="button" data-release-delete="${item.id}">Delete</button>
          </div></td>
        </tr>`;
    }).join("");
  }

  function resetReleaseForm() {
    if (!elements.releaseForm) return;
    elements.releaseForm.reset();
    elements.releaseForm.elements.id.value = "";
    elements.releaseFormTitle.textContent = "Add fund release";
    showError(elements.releaseError, "");
  }

  async function bind(session) {
    elements.signOutButton.addEventListener("click", () => {
      clearSession();
      globalScope.location.href = "./auth.html?mode=official";
    });

    document.title = `InfraLynx | ${(getRoleByCode(session.role) || {}).name || "CFO"} Workspace`;

    await populateSelects();
    await renderAll(session);
    resetProposalForm();
    resetBillForm();

    elements.proposalResetButton.addEventListener("click", resetProposalForm);
    elements.billResetButton.addEventListener("click", resetBillForm);

    elements.proposalForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.proposalForm).entries());

      if (!payload.departmentId || !payload.title.trim() || Number(payload.amountCr) <= 0 || !payload.stage || !payload.justification.trim()) {
        showError(elements.proposalError, "Complete the department, title, amount, stage, and justification.");
        return;
      }

      try {
        await upsertBudgetProposal(payload);
        await populateSelects();
        await renderAll(session);
        resetProposalForm();
      } catch (error) {
        showError(elements.proposalError, error.message);
      }
    });

    elements.billForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.billForm).entries());

      if (!payload.departmentId || !payload.vendor.trim() || Number(payload.amountLakhs) <= 0 || !payload.status) {
        showError(elements.billError, "Complete the department, vendor, amount, and bill status.");
        return;
      }

      try {
        await upsertProcurementBill(payload);
        await populateSelects();
        await renderAll(session);
        resetBillForm();
      } catch (error) {
        showError(elements.billError, error.message);
      }
    });

    elements.proposalTableBody.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-proposal-edit]");
      const deleteButton = event.target.closest("[data-proposal-delete]");

      if (editButton) {
        const proposal = ((await getState()).budgetProposals || []).find((item) => item.id === editButton.dataset.proposalEdit);
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
          await deleteBudgetProposal(deleteButton.dataset.proposalDelete);
          await populateSelects();
          await renderAll(session);
          resetProposalForm();
        } catch (error) {
          showError(elements.proposalError, error.message);
        }
      }
    });

    elements.billTableBody.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-bill-edit]");
      const deleteButton = event.target.closest("[data-bill-delete]");

      if (editButton) {
        const bill = ((await getState()).procurementBills || []).find((item) => item.id === editButton.dataset.billEdit);
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
          await deleteProcurementBill(deleteButton.dataset.billDelete);
          await populateSelects();
          await renderAll(session);
          resetBillForm();
        } catch (error) {
          showError(elements.billError, error.message);
        }
      }
    });

    /* â”€â”€ Fund Releases â”€â”€ */
    if (elements.releaseForm) {
      elements.releaseResetButton.addEventListener("click", resetReleaseForm);
      elements.releaseForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(elements.releaseForm).entries());
        if (!payload.departmentId) { showError(elements.releaseError, "Select the target department."); return; }
        if (!payload.title.trim() || payload.title.trim().length < 6) { showError(elements.releaseError, "Enter a descriptive release title."); return; }
        if (Number(payload.amountCr) <= 0) { showError(elements.releaseError, "Enter a valid release amount greater than zero."); return; }
        if (!payload.status) { showError(elements.releaseError, "Select the release status."); return; }
        try {
          await upsertFundRelease(payload);
          await populateSelects();
          await renderAll(session);
          resetReleaseForm();
        } catch (error) {
          showError(elements.releaseError, error.message);
        }
      });

      elements.releaseTableBody.addEventListener("click", async (event) => {
        const editButton = event.target.closest("[data-release-edit]");
        const deleteButton = event.target.closest("[data-release-delete]");
        if (editButton) {
          const release = ((await getState()).fundReleases || []).find((item) => item.id === editButton.dataset.releaseEdit);
          if (!release) return;
          Object.entries(release).forEach(([key, value]) => {
            if (elements.releaseForm.elements[key]) elements.releaseForm.elements[key].value = value == null ? "" : value;
          });
          elements.releaseFormTitle.textContent = `Edit: ${release.title}`;
        }
        if (deleteButton) {
          try {
            await deleteFundRelease(deleteButton.dataset.releaseDelete);
            await populateSelects();
            await renderAll(session);
            resetReleaseForm();
          } catch (error) {
            showError(elements.releaseError, error.message);
          }
        }
      });
    }
  }

  async function init() {
    await initializeStore();
    const session = getAuthorizedSession();

    if (!session) {
      renderAccessGuard();
      return;
    }

    bindLanguageSelector(elements.languageSelect);
    await bind(session);
    resetReleaseForm();
  }

  init();
})(window);


