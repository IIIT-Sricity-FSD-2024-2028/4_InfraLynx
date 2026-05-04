(function bootstrapQc(globalScope) {
  const {
    clearSession,
    deleteQcReview,
    formatStatus,
    getRoleByCode,
    getSession,
    getState,
    initializeStore,
    upsertQcReview
  } = globalScope.CRIMS.store;
  const { bindLanguageSelector } = globalScope.CRIMS.i18n;

  const QC_STATUSES = ["UNDER_REVIEW", "APPROVED", "REJECTED"];

  const elements = {
    languageSelect: document.querySelector("#qc-language-select"),
    signOutButton: document.querySelector("#qc-sign-out"),
    greeting: document.querySelector("#qc-greeting"),
    focusCard: document.querySelector("#qc-focus-card"),
    watchCard: document.querySelector("#qc-watch-card"),
    kpiGrid: document.querySelector("#qc-kpis"),
    workList: document.querySelector("#qc-work-list"),
    feedList: document.querySelector("#qc-feed-list"),
    tableBody: document.querySelector("#qc-table-body"),
    form: document.querySelector("#qc-form"),
    formTitle: document.querySelector("#qc-form-title"),
    resetButton: document.querySelector("#qc-reset"),
    error: document.querySelector("#qc-error"),
    departmentSelect: document.querySelector("#qc-department-select"),
    workOrderSelect: document.querySelector("#qc-work-order-select"),
    statusSelect: document.querySelector("#qc-status-select")
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

  function getAuthorizedSession() {
    const session = getSession();
    return session && session.type === "official" && session.role === "QC_REVIEWER" ? session : null;
  }

  function renderAccessGuard() {
    document.querySelector(".qc-main").innerHTML = `
      <section class="section">
        <article class="glass-card access-guard">
          <div class="section-kicker">Restricted workspace</div>
          <h2>QC Reviewer access is required</h2>
          <p>Sign in through the official portal with a QC Reviewer account to continue.</p>
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

    if (status === "UNDER_REVIEW" || status === "PENDING_QC" || status === "IN_PROGRESS") {
      return "warning";
    }

    return "neutral";
  }

  async function populateSelects() {
    const state = await getState();
    const currentDepartment = elements.departmentSelect.value;
    const currentWorkOrder = elements.workOrderSelect.value;
    const currentStatus = elements.statusSelect.value;
    const qcEligibleOrders = (state.workOrders || []).filter((workOrder) => {
      return workOrder.status === "PENDING_QC" || workOrder.status === "COMPLETED" || workOrder.status === "IN_PROGRESS";
    });

    elements.departmentSelect.innerHTML = [
      '<option value="">Select department</option>',
      ...state.departments.map((department) => `<option value="${department.id}">${escapeHtml(department.name)}</option>`)
    ].join("");

    elements.workOrderSelect.innerHTML = [
      '<option value="">No linked work order</option>',
      ...qcEligibleOrders.map((workOrder) => {
        return `<option value="${workOrder.id}">${escapeHtml(workOrder.referenceNo)} - ${escapeHtml(workOrder.title)}</option>`;
      })
    ].join("");

    elements.statusSelect.innerHTML = [
      '<option value="">Select status</option>',
      ...QC_STATUSES.map((status) => `<option value="${status}">${formatStatus(status)}</option>`)
    ].join("");

    elements.departmentSelect.value = currentDepartment;
    elements.workOrderSelect.value = currentWorkOrder;
    elements.statusSelect.value = currentStatus;
  }

  async function renderHero(session) {
    const state = await getState();
    const pendingReview = (state.qcReviews || []).find((item) => item.status === "UNDER_REVIEW") || (state.qcReviews || [])[0];
    const closureTarget =
      (state.workOrders || []).find((item) => item.status === "PENDING_QC" || item.status === "COMPLETED") ||
      (state.workOrders || [])[0];

    elements.greeting.textContent = `Quality control for ${session.name}`;

    elements.focusCard.innerHTML = pendingReview
      ? `
        <span class="field-label">Quality focus</span>
        <h3>${escapeHtml(pendingReview.title)} needs certification</h3>
        <p>
          Current status is <span class="mono">${escapeHtml(formatStatus(pendingReview.status))}</span>
          with a score of <span class="mono">${escapeHtml(String(pendingReview.score))}</span>.
          Final QC disposition should now be recorded.
        </p>
      `
      : `
        <span class="field-label">Quality focus</span>
        <h3>No active QC review needs attention</h3>
        <p>The quality queue is currently clear of in-progress certification items.</p>
      `;

    elements.watchCard.innerHTML = closureTarget
      ? `
        <span class="field-label">Closure watch</span>
        <h3>${escapeHtml(closureTarget.referenceNo)} is nearing closure</h3>
        <p>
          ${escapeHtml(closureTarget.title)} at ${escapeHtml(closureTarget.locationText)}
          is currently <span class="mono">${escapeHtml(formatStatus(closureTarget.status))}</span>.
        </p>
      `
      : `
        <span class="field-label">Closure watch</span>
        <h3>No work order is approaching QC today</h3>
        <p>The current execution queue does not show an immediate closure review need.</p>
      `;
  }

  async function renderOverview() {
    const state = await getState();
    const qcReviews = state.qcReviews || [];
    const workOrders = state.workOrders || [];
    const averageScore = qcReviews.length
      ? Math.round(qcReviews.reduce((total, review) => total + Number(review.score || 0), 0) / qcReviews.length)
      : 0;

    elements.kpiGrid.innerHTML = [
      { label: "Open QC queue", value: qcReviews.filter((item) => item.status === "UNDER_REVIEW").length, detail: "Reviews awaiting certification" },
      { label: "Approved", value: qcReviews.filter((item) => item.status === "APPROVED").length, detail: "Certified for closure" },
      { label: "Rejected", value: qcReviews.filter((item) => item.status === "REJECTED").length, detail: "Returned for rework" },
      { label: "Average score", value: averageScore, detail: "Current quality rating", mono: true }
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

    const closureWorkOrders = workOrders.filter((item) => {
      return item.status === "COMPLETED" || item.status === "PENDING_QC";
    });

    elements.workList.innerHTML = closureWorkOrders.length
      ? closureWorkOrders
          .slice(0, 4)
          .map((workOrder) => {
            return `
              <article class="stack-item">
                <div class="stack-head">
                  <strong class="mono">${escapeHtml(workOrder.referenceNo)}</strong>
                  <span class="status-pill ${statusTone(workOrder.status)}">${escapeHtml(formatStatus(workOrder.status))}</span>
                </div>
                <p>${escapeHtml(workOrder.title)} / ${escapeHtml(workOrder.locationText)}</p>
              </article>
            `;
          })
          .join("")
      : '<div class="empty-state">No work orders are approaching QC right now.</div>';

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

  async function renderReviewTable() {
    const reviews = (await getState()).qcReviews || [];

    if (!reviews.length) {
      elements.tableBody.innerHTML =
        '<tr><td colspan="5"><div class="empty-state">No QC reviews are currently recorded.</div></td></tr>';
      return;
    }

    const state = await getState();
    elements.tableBody.innerHTML = reviews
      .map((review) => {
        const workOrder = (state.workOrders || []).find((item) => item.id === review.workOrderId);
        return `
          <tr>
            <td><strong>${escapeHtml(review.title)}</strong></td>
            <td>${escapeHtml((workOrder && workOrder.referenceNo) || "Unlinked")}</td>
            <td><span class="status-pill ${statusTone(review.status)}">${escapeHtml(formatStatus(review.status))}</span></td>
            <td><span class="mono">${escapeHtml(String(review.score))}</span></td>
            <td>
              <div class="row-actions">
                <button class="text-button" type="button" data-review-edit="${review.id}">Edit</button>
                <button class="text-button danger" type="button" data-review-delete="${review.id}">Delete</button>
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
    await renderReviewTable();
  }

  function resetForm(session) {
    elements.form.reset();
    elements.form.elements.id.value = "";
    elements.form.elements.reviewer.value = session.officialId;
    elements.formTitle.textContent = "Add QC review";
    showError(elements.error, "");
  }

  async function bind(session) {
    elements.signOutButton.addEventListener("click", () => {
      clearSession();
      globalScope.location.href = "./auth.html?mode=official";
    });

    const role = await getRoleByCode(session.role);
    document.title = `InfraLynx | ${(role || {}).name || "QC Reviewer"} Workspace`;

    await populateSelects();
    await renderAll(session);
    resetForm(session);

    elements.resetButton.addEventListener("click", () => resetForm(session));

    elements.form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.form).entries());

      if (!payload.departmentId || !payload.title.trim() || !payload.workOrderId || !payload.status || !payload.finding.trim()) {
        showError(elements.error, "Complete the department, work order, title, status, and finding.");
        return;
      }

      if (Number(payload.score) < 0 || Number(payload.score) > 100) {
        showError(elements.error, "Enter a score between 0 and 100.");
        return;
      }

      try {
        await upsertQcReview(payload);
        await populateSelects();
        await renderAll(session);
        resetForm(session);
      } catch (error) {
        showError(elements.error, error.message);
      }
    });

    elements.tableBody.addEventListener("click", async (event) => {
      const editButton = event.target.closest("[data-review-edit]");
      const deleteButton = event.target.closest("[data-review-delete]");

      if (editButton) {
        const state = await getState();
        const review = (state.qcReviews || []).find((item) => item.id === editButton.dataset.reviewEdit);
        if (!review) {
          return;
        }

        Object.entries(review).forEach(([key, value]) => {
          if (elements.form.elements[key]) {
            elements.form.elements[key].value = value ?? "";
          }
        });
        elements.formTitle.textContent = `Edit ${review.title}`;
      }

      if (deleteButton) {
        try {
          await deleteQcReview(deleteButton.dataset.reviewDelete);
          await populateSelects();
          await renderAll(session);
          resetForm(session);
        } catch (error) {
          showError(elements.error, error.message);
        }
      }
    });
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
  }

  init();
})(window);

