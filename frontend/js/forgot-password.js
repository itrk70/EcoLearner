/* ==========================================================================
   FORGOT-PASSWORD.JS
   Drives the 4-step Forgot Password modal: Email -> OTP -> New Password
   -> Success, plus the "incorrect OTP" error state.

   IMPORTANT: everything that checks "does this email exist" or "is this
   OTP correct" is a FRONTEND SIMULATION ONLY. There is no real backend
   yet, so this file fakes those checks just so the interface behaves
   the right way. Every simulated bit is clearly marked below - search
   for "TODO" when the real Flask backend exists.
   ========================================================================== */

/* --------------------------------------------------------------------------
   FAKE "DATABASE" - stand-in until Flask + SQLite exist.
   Only this one email will be treated as "registered" for testing.
   -------------------------------------------------------------------------- */
const FAKE_REGISTERED_EMAILS = ["john.doe@email.com", "test@ecolearner.com"];

let generatedOTP = null; // the "correct" OTP for this session (frontend-only)
let resendSecondsLeft = 25;
let resendTimerId = null;

/* --------------------------------------------------------------------------
   DOM REFERENCES
   -------------------------------------------------------------------------- */
const fpOverlay = document.getElementById("fpOverlay");
const fpOpenTrigger = document.getElementById("forgotPasswordLink"); // the Login page's "Forgot Password?" link

const fpStep1 = document.getElementById("fpStep1");
const fpStep2 = document.getElementById("fpStep2");
const fpStep3 = document.getElementById("fpStep3");
const fpStep4 = document.getElementById("fpStep4");

const fpEmailInput = document.getElementById("fpEmailInput");
const fpEmailError = document.getElementById("fpEmailError");
const fpSendOtpBtn = document.getElementById("fpSendOtpBtn");

const fpEmailDisplay = document.getElementById("fpEmailDisplay");
const fpOtpBoxes = document.querySelectorAll(".fp-otp-box");
const fpVerifyOtpBtn = document.getElementById("fpVerifyOtpBtn");
const fpResendBtn = document.getElementById("fpResendBtn");
const fpResendCountdown = document.getElementById("fpResendCountdown");
const fpOtpNormalBlock = document.getElementById("fpOtpNormalBlock");
const fpOtpErrorBlock = document.getElementById("fpOtpErrorBlock");
const fpResendBtnError = document.getElementById("fpResendBtnError");
const fpGoBackChangeEmail = document.getElementById("fpGoBackChangeEmail");

const fpNewPassword = document.getElementById("fpNewPassword");
const fpConfirmPassword = document.getElementById("fpConfirmPassword");
const fpToggleNewPassword = document.getElementById("fpToggleNewPassword");
const fpToggleConfirmPassword = document.getElementById("fpToggleConfirmPassword");
const fpResetPasswordBtn = document.getElementById("fpResetPasswordBtn");

const fpGoToLoginBtn = document.getElementById("fpGoToLoginBtn");

/* --------------------------------------------------------------------------
   OPEN / CLOSE / STEP NAVIGATION
   -------------------------------------------------------------------------- */
function openForgotPassword() {
  fpOverlay.classList.add("is-active");
  goToStep(1);
}

function closeForgotPassword() {
  fpOverlay.classList.remove("is-active");
  resetForgotPasswordState();
}

function goToStep(stepNumber) {
  [fpStep1, fpStep2, fpStep3, fpStep4].forEach((step) => step.classList.remove("is-active"));
  document.getElementById("fpStep" + stepNumber).classList.add("is-active");
}

function resetForgotPasswordState() {
  fpEmailInput.value = "";
  fpEmailError.classList.remove("is-active");
  fpOtpBoxes.forEach((box) => {
    box.value = "";
    box.type = "text";
    box.classList.remove("is-invalid");
  });
  fpOtpNormalBlock.classList.remove("is-active");
  fpOtpErrorBlock.classList.remove("is-active");
  fpOtpNormalBlock.classList.add("is-active");
  fpNewPassword.value = "";
  fpConfirmPassword.value = "";
  updatePasswordCriteria("");
  clearInterval(resendTimerId);
}

if (fpOpenTrigger) fpOpenTrigger.addEventListener("click", (e) => {
  e.preventDefault();
  openForgotPassword();
});

document.querySelectorAll(".fp-close").forEach((btn) => btn.addEventListener("click", closeForgotPassword));
// NOTE: clicking the dark backdrop intentionally does NOT close this modal.
// Unlike simpler popups (like the level-up modal), this is a multi-step
// form - an accidental outside click here would force the user to redo
// the entire email -> OTP -> new password flow. Only the X button (all
// steps) or "Go to Login" (final step) should close it.

document.getElementById("fpBackStep2").addEventListener("click", () => goToStep(1));
document.getElementById("fpBackStep3").addEventListener("click", () => goToStep(2));

/* --------------------------------------------------------------------------
   STEP 1: EMAIL
   TODO: replace this with a real fetch() to Flask, e.g.
     const res = await fetch("/api/check-email", { method: "POST", body: ... });
   which checks the Users table for a matching email.
   -------------------------------------------------------------------------- */
fpSendOtpBtn.addEventListener("click", () => {
  const email = fpEmailInput.value.trim().toLowerCase();

  if (!FAKE_REGISTERED_EMAILS.includes(email)) {
    fpEmailError.textContent = "No account exists with this email address.";
    fpEmailError.classList.add("is-active");
    return;
  }

  fpEmailError.classList.remove("is-active");
  fpEmailDisplay.textContent = email;

  sendNewOTP();
  goToStep(2);
});

/* --------------------------------------------------------------------------
   STEP 2: OTP
   -------------------------------------------------------------------------- */

// Generates a fake 6-digit OTP and "sends" it (really just logs it to the
// console, since there's no real email service yet).
function sendNewOTP() {
  generatedOTP = String(Math.floor(100000 + Math.random() * 900000));
  console.log("[DEV ONLY - remove once real email sending exists] OTP is:", generatedOTP);

  fpOtpBoxes.forEach((box) => {
    box.value = "";
    box.type = "text";
    box.classList.remove("is-invalid");
  });
  fpOtpNormalBlock.classList.add("is-active");
  fpOtpErrorBlock.classList.remove("is-active");
  fpOtpBoxes[0].focus();

  startResendCountdown();
}

// Auto-advance to the next box as the user types, and move back on backspace
fpOtpBoxes.forEach((box, index) => {
  box.addEventListener("input", () => {
    box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);
    if (box.value && index < fpOtpBoxes.length - 1) {
      fpOtpBoxes[index + 1].focus();
    }
  });

  box.addEventListener("keydown", (e) => {
    if (e.key === "Backspace" && !box.value && index > 0) {
      fpOtpBoxes[index - 1].focus();
    }
  });
});

function startResendCountdown() {
  resendSecondsLeft = 25;
  fpResendBtn.disabled = true;
  updateResendCountdownText();

  clearInterval(resendTimerId);
  resendTimerId = setInterval(() => {
    resendSecondsLeft--;
    updateResendCountdownText();
    if (resendSecondsLeft <= 0) {
      clearInterval(resendTimerId);
      fpResendBtn.disabled = false;
      fpResendCountdown.textContent = "";
    }
  }, 1000);
}

function updateResendCountdownText() {
  const mins = String(Math.floor(resendSecondsLeft / 60)).padStart(2, "0");
  const secs = String(resendSecondsLeft % 60).padStart(2, "0");
  fpResendCountdown.textContent = `(${mins}:${secs})`;
}

fpResendBtn.addEventListener("click", () => {
  if (fpResendBtn.disabled) return;
  sendNewOTP();
});

fpResendBtnError.addEventListener("click", sendNewOTP);

fpGoBackChangeEmail.addEventListener("click", (e) => {
  e.preventDefault();
  goToStep(1);
});

// TODO: replace this with a real fetch() to Flask that checks the OTP
// the backend actually sent, rather than comparing to a frontend variable.
fpVerifyOtpBtn.addEventListener("click", () => {
  const enteredOTP = Array.from(fpOtpBoxes).map((box) => box.value).join("");

  if (enteredOTP.length < 6) return; // incomplete, don't submit yet

  if (enteredOTP === generatedOTP) {
    goToStep(3);
  } else {
    // Show the "incorrect OTP" state: mask entered digits as dots,
    // highlight the boxes red, and swap the footer to the error version.
    fpOtpBoxes.forEach((box) => {
      box.type = "password";
      box.classList.add("is-invalid");
    });
    fpOtpNormalBlock.classList.remove("is-active");
    fpOtpErrorBlock.classList.add("is-active");
    clearInterval(resendTimerId);
  }
});

/* --------------------------------------------------------------------------
   STEP 3: NEW PASSWORD
   -------------------------------------------------------------------------- */

function setupPasswordToggle(inputEl, buttonEl) {
  buttonEl.addEventListener("click", () => {
    inputEl.type = inputEl.type === "password" ? "text" : "password";
  });
}
setupPasswordToggle(fpNewPassword, fpToggleNewPassword);
setupPasswordToggle(fpConfirmPassword, fpToggleConfirmPassword);

// Lights up each rule in the checklist green as soon as it's satisfied
function updatePasswordCriteria(password) {
  const rules = {
    length: password.length >= 8 && password.length <= 20,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password),
  };

  document.querySelectorAll("[data-rule]").forEach((item) => {
    const ruleName = item.dataset.rule;
    item.classList.toggle("is-met", rules[ruleName]);
  });

  return rules.length && rules.uppercase && rules.lowercase && rules.number && rules.special;
}

fpNewPassword.addEventListener("input", () => updatePasswordCriteria(fpNewPassword.value));

fpResetPasswordBtn.addEventListener("click", () => {
  const isValid = updatePasswordCriteria(fpNewPassword.value);

  if (!isValid) {
    fpNewPassword.focus();
    return;
  }

  if (fpNewPassword.value !== fpConfirmPassword.value) {
    alert("Passwords do not match.");
    fpConfirmPassword.focus();
    return;
  }

  // TODO: real fetch() to Flask here to actually update the password in SQLite
  console.log("Password reset submitted (not yet connected to a backend).");

  goToStep(4);
});

/* --------------------------------------------------------------------------
   STEP 4: SUCCESS
   -------------------------------------------------------------------------- */
fpGoToLoginBtn.addEventListener("click", () => {
  closeForgotPassword();
  // Already on the Login page in normal use, so just closing the modal
  // is enough. If this modal is ever opened from elsewhere, uncomment:
  // window.location.href = "login.html";
});
