(function bootstrapForgotPassword(globalScope) {
  const {
    initializeStore,
    lookupCitizenAccount,
    lookupOfficialAccount,
    resetCitizenPassword,
    resetOfficialPassword
  } = globalScope.CRIMS.store;

  let lane = "citizen";
  let generatedOtp = "";
  let resolvedEmail = "";
  let resolvedAccountType = "";
  let resolvedIdentifier = "";
  let otpTimerInterval = null;
  let otpSecondsLeft = 300;

  const els = {
    citizenTab: document.querySelector("#fp-citizen-tab"),
    officialTab: document.querySelector("#fp-official-tab"),
    citizenIdentifyForm: document.querySelector("#fp-citizen-identify-form"),
    officialIdentifyForm: document.querySelector("#fp-official-identify-form"),
    citizenIdentifyError: document.querySelector("#fp-citizen-identify-error"),
    officialIdentifyError: document.querySelector("#fp-official-identify-error"),
    step1HintText: document.querySelector("#fp-step1-hint"),
    otpForm: document.querySelector("#fp-otp-form"),
    otpError: document.querySelector("#fp-otp-error"),
    otpInputs: document.querySelectorAll(".fp-otp-input"),
    sentToEl: document.querySelector("#fp-sent-to"),
    demoOtpDisplay: document.querySelector("#fp-demo-otp-display"),
    countdownEl: document.querySelector("#fp-countdown"),
    timerEl: document.querySelector("#fp-otp-timer"),
    resendBtn: document.querySelector("#fp-resend-btn"),
    backTo1Btn: document.querySelector("#fp-back-to-1"),
    newpasswordForm: document.querySelector("#fp-newpassword-form"),
    newPasswordInput: document.querySelector("#fp-new-password"),
    confirmPasswordInput: document.querySelector("#fp-confirm-password"),
    strengthFill: document.querySelector("#fp-strength-fill"),
    strengthLabel: document.querySelector("#fp-strength-label"),
    newpasswordError: document.querySelector("#fp-newpassword-error"),
    toggleVisBtns: document.querySelectorAll(".fp-toggle-vis"),
    successMessage: document.querySelector("#fp-success-message"),
    successMeta: document.querySelector("#fp-success-meta"),
    signinLink: document.querySelector("#fp-signin-link")
  };

  function showError(el, msg) {
    if (!el) return;
    if (!msg) {
      el.textContent = "";
      el.classList.add("hidden");
      return;
    }
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function generateOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  function maskEmail(email) {
    const [local, domain] = email.split("@");
    if (!local || !domain) return email;
    const visible = local.length > 3 ? local.slice(0, 3) : local.slice(0, 1);
    return `${visible}${"*".repeat(Math.max(2, local.length - visible.length))}@${domain}`;
  }

  function goToStep(step) {
    document.querySelectorAll(".fp-step-panel").forEach((panel) => panel.classList.remove("is-active"));
    const target = document.querySelector(step === "success" ? "#fp-success" : `#fp-step-${step}`);
    if (target) target.classList.add("is-active");

    document.querySelectorAll(".fp-step").forEach((stepEl) => {
      const n = Number(stepEl.dataset.step);
      stepEl.classList.remove("is-active", "is-done");
      if (typeof step === "number") {
        if (n === step) stepEl.classList.add("is-active");
        if (n < step) stepEl.classList.add("is-done");
      } else {
        stepEl.classList.add("is-done");
      }
    });
  }

  function setLane(newLane) {
    lane = newLane;
    els.citizenTab.classList.toggle("is-active", lane === "citizen");
    els.officialTab.classList.toggle("is-active", lane === "official");
    els.citizenIdentifyForm.classList.toggle("hidden", lane !== "citizen");
    els.officialIdentifyForm.classList.toggle("hidden", lane !== "official");
    els.step1HintText.textContent = lane === "citizen"
      ? "Enter the email address or Aadhaar number linked to your citizen account."
      : "Enter the official email address linked to your government account.";
    showError(els.citizenIdentifyError, "");
    showError(els.officialIdentifyError, "");
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(otpSecondsLeft / 60)).padStart(2, "0");
    const s = String(otpSecondsLeft % 60).padStart(2, "0");
    els.countdownEl.textContent = `${m}:${s}`;
  }

  function startOtpTimer() {
    clearInterval(otpTimerInterval);
    otpSecondsLeft = 300;
    els.resendBtn.disabled = true;
    updateTimerDisplay();

    otpTimerInterval = setInterval(() => {
      otpSecondsLeft--;
      updateTimerDisplay();
      if (otpSecondsLeft <= 0) {
        clearInterval(otpTimerInterval);
        els.resendBtn.disabled = false;
        els.countdownEl.textContent = "Expired";
        els.timerEl.querySelector("#fp-timer-text").textContent = "Code expired - ";
      }
    }, 1000);
  }

  function issueOtp() {
    generatedOtp = generateOtp();
    els.demoOtpDisplay.textContent = generatedOtp;
    els.sentToEl.textContent = maskEmail(resolvedEmail);
    startOtpTimer();
  }

  function measureStrength(password) {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(4, Math.ceil(score * 0.85));
  }

  const STRENGTH_LABELS = ["", "Weak", "Fair", "Good", "Strong"];

  els.newPasswordInput.addEventListener("input", () => {
    const level = measureStrength(els.newPasswordInput.value);
    els.strengthFill.setAttribute("data-level", level || "");
    els.strengthLabel.textContent = level ? STRENGTH_LABELS[level] : "";
  });

  els.toggleVisBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const targetInput = document.querySelector(`#${targetId}`);
      if (!targetInput) return;
      targetInput.type = targetInput.type === "text" ? "password" : "text";
    });
  });

  els.otpInputs.forEach((input, index) => {
    input.addEventListener("input", (event) => {
      input.value = event.target.value.replace(/[^0-9]/g, "");
      if (input.value && index < els.otpInputs.length - 1) {
        els.otpInputs[index + 1].focus();
      }
    });
  });

  els.citizenIdentifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError(els.citizenIdentifyError, "");
    const identifier = els.citizenIdentifyForm.querySelector("[name=identifier]").value.trim();
    if (!identifier) {
      showError(els.citizenIdentifyError, "Enter the Aadhaar number or email linked to your account.");
      return;
    }

    try {
      const citizen = await lookupCitizenAccount(identifier);
      resolvedEmail = citizen.email;
      resolvedIdentifier = identifier;
      resolvedAccountType = "citizen";
      issueOtp();
      goToStep(2);
    } catch (_error) {
      showError(els.citizenIdentifyError, "No citizen account found for that Aadhaar number or email.");
    }
  });

  els.officialIdentifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError(els.officialIdentifyError, "");
    const email = els.officialIdentifyForm.querySelector("[name=email]").value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showError(els.officialIdentifyError, "Enter a valid email address.");
      return;
    }

    try {
      const account = await lookupOfficialAccount(email);
      resolvedEmail = account.email;
      resolvedIdentifier = email;
      resolvedAccountType = "official";
      issueOtp();
      goToStep(2);
    } catch (_error) {
      showError(els.officialIdentifyError, "No official account found for that email address.");
    }
  });

  els.otpForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showError(els.otpError, "");
    const enteredOtp = Array.from(els.otpInputs).map((inp) => inp.value).join("");

    if (enteredOtp.length < 6) {
      showError(els.otpError, "Enter all 6 digits of the verification code.");
      return;
    }
    if (otpSecondsLeft <= 0) {
      showError(els.otpError, "The verification code has expired. Request a new one.");
      return;
    }
    if (enteredOtp !== generatedOtp) {
      showError(els.otpError, "Incorrect code. Please check and try again.");
      return;
    }

    clearInterval(otpTimerInterval);
    goToStep(3);
  });

  els.newpasswordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError(els.newpasswordError, "");

    const newPassword = els.newPasswordInput.value;
    const confirmPassword = els.confirmPasswordInput.value;

    if (newPassword.length < 8) {
      showError(els.newpasswordError, "Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showError(els.newpasswordError, "Passwords do not match. Please re-enter.");
      return;
    }

    try {
      if (resolvedAccountType === "citizen") {
        await resetCitizenPassword(resolvedIdentifier, newPassword);
        els.successMessage.textContent = "Your citizen account password has been updated. Sign in with your new credentials.";
        els.successMeta.innerHTML = `
          <div class="fp-success-meta-row"><span>Account type</span><strong>Citizen</strong></div>
          <div class="fp-success-meta-row"><span>Email</span><strong class="mono">${maskEmail(resolvedEmail)}</strong></div>
        `;
        els.signinLink.href = "./auth.html";
      } else {
        await resetOfficialPassword(resolvedEmail, newPassword);
        const account = await lookupOfficialAccount(resolvedEmail);
        els.successMessage.textContent = "Your official account password has been updated. Proceed to the official sign-in page.";
        els.successMeta.innerHTML = `
          <div class="fp-success-meta-row"><span>Account type</span><strong>Official - ${account.role}</strong></div>
          <div class="fp-success-meta-row"><span>Email</span><strong class="mono">${maskEmail(resolvedEmail)}</strong></div>
        `;
        els.signinLink.href = "./auth.html?mode=official";
      }

      goToStep("success");
    } catch (error) {
      showError(els.newpasswordError, error.message || "Unable to update password.");
    }
  });

  els.resendBtn.addEventListener("click", () => {
    issueOtp();
    els.otpInputs.forEach((inp) => { inp.value = ""; });
    els.otpInputs[0].focus();
    showError(els.otpError, "");
  });

  els.backTo1Btn.addEventListener("click", () => {
    clearInterval(otpTimerInterval);
    els.otpInputs.forEach((inp) => { inp.value = ""; });
    goToStep(1);
  });

  els.citizenTab.addEventListener("click", () => setLane("citizen"));
  els.officialTab.addEventListener("click", () => setLane("official"));

  async function init() {
    await initializeStore();
    const params = new URL(globalScope.location.href).searchParams;
    setLane(params.get("lane") === "official" ? "official" : "citizen");
    goToStep(1);
  }

  init();
})(window);

