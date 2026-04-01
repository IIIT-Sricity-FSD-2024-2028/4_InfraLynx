(function bootstrapForgotPassword(globalScope) {
  const { getState, saveState, initializeStore } = globalScope.CRIMS.store;

  // ── State ────────────────────────────────────────────
  let lane = "citizen";       // "citizen" | "official"
  let currentStep = 1;
  let generatedOtp = "";
  let resolvedEmail = "";
  let resolvedAccountType = "";
  let resolvedIdentifier = "";
  let otpTimerInterval = null;
  let otpSecondsLeft = 300; // 5 minutes

  // ── Element refs ─────────────────────────────────────
  const els = {
    citizenTab:             document.querySelector("#fp-citizen-tab"),
    officialTab:            document.querySelector("#fp-official-tab"),

    citizenIdentifyForm:    document.querySelector("#fp-citizen-identify-form"),
    officialIdentifyForm:   document.querySelector("#fp-official-identify-form"),
    citizenIdentifyError:   document.querySelector("#fp-citizen-identify-error"),
    officialIdentifyError:  document.querySelector("#fp-official-identify-error"),
    step1HintText:          document.querySelector("#fp-step1-hint"),

    otpForm:                document.querySelector("#fp-otp-form"),
    otpError:               document.querySelector("#fp-otp-error"),
    otpInputs:              document.querySelectorAll(".fp-otp-input"),
    sentToEl:               document.querySelector("#fp-sent-to"),
    demoOtpDisplay:         document.querySelector("#fp-demo-otp-display"),
    countdownEl:            document.querySelector("#fp-countdown"),
    timerEl:                document.querySelector("#fp-otp-timer"),
    resendBtn:              document.querySelector("#fp-resend-btn"),
    backTo1Btn:             document.querySelector("#fp-back-to-1"),

    newpasswordForm:        document.querySelector("#fp-newpassword-form"),
    newPasswordInput:       document.querySelector("#fp-new-password"),
    confirmPasswordInput:   document.querySelector("#fp-confirm-password"),
    strengthFill:           document.querySelector("#fp-strength-fill"),
    strengthLabel:          document.querySelector("#fp-strength-label"),
    newpasswordError:       document.querySelector("#fp-newpassword-error"),
    toggleVisBtns:          document.querySelectorAll(".fp-toggle-vis"),

    successMessage:         document.querySelector("#fp-success-message"),
    successMeta:            document.querySelector("#fp-success-meta"),
    signinLink:             document.querySelector("#fp-signin-link")
  };

  // ── Helpers ───────────────────────────────────────────
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

  // ── Step navigation ───────────────────────────────────
  function goToStep(step) {
    currentStep = step;

    document.querySelectorAll(".fp-step-panel").forEach((panel) => {
      panel.classList.remove("is-active");
    });

    const target = document.querySelector(step === "success" ? "#fp-success" : `#fp-step-${step}`);
    if (target) target.classList.add("is-active");

    // Update stepper indicators
    document.querySelectorAll(".fp-step").forEach((stepEl) => {
      const n = Number(stepEl.dataset.step);
      stepEl.classList.remove("is-active", "is-done");
      if (typeof step === "number") {
        if (n === step) stepEl.classList.add("is-active");
        if (n < step) stepEl.classList.add("is-done");
      } else if (step === "success") {
        stepEl.classList.add("is-done");
      }
    });

    // Connectors
    document.querySelectorAll(".fp-step-connector").forEach((connector, idx) => {
      connector.classList.toggle("is-done", typeof step === "number" ? step > idx + 1 : true);
    });
  }

  // ── Lane switching ────────────────────────────────────
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

  // ── OTP timer ─────────────────────────────────────────
  function startOtpTimer() {
    clearInterval(otpTimerInterval);
    otpSecondsLeft = 300;
    els.resendBtn.disabled = true;
    updateTimerDisplay();

    otpTimerInterval = setInterval(() => {
      otpSecondsLeft--;
      updateTimerDisplay();

      if (otpSecondsLeft <= 60) {
        els.timerEl.classList.add("is-expiring");
      }

      if (otpSecondsLeft <= 0) {
        clearInterval(otpTimerInterval);
        els.resendBtn.disabled = false;
        els.countdownEl.textContent = "Expired";
        els.timerEl.querySelector("#fp-timer-text").textContent = "Code expired — ";
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    const m = String(Math.floor(otpSecondsLeft / 60)).padStart(2, "0");
    const s = String(otpSecondsLeft % 60).padStart(2, "0");
    els.countdownEl.textContent = `${m}:${s}`;
  }

  function issueOtp() {
    generatedOtp = generateOtp();
    els.demoOtpDisplay.textContent = generatedOtp;
    els.sentToEl.textContent = maskEmail(resolvedEmail);
    startOtpTimer();
  }

  // ── Resend ────────────────────────────────────────────
  els.resendBtn.addEventListener("click", () => {
    issueOtp();
    els.otpInputs.forEach((inp) => {
      inp.value = "";
      inp.classList.remove("is-filled", "is-error");
    });
    els.otpInputs[0].focus();
    showError(els.otpError, "");
  });

  // ── OTP keyboard navigation ───────────────────────────
  els.otpInputs.forEach((input, index) => {
    input.addEventListener("input", (event) => {
      const val = event.target.value.replace(/[^0-9]/g, "");
      input.value = val;
      input.classList.toggle("is-filled", val.length > 0);
      input.classList.remove("is-error");

      if (val && index < els.otpInputs.length - 1) {
        els.otpInputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        els.otpInputs[index - 1].focus();
      }
      if (event.key === "ArrowLeft" && index > 0) {
        els.otpInputs[index - 1].focus();
      }
      if (event.key === "ArrowRight" && index < els.otpInputs.length - 1) {
        els.otpInputs[index + 1].focus();
      }
    });

    // Handle paste across all cells
    input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pasted = (event.clipboardData || globalScope.clipboardData).getData("text").replace(/[^0-9]/g, "");
      pasted.split("").forEach((char, i) => {
        if (els.otpInputs[i]) {
          els.otpInputs[i].value = char;
          els.otpInputs[i].classList.add("is-filled");
        }
      });
      const lastFilled = Math.min(pasted.length, els.otpInputs.length - 1);
      els.otpInputs[lastFilled].focus();
    });
  });

  // ── Password strength ─────────────────────────────────
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
  const STRENGTH_COLORS = ["", "#dc2626", "#f59e0b", "#3b82f6", "#16a34a"];

  els.newPasswordInput.addEventListener("input", () => {
    const level = measureStrength(els.newPasswordInput.value);
    els.strengthFill.setAttribute("data-level", level || "");
    els.strengthLabel.textContent = level ? STRENGTH_LABELS[level] : "";
    els.strengthLabel.style.color = STRENGTH_COLORS[level] || "";
  });

  // ── Visibility toggles ────────────────────────────────
  els.toggleVisBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const targetInput = document.querySelector(`#${targetId}`);
      if (!targetInput) return;
      const isVisible = targetInput.type === "text";
      targetInput.type = isVisible ? "password" : "text";
      btn.setAttribute("aria-label", isVisible ? "Show password" : "Hide password");
    });
  });

  // ── STEP 1 — Citizen identify ─────────────────────────
  els.citizenIdentifyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showError(els.citizenIdentifyError, "");
    const identifier = els.citizenIdentifyForm.querySelector("[name=identifier]").value.trim();

    if (!identifier) {
      showError(els.citizenIdentifyError, "Enter the Aadhaar number or email linked to your account.");
      return;
    }

    const state = getState();
    const citizen = state.citizenUsers.find((u) => {
      return u.aadhaar === identifier || u.email.toLowerCase() === identifier.toLowerCase();
    });

    if (!citizen) {
      showError(els.citizenIdentifyError, "No citizen account found for that Aadhaar number or email.");
      return;
    }

    resolvedEmail = citizen.email;
    resolvedIdentifier = identifier;
    resolvedAccountType = "citizen";
    issueOtp();
    goToStep(2);
  });

  // ── STEP 1 — Official identify ────────────────────────
  els.officialIdentifyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showError(els.officialIdentifyError, "");
    const email = els.officialIdentifyForm.querySelector("[name=email]").value.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      showError(els.officialIdentifyError, "Enter a valid email address.");
      return;
    }

    const state = getState();
    const account = state.officialAccounts.find((a) => a.email.toLowerCase() === email.toLowerCase());

    if (!account) {
      showError(els.officialIdentifyError, "No official account found for that email address.");
      return;
    }

    resolvedEmail = account.email;
    resolvedIdentifier = email;
    resolvedAccountType = "official";
    issueOtp();
    goToStep(2);
  });

  // ── STEP 2 — OTP verify ───────────────────────────────
  els.otpForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showError(els.otpError, "");

    const enteredOtp = Array.from(els.otpInputs).map((inp) => inp.value).join("");

    if (enteredOtp.length < 6) {
      showError(els.otpError, "Enter all 6 digits of the verification code.");
      els.otpInputs.forEach((inp) => inp.classList.add("is-error"));
      return;
    }

    if (otpSecondsLeft <= 0) {
      showError(els.otpError, "The verification code has expired. Request a new one.");
      return;
    }

    if (enteredOtp !== generatedOtp) {
      showError(els.otpError, "Incorrect code. Please check and try again.");
      els.otpInputs.forEach((inp) => inp.classList.add("is-error"));
      return;
    }

    clearInterval(otpTimerInterval);
    goToStep(3);
  });

  // ── Back to step 1 ────────────────────────────────────
  els.backTo1Btn.addEventListener("click", () => {
    clearInterval(otpTimerInterval);
    els.otpInputs.forEach((inp) => {
      inp.value = "";
      inp.classList.remove("is-filled", "is-error");
    });
    goToStep(1);
  });

  // ── STEP 3 — New password ─────────────────────────────
  els.newpasswordForm.addEventListener("submit", (event) => {
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

    // Persist new password to store
    const state = getState();

    if (resolvedAccountType === "citizen") {
      state.citizenUsers = state.citizenUsers.map((u) => {
        if (u.email.toLowerCase() === resolvedEmail.toLowerCase()) {
          return { ...u, password: newPassword };
        }
        return u;
      });
      saveState(state);

      els.successMessage.textContent = "Your citizen account password has been updated. Sign in with your new credentials.";
      els.successMeta.innerHTML = `
        <div class="fp-success-meta-row"><span>Account type</span><strong>Citizen</strong></div>
        <div class="fp-success-meta-row"><span>Email</span><strong class="mono">${maskEmail(resolvedEmail)}</strong></div>
        <div class="fp-success-meta-row"><span>Updated</span><strong>${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></div>
      `;
      els.signinLink.href = "./auth.html";

    } else if (resolvedAccountType === "official") {
      state.officialAccounts = state.officialAccounts.map((a) => {
        if (a.email.toLowerCase() === resolvedEmail.toLowerCase()) {
          return { ...a, password: newPassword };
        }
        return a;
      });
      saveState(state);

      const account = state.officialAccounts.find((a) => a.email.toLowerCase() === resolvedEmail.toLowerCase());
      els.successMessage.textContent = "Your official account password has been updated. Proceed to the official sign-in page.";
      els.successMeta.innerHTML = `
        <div class="fp-success-meta-row"><span>Account type</span><strong>Official — ${account ? account.role : "Government"}</strong></div>
        <div class="fp-success-meta-row"><span>Email</span><strong class="mono">${maskEmail(resolvedEmail)}</strong></div>
        <div class="fp-success-meta-row"><span>Updated</span><strong>${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></div>
      `;
      els.signinLink.href = "./auth.html?mode=official";
    }

    goToStep("success");
  });

  // ── Tab listeners ─────────────────────────────────────
  els.citizenTab.addEventListener("click", () => setLane("citizen"));
  els.officialTab.addEventListener("click", () => setLane("official"));

  // ── Init ──────────────────────────────────────────────
  function init() {
    initializeStore();

    // Honour ?lane=official in query string
    const params = new URL(globalScope.location.href).searchParams;
    const initialLane = params.get("lane");
    setLane(initialLane === "official" ? "official" : "citizen");
    goToStep(1);
  }

  init();
})(window);
