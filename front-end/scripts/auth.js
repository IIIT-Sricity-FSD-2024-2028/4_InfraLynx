(function bootstrapAuth(globalScope) {
  const {
    authenticateCitizen,
    authenticateOfficial,
    getCitizenRequests,
    getLanguage,
    getRoleByCode,
    getState,
    initializeStore,
    registerCitizenAccount
  } = globalScope.CRIMS.store;
  const { applyTranslations, bindLanguageSelector, t } = globalScope.CRIMS.i18n;
  const {
    getCitizenSignInError,
    getCitizenSignUpError,
    getOfficialSignInError
  } = globalScope.CRIMS.validators;

  const elements = {
    languageSelect: document.querySelector("#auth-language-select"),
    citizenTab: document.querySelector("#citizen-tab"),
    officialTab: document.querySelector("#official-tab"),
    citizenPanel: document.querySelector("#citizen-panel"),
    officialPanel: document.querySelector("#official-panel"),
    citizenTitle: document.querySelector("#citizen-panel h2"),
    citizenSigninTab: document.querySelector("#citizen-signin-tab"),
    citizenSignupTab: document.querySelector("#citizen-signup-tab"),
    citizenSigninForm: document.querySelector("#citizen-signin-form"),
    citizenSignupForm: document.querySelector("#citizen-signup-form"),
    citizenSigninError: document.querySelector("#citizen-signin-error"),
    citizenSignupError: document.querySelector("#citizen-signup-error"),
    citizenResultPanel: document.querySelector("#citizen-result-panel"),
    citizenResultMeta: document.querySelector("#citizen-result-meta"),
    officialForm: document.querySelector("#official-form"),
    officialError: document.querySelector("#official-error"),
    officialResultPanel: document.querySelector("#official-result-panel"),
    officialResultMeta: document.querySelector("#official-result-meta")
  };

  const ROLE_WORKSPACE_MAP = {
    ADMINISTRATOR: "./admin.html",
    OFFICER: "./officer.html",
    ENGINEER: "./engineer.html",
    CFO: "./cfo.html",
    QC_REVIEWER: "./qcreviewer.html"
  };

  const ROLE_WORKSPACE_LABELS = {
    ADMINISTRATOR: "City Administrator console",
    OFFICER: "Department Officer workspace",
    ENGINEER: "Field Engineer workspace",
    CFO: "CFO workspace",
    QC_REVIEWER: "QC Reviewer workspace"
  };
  const CITIZEN_WORKSPACE = "./citizen.html";

  let citizenMode = "signin";
  let accessMode = "citizen";

  function renderStaticText() {
    const languageLabel = document.querySelector('label[for="auth-language-select"] span');
    if (languageLabel) {
      languageLabel.textContent = t("common.language");
    }

    const officialRedirectCopy = document.querySelector("#official-result-panel p");
    if (officialRedirectCopy) {
      officialRedirectCopy.textContent = t("auth.redirectingOfficial");
    }
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

  function setAccessMode(mode) {
    accessMode = mode;
    const citizenActive = mode === "citizen";

    elements.citizenTab.classList.toggle("is-active", citizenActive);
    elements.officialTab.classList.toggle("is-active", !citizenActive);
    elements.citizenPanel.classList.toggle("hidden", !citizenActive);
    elements.officialPanel.classList.toggle("hidden", citizenActive);
  }

  function setCitizenMode(mode) {
    citizenMode = mode;
    const signInActive = mode === "signin";

    elements.citizenSigninTab.classList.toggle("is-active", signInActive);
    elements.citizenSignupTab.classList.toggle("is-active", !signInActive);
    elements.citizenSigninForm.classList.toggle("hidden", !signInActive);
    elements.citizenSignupForm.classList.toggle("hidden", signInActive);
    elements.citizenTitle.textContent = signInActive ? t("auth.citizenSignIn") : t("auth.citizenSignUp");
  }

  function clearCitizenFeedback() {
    showError(elements.citizenSigninError, "");
    showError(elements.citizenSignupError, "");
    elements.citizenResultPanel.classList.add("hidden");
  }

  function clearOfficialFeedback() {
    showError(elements.officialError, "");
    elements.officialResultPanel.classList.add("hidden");
  }

  function redirectCitizenWorkspace() {
    globalScope.location.href = CITIZEN_WORKSPACE;
  }

  function renderCitizenResult(citizenRecord) {
    const requests = getCitizenRequests(citizenRecord.email);
    elements.citizenResultMeta.innerHTML = `
      <div class="result-meta-row"><span>${t("auth.resultName")}</span><strong>${citizenRecord.name}</strong></div>
      <div class="result-meta-row"><span>${t("auth.resultAadhaar")}</span><strong class="mono">XXXX-XXXX-${citizenRecord.aadhaar.slice(-4)}</strong></div>
      <div class="result-meta-row"><span>${t("auth.resultLinkedRequests")}</span><strong>${requests.length}</strong></div>
    `;
    elements.citizenResultPanel.classList.remove("hidden");
  }

  function bindCitizenForms() {
    elements.citizenSigninForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.citizenSigninForm).entries());
      const validationMessage = getCitizenSignInError(payload);

      showError(elements.citizenSigninError, "");

      if (validationMessage) {
        showError(elements.citizenSigninError, validationMessage);
        return;
      }

      try {
        authenticateCitizen(payload.identifier, payload.password);
        elements.citizenSigninForm.reset();
        redirectCitizenWorkspace();
      } catch (error) {
        showError(elements.citizenSigninError, error.message);
      }
    });

    elements.citizenSignupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.citizenSignupForm).entries());
      const validationMessage = getCitizenSignUpError(payload);

      showError(elements.citizenSignupError, "");

      if (validationMessage) {
        showError(elements.citizenSignupError, validationMessage);
        return;
      }

      try {
        const citizen = registerCitizenAccount({
          ...payload,
          preferredLanguage: getLanguage()
        });

        authenticateCitizen(citizen.email, payload.password);
        elements.citizenSignupForm.reset();
        redirectCitizenWorkspace();
      } catch (error) {
        showError(elements.citizenSignupError, error.message);
      }
    });
  }

  function bindOfficialForm() {
    elements.officialForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(elements.officialForm).entries());
      const validationMessage = getOfficialSignInError({
        email: payload.email || "",
        password: payload.password || ""
      });

      showError(elements.officialError, "");

      if (validationMessage) {
        showError(elements.officialError, validationMessage);
        return;
      }

      try {
        const account = authenticateOfficial(payload.email, payload.password);
        const nextWorkspace = ROLE_WORKSPACE_MAP[account.role];
        if (nextWorkspace) {
          globalScope.location.href = nextWorkspace;
        }
      } catch (error) {
        showError(elements.officialError, error.message);
      }
    });
  }

  function bindTabs() {
    elements.citizenTab.addEventListener("click", () => {
      clearOfficialFeedback();
      setAccessMode("citizen");
    });
    elements.officialTab.addEventListener("click", () => {
      clearCitizenFeedback();
      setAccessMode("official");
    });
    elements.citizenSigninTab.addEventListener("click", () => {
      clearCitizenFeedback();
      setCitizenMode("signin");
    });
    elements.citizenSignupTab.addEventListener("click", () => {
      clearCitizenFeedback();
      setCitizenMode("signup");
    });
  }

  function applyInitialModeFromUrl() {
    const mode = new URL(globalScope.location.href).searchParams.get("mode");
    if (mode === "official") {
      setAccessMode("official");
      return;
    }

    setAccessMode("citizen");
  }

  function init() {
    initializeStore();
    bindLanguageSelector(elements.languageSelect);
    applyTranslations(document, getLanguage());
    renderStaticText();
    bindTabs();
    setCitizenMode("signin");
    applyInitialModeFromUrl();
    bindCitizenForms();
    bindOfficialForm();

    document.addEventListener("crims:language-change", () => {
      renderStaticText();
      setCitizenMode(citizenMode);
    });
  }

  init();
})(window);
