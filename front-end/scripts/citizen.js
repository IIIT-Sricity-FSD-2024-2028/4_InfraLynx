(function bootstrapCitizenWorkspace(globalScope) {
    const {
      clearSession,
      formatDisplayDate,
      formatStatus,
      getCategoryById,
      getDepartmentById,
      getLanguage,
      getSession,
      getState,
      initializeStore,
      submitCitizenRequest
    } = globalScope.CRIMS.store;
    const { bindLanguageSelector, applyTranslations, localizeCategory, localizeDepartmentPublicLabel, localizeStatus, t } =
      globalScope.CRIMS.i18n;
    const { getRequestFormError } = globalScope.CRIMS.validators;
  
    const elements = {
      main: document.querySelector(".citizen-main"),
      languageSelect: document.querySelector("#citizen-language-select"),
      signOutButton: document.querySelector("#citizen-sign-out"),
      citizenName: document.querySelector("#citizen-name"),
      citizenSessionMeta: document.querySelector("#citizen-session-meta"),
      summaryGrid: document.querySelector("#citizen-summary-grid"),
      requestForm: document.querySelector("#citizen-request-form"),
      requestTypeSelect: document.querySelector("#citizen-request-type"),
      requestCategorySelect: document.querySelector("#citizen-request-category"),
      requestUrgencySelect: document.querySelector("#citizen-request-urgency"),
      requestError: document.querySelector("#citizen-request-error"),
      requestAck: document.querySelector("#citizen-request-ack"),
      ackReference: document.querySelector("#citizen-ack-reference"),
      ackStatus: document.querySelector("#citizen-ack-status"),
      ackNextStep: document.querySelector("#citizen-ack-next-step"),
      requestList: document.querySelector("#citizen-request-list")
    };

    function renderStaticText() {
      const languageLabel = document.querySelector('label[for="citizen-language-select"] span');
      if (languageLabel) languageLabel.textContent = t("common.language");
      const navLinks = document.querySelectorAll(".citizen-page .nav-links a");
      if (navLinks[0]) navLinks[0].textContent = t("citizen.navSubmit");
      if (navLinks[1]) navLinks[1].textContent = t("citizen.navHistory");
      const publicPortalLink = document.querySelector('.header-actions a.button-secondary');
      if (publicPortalLink) publicPortalLink.textContent = t("citizen.publicPortal");
      if (elements.signOutButton) elements.signOutButton.textContent = t("citizen.signOut");
      const brandSubtitle = document.querySelector(".brand-subtitle");
      if (brandSubtitle) brandSubtitle.textContent = t("citizen.brandSubtitle");
      const heroKicker = document.querySelector(".hero-copy-card .section-kicker");
      if (heroKicker) heroKicker.textContent = t("citizen.heroKicker");
      const heroTitle = document.querySelector("#citizen-hero-title");
      if (heroTitle) heroTitle.textContent = t("citizen.heroTitle");
      const heroCopy = document.querySelector("#citizen-hero-copy");
      if (heroCopy) heroCopy.textContent = t("citizen.heroCopy");
      const heroButtons = document.querySelectorAll(".hero-copy-card .hero-actions a");
      if (heroButtons[0]) heroButtons[0].textContent = t("citizen.heroPrimary");
      if (heroButtons[1]) heroButtons[1].textContent = t("citizen.heroSecondary");
      const identityLabel = document.querySelector(".citizen-summary-card .field-label");
      if (identityLabel) identityLabel.textContent = t("citizen.identityLabel");
      const formKicker = document.querySelector("#submit-request .section-kicker");
      if (formKicker) formKicker.textContent = t("citizen.formKicker");
      const formHeading = document.querySelector("#submit-request h2");
      if (formHeading) formHeading.textContent = t("citizen.formHeading");
      const formHelp = document.querySelector(".field-help");
      if (formHelp) formHelp.textContent = t("citizen.formIdentityHelp");
      const ackReferenceLabel = document.querySelector("#citizen-request-ack .ack-item span");
      if (ackReferenceLabel) ackReferenceLabel.textContent = t("citizen.ackReference");
      const historyKicker = document.querySelector("#request-history .section-kicker");
      if (historyKicker) historyKicker.textContent = t("citizen.historyKicker");
      const historyHeading = document.querySelector("#request-history h2");
      if (historyHeading) historyHeading.textContent = t("citizen.historyHeading");
      const historyIntro = document.querySelector("#request-history p");
      if (historyIntro) historyIntro.textContent = t("citizen.historyIntro");
    }
  
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
  
    function getAuthorizedCitizen() {
      const session = getSession();
      if (!session || session.type !== "citizen") {
        return null;
      }
  
      const state = getState();
      const citizen = state.citizenUsers.find((item) => item.id === session.citizenId) || null;
      if (!citizen) {
        return null;
      }
  
      return citizen;
    }
  
    function renderAccessGuard() {
      elements.main.innerHTML = `
        <section class="section">
          <article class="glass-card access-guard">
            <div class="section-kicker">${t("citizen.guardKicker")}</div>
            <h2>${t("citizen.guardTitle")}</h2>
            <p>${t("citizen.guardCopy")}</p>
            <div class="auth-actions">
              <a class="button button-primary" href="./auth.html?mode=citizen">${t("citizen.guardPrimary")}</a>
              <a class="button button-secondary" href="./index.html">${t("citizen.guardSecondary")}</a>
            </div>
          </article>
        </section>
      `;
    }
  
    function getCitizenRequestsSorted(citizen) {
      return getState()
        .requests
        .filter((request) => request.citizenAadhaar === citizen.aadhaar)
        .sort((left, right) => new Date(right.receivedAt) - new Date(left.receivedAt));
    }
  
    function getLinkedWorkOrders(requestId) {
      return getState().workOrders.filter((order) => order.requestId === requestId);
    }
  
    function getStatusPillClass(status) {
      if (status === "RECEIVED" || status === "UNDER_REVIEW" || status === "PENDING_OFFICER_APPROVAL") {
        return "warning";
      }
  
      if (status === "REJECTED") {
        return "alert";
      }
  
      if (status === "CLOSED" || status === "COMPLETED") {
        return "neutral";
      }
  
      return "";
    }
  
    function getNextCitizenStep(status) {
      if (status === "RECEIVED") {
        return t("citizen.nextStepReceived");
      }
  
      if (status === "UNDER_REVIEW") {
        return t("citizen.nextStepUnderReview");
      }
  
      if (status === "APPROVED_FOR_PLANNING") {
        return t("citizen.nextStepApprovedForPlanning");
      }
  
      if (status === "CONVERTED_TO_WORK_ORDER") {
        return t("citizen.nextStepConvertedToWorkOrder");
      }
  
      if (status === "CLOSED") {
        return t("citizen.nextStepClosed");
      }
  
      if (status === "REJECTED") {
        return t("citizen.nextStepRejected");
      }
  
      return t("citizen.nextStepDefault");
    }
  
    function populateCitizenIdentity(citizen) {
      elements.requestForm.elements.name.value = citizen.name;
      elements.requestForm.elements.phone.value = citizen.phone;
      elements.requestForm.elements.email.value = citizen.email;
      elements.requestForm.elements.aadhaar.value = citizen.aadhaar;
    }
  
    function populateRequestOptions() {
      const state = getState();
      const language = getLanguage();
  
      elements.requestTypeSelect.innerHTML = `
        <option value="">${escapeHtml(t("request.typeLabel", language))}</option>
        <option value="Complaint">${escapeHtml(t("request.typeComplaint", language))}</option>
        <option value="Improvement">${escapeHtml(t("request.typeImprovement", language))}</option>
      `;
  
      elements.requestCategorySelect.innerHTML = `
        <option value="">${escapeHtml(t("request.categoryLabel", language))}</option>
        ${state.serviceCategories
          .map((category) => `<option value="${escapeHtml(category.id)}">${escapeHtml(localizeCategory(category, language))}</option>`)
          .join("")}
      `;
  
      elements.requestUrgencySelect.innerHTML = `
        <option value="">${escapeHtml(t("request.urgencyLabel", language))}</option>
        <option value="LOW">${escapeHtml(t("request.urgencyLow", language))}</option>
        <option value="MEDIUM">${escapeHtml(t("request.urgencyMedium", language))}</option>
        <option value="HIGH">${escapeHtml(t("request.urgencyHigh", language))}</option>
        <option value="EMERGENCY">${escapeHtml(t("request.urgencyEmergency", language))}</option>
      `;
    }
  
    function renderSummary(citizen) {
      const requests = getCitizenRequestsSorted(citizen);
      const planningReady = requests.filter((request) => request.status === "APPROVED_FOR_PLANNING").length;
      const converted = requests.filter((request) => request.status === "CONVERTED_TO_WORK_ORDER").length;
      const active = requests.filter((request) => request.status !== "CLOSED" && request.status !== "REJECTED").length;
  
      elements.citizenName.textContent = citizen.name;
      elements.citizenSessionMeta.textContent = t("citizen.sessionMeta").replace("{last4}", citizen.aadhaar.slice(-4));
      elements.summaryGrid.innerHTML = `
        <article class="summary-stat">
          <span>${t("citizen.summaryRaised")}</span>
          <strong>${requests.length}</strong>
          <p>${t("citizen.summaryRaisedCopy")}</p>
        </article>
        <article class="summary-stat">
          <span>${t("citizen.summaryActive")}</span>
          <strong>${active}</strong>
          <p>${t("citizen.summaryActiveCopy")}</p>
        </article>
        <article class="summary-stat">
          <span>${t("citizen.summaryPlanning")}</span>
          <strong>${planningReady + converted}</strong>
          <p>${t("citizen.summaryPlanningCopy")}</p>
        </article>
      `;
    }
  
    function renderRequestHistory(citizen) {
      const requests = getCitizenRequestsSorted(citizen);
  
      if (!requests.length) {
        elements.requestList.innerHTML = `
          <article class="glass-card empty-state">
            ${t("citizen.emptyRequests")}
          </article>
        `;
        return;
      }
  
      elements.requestList.innerHTML = requests
        .map((request) => {
          const department = getDepartmentById(request.departmentId);
          const category = getCategoryById(request.categoryId);
          const linkedWorkOrders = getLinkedWorkOrders(request.requestId);
          const latestWorkOrder = linkedWorkOrders[0] || null;
          const statusClass = getStatusPillClass(request.status);
  
          return `
            <article class="glass-card request-card">
              <div class="request-card-head">
                <div>
                  <span class="field-label">${escapeHtml(t(request.requestType === "Complaint" ? "request.typeComplaint" : "request.typeImprovement"))}</span>
                  <h3>${escapeHtml(request.title)}</h3>
                  <p class="mono">${escapeHtml(request.publicReferenceNo)}</p>
                </div>
                <span class="status-pill ${statusClass}">${escapeHtml(localizeStatus(request.status))}</span>
              </div>
  
              <div class="request-card-body">
                <p>${escapeHtml(request.description)}</p>
  
                <div class="request-meta-grid">
                  <article class="meta-chip">
                    <span>${t("citizen.metaDepartment")}</span>
                    <strong>${escapeHtml((department && localizeDepartmentPublicLabel(department)) || t("citizen.pendingRouting"))}</strong>
                  </article>
                  <article class="meta-chip">
                    <span>${t("citizen.metaServiceArea")}</span>
                    <strong>${escapeHtml((category && localizeCategory(category)) || t("citizen.notSet"))}</strong>
                  </article>
                  <article class="meta-chip">
                    <span>${t("citizen.metaLocation")}</span>
                    <strong>${escapeHtml(request.locationText)}</strong>
                  </article>
                  <article class="meta-chip">
                    <span>${t("citizen.metaSubmitted")}</span>
                    <strong>${escapeHtml(formatDisplayDate(request.receivedAt))}</strong>
                  </article>
                </div>
  
                ${
                  latestWorkOrder
                    ? `
                      <article class="linked-order">
                        <div class="linked-order-head">
                          <div>
                            <span>${t("citizen.linkedWorkOrder")}</span>
                            <strong>${escapeHtml(latestWorkOrder.referenceNo)} / ${escapeHtml(latestWorkOrder.title)}</strong>
                          </div>
                          <span class="status-pill ${getStatusPillClass(latestWorkOrder.status)}">${escapeHtml(
                            localizeStatus(latestWorkOrder.status)
                          )}</span>
                        </div>
                        <p>${escapeHtml(latestWorkOrder.notes || t("citizen.linkedWorkOrderFallback"))}</p>
                      </article>
                    `
                    : ""
                }
              </div>
  
              <div class="request-card-footer">
                <span class="field-label">${t("request.nextStep")}</span>
                <strong>${escapeHtml(getNextCitizenStep(request.status))}</strong>
              </div>
            </article>
          `;
        })
        .join("");
    }
  
    function bindRequestForm(citizen) {
      elements.requestForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const payload = Object.fromEntries(new FormData(elements.requestForm).entries());
        const validationMessage = getRequestFormError(payload);
  
        showError(elements.requestError, "");
  
        if (validationMessage) {
          showError(elements.requestError, validationMessage);
          return;
        }
  
        try {
          const record = submitCitizenRequest(payload);
          elements.ackReference.textContent = record.publicReferenceNo;
          elements.ackStatus.textContent = localizeStatus(record.status);
          elements.ackNextStep.textContent = getNextCitizenStep(record.status);
          elements.requestAck.classList.remove("hidden");
          elements.requestForm.reset();
          populateCitizenIdentity(citizen);
          populateRequestOptions();
          renderSummary(citizen);
          renderRequestHistory(citizen);
        } catch (error) {
          showError(elements.requestError, error.message);
        }
      });
    }
  
    function bindSignOut() {
      elements.signOutButton.addEventListener("click", () => {
        clearSession();
        globalScope.location.href = "./auth.html?mode=citizen";
      });
    }
  
    function init() {
      initializeStore();
      bindLanguageSelector(elements.languageSelect);
      applyTranslations(document, getLanguage());
      renderStaticText();
  
      const citizen = getAuthorizedCitizen();
      if (!citizen) {
        renderAccessGuard();
        return;
      }
  
      populateRequestOptions();
      populateCitizenIdentity(citizen);
      renderSummary(citizen);
      renderRequestHistory(citizen);
      bindRequestForm(citizen);
      bindSignOut();
  
      document.addEventListener("crims:language-change", () => {
        renderStaticText();
        populateRequestOptions();
        populateCitizenIdentity(citizen);
        renderSummary(citizen);
        renderRequestHistory(citizen);
      });
    }
  
    init();
  })(window);
  
