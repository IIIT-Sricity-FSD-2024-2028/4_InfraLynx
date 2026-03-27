(function bootstrapLanding(globalScope) {
  const {
    REQUEST_STATUS_STEPS,
    findRequestByReference,
    formatDisplayDate,
    formatStatus,
    getDepartmentById,
    getLanguage,
    getSession,
    getState,
    initializeStore,
    submitCitizenRequest
  } = globalScope.CRIMS.store;
  const { applyTranslations, bindLanguageSelector, t } = globalScope.CRIMS.i18n;
  const { getRequestFormError } = globalScope.CRIMS.validators;

  const heroTrustData = [
    { value: "24/7", label: "reference tracking", detail: "Public lookup with a simple reference number" },
    { value: "5", label: "official roles", detail: "Schema-backed internal roles protected behind sign-in" },
    { value: "1", label: "citizen identity", detail: "One profile per Aadhaar number in this prototype" },
    { value: "Light", label: "default theme", detail: "Citizen-first interface with clear public information" }
  ];

  let currentAcknowledgement = null;
  let currentTrackedRequest = null;

  const elements = {
    languageSelect: document.querySelector("#language-select"),
    heroStats: document.querySelector("#public-stat-cards"),
    statsGrid: document.querySelector("#public-stats-grid"),
    impactGrid: document.querySelector("#impact-grid"),
    roleGrid: document.querySelector("#official-role-grid"),
    requestForm: document.querySelector("#request-form"),
    requestError: document.querySelector("#request-error"),
    requestTypeSelect: document.querySelector("#request-type-select"),
    categorySelect: document.querySelector("#category-select"),
    urgencySelect: document.querySelector("#urgency-select"),
    ackCard: document.querySelector("#request-ack-card"),
    ackReference: document.querySelector("#ack-reference"),
    ackStatus: document.querySelector("#ack-status"),
    ackNextStep: document.querySelector("#ack-next-step"),
    trackingForm: document.querySelector("#tracking-form"),
    trackingError: document.querySelector("#tracking-error"),
    trackingResult: document.querySelector("#tracking-result"),
    trackingReference: document.querySelector("#tracking-reference"),
    trackingTitle: document.querySelector("#tracking-title"),
    trackingDepartment: document.querySelector("#tracking-department"),
    trackingLocation: document.querySelector("#tracking-location"),
    trackingDate: document.querySelector("#tracking-date"),
    trackingStatusPill: document.querySelector("#tracking-status-pill"),
    trackingSteps: document.querySelector("#tracking-steps")
  };

  function renderHeroTrustGrid() {
    elements.heroStats.innerHTML = heroTrustData
      .map((item) => {
        return `
          <article class="trust-card">
            <span class="field-label">${item.label}</span>
            <strong>${item.value}</strong>
            <span>${item.detail}</span>
          </article>
        `;
      })
      .join("");
  }

  function renderStatsGrid() {
    const publicStats = getState().publicStats;
    elements.statsGrid.innerHTML = publicStats
      .map((item) => {
        return `
          <article class="glass-card stat-card">
            <span class="field-label">${item.label}</span>
            <strong>${item.value}</strong>
            <p>${item.detail}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderImpactGrid() {
    const impactStories = getState().impactStories;
    elements.impactGrid.innerHTML = impactStories
      .map((story) => {
        return `
          <article class="glass-card impact-card">
            <h3>${story.title}</h3>
            <p>${story.copy}</p>
          </article>
        `;
      })
      .join("");
  }

  function renderRoleGrid() {
    const officialRoles = getState().officialRoles;
    elements.roleGrid.innerHTML = officialRoles
      .map((role) => {
        return `
          <article class="glass-card role-card">
            <h3>${role.name}</h3>
            <p>${role.summary}</p>
            <span class="status-pill neutral">Invite-only access</span>
          </article>
        `;
      })
      .join("");
  }

  function renderLocalizedOptions() {
    const currentType = elements.requestTypeSelect.value;
    const currentUrgency = elements.urgencySelect.value;
    const currentCategory = elements.categorySelect.value;

    elements.requestTypeSelect.innerHTML = [
      `<option value="">${t("request.typeLabel")}</option>`,
      `<option value="Complaint">${t("request.typeComplaint")}</option>`,
      `<option value="Improvement">${t("request.typeImprovement")}</option>`
    ].join("");

    const serviceCategories = getState().serviceCategories;
    elements.categorySelect.innerHTML = [
      `<option value="">${t("request.categoryLabel")}</option>`,
      ...serviceCategories.map((category) => {
        return `<option value="${category.id}">${category.label}</option>`;
      })
    ].join("");

    elements.urgencySelect.innerHTML = [
      `<option value="">${t("request.urgencyLabel")}</option>`,
      `<option value="LOW">${t("request.urgencyLow")}</option>`,
      `<option value="MEDIUM">${t("request.urgencyMedium")}</option>`,
      `<option value="HIGH">${t("request.urgencyHigh")}</option>`,
      `<option value="EMERGENCY">${t("request.urgencyEmergency")}</option>`
    ].join("");

    elements.requestTypeSelect.value = currentType;
    elements.categorySelect.value = currentCategory;
    elements.urgencySelect.value = currentUrgency;
  }

  function renderAcknowledgement(requestRecord) {
    currentAcknowledgement = requestRecord;
    elements.ackReference.textContent = requestRecord.publicReferenceNo;
    elements.ackStatus.textContent = formatStatus(requestRecord.status);
    elements.ackNextStep.textContent = t("request.nextStepValue");
    elements.ackCard.classList.remove("hidden");
  }

  function statusTone(status) {
    switch (status) {
      case "UNDER_REVIEW":
        return "warning";
      case "REJECTED":
        return "alert";
      case "RECEIVED":
        return "neutral";
      default:
        return "";
    }
  }

  function renderTrackingSteps(status) {
    const steps = REQUEST_STATUS_STEPS.map((step) => {
      const className = step === status ? "status-step current" : "status-step";
      return `<span class="${className}">${formatStatus(step)}</span>`;
    }).join("");

    elements.trackingSteps.innerHTML = steps;
  }

  function renderTrackingResult(requestRecord) {
    currentTrackedRequest = requestRecord;
    const department = getDepartmentById(requestRecord.departmentId);
    const tone = statusTone(requestRecord.status);

    elements.trackingReference.textContent = requestRecord.publicReferenceNo;
    elements.trackingTitle.textContent = requestRecord.title;
    elements.trackingDepartment.textContent = (department && (department.publicLabel || department.name)) || "Assigned department";
    elements.trackingLocation.textContent = requestRecord.locationText;
    elements.trackingDate.textContent = formatDisplayDate(requestRecord.receivedAt);
    elements.trackingStatusPill.textContent = formatStatus(requestRecord.status);
    elements.trackingStatusPill.className = `status-pill ${tone}`.trim();
    renderTrackingSteps(requestRecord.status);

    elements.trackingResult.classList.remove("hidden");
  }

  function showRequestError(message) {
    if (!message) {
      elements.requestError.textContent = "";
      elements.requestError.classList.add("hidden");
      return;
    }

    elements.requestError.textContent = message;
    elements.requestError.classList.remove("hidden");
  }

  function showTrackingError(message) {
    if (!message) {
      elements.trackingError.textContent = "";
      elements.trackingError.classList.add("hidden");
      return;
    }

    elements.trackingError.textContent = message;
    elements.trackingError.classList.remove("hidden");
  }

  function prefillCitizenSession() {
    const session = getSession();
    if (!session || session.type !== "citizen") {
      return;
    }

    const citizen = getState().citizenUsers.find((user) => user.id === session.citizenId);
    if (!citizen) {
      return;
    }

    elements.requestForm.elements.name.value = citizen.name;
    elements.requestForm.elements.phone.value = citizen.phone;
    elements.requestForm.elements.email.value = citizen.email;
    elements.requestForm.elements.aadhaar.value = citizen.aadhaar;
  }

  function bindRequestForm() {
    elements.requestForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.requestForm).entries());
      const validationMessage = getRequestFormError(payload);

      showRequestError("");

      if (validationMessage) {
        showRequestError(validationMessage);
        return;
      }

      try {
        const requestRecord = submitCitizenRequest(payload);
        renderAcknowledgement(requestRecord);
        elements.requestForm.reset();
        renderLocalizedOptions();
        prefillCitizenSession();
        globalScope.location.hash = "submit-request";
      } catch (error) {
        showRequestError(error.message);
      }
    });
  }

  function bindTrackingForm() {
    elements.trackingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const reference = String(new FormData(elements.trackingForm).get("reference") || "").trim();

      showTrackingError("");

      if (!reference) {
        showTrackingError(t("request.lookupEmpty"));
        elements.trackingResult.classList.add("hidden");
        return;
      }

      const requestRecord = findRequestByReference(reference);
      if (!requestRecord) {
        showTrackingError(t("request.lookupMissing"));
        elements.trackingResult.classList.add("hidden");
        return;
      }

      renderTrackingResult(requestRecord);
    });
  }

  function rerenderDynamicContent() {
    renderLocalizedOptions();

    if (currentAcknowledgement) {
      renderAcknowledgement(currentAcknowledgement);
    }

    if (currentTrackedRequest) {
      renderTrackingResult(currentTrackedRequest);
    }
  }

  function init() {
    initializeStore();
    bindLanguageSelector(elements.languageSelect);
    applyTranslations(document, getLanguage());
    renderHeroTrustGrid();
    renderStatsGrid();
    renderImpactGrid();
    renderRoleGrid();
    renderLocalizedOptions();
    prefillCitizenSession();
    bindRequestForm();
    bindTrackingForm();

    document.addEventListener("crims:language-change", () => {
      rerenderDynamicContent();
    });
  }

  init();
})(window);
