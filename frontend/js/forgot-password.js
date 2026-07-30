/* ==========================================================================
   FORGOT-PASSWORD.JS
   Drives the 4-step Forgot Password modal: Email -> OTP -> New Password
   -> Success, plus the "incorrect OTP" error state.

   Now calls the REAL backend routes (send-otp / verify-otp / reset)
   instead of faking the OTP in the browser. Unlike earlier placeholder
   files, this one does NOT fall back to a fake local simulation if the
   backend isn't reachable - faking password-reset security defeats the
   whole point of fixing this. If the fetch fails, the user just sees a
   clear "couldn't reach the server" message and stays on the same step.
   ========================================================================== */

let currentResetEmail = null; // carried across steps 1 -> 2 -> 3
let verifiedOtp = null; // set once step 2 succeeds, sent again in step 3 so the backend can double-check it
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
  currentResetEmail = null;
  verifiedOtp = null;
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
// This is a multi-step form - an accidental outside click would force the
// user to redo the entire email -> OTP -> new password flow.

document.getElementById("fpBackStep2").addEventListener("click", () => goToStep(1));
document.getElementById("fpBackStep3").addEventListener("click", () => goToStep(2));

/* --------------------------------------------------------------------------
   STEP 1: EMAIL
   -------------------------------------------------------------------------- */
fpSendOtpBtn.addEventListener("click", async () => {
  const email = fpEmailInput.value.trim().toLowerCase();
  if (!email) return;

  fpEmailError.classList.remove("is-active");

  const sent = await requestOtp(email, /* isResend */ false);
  if (sent) {
    currentResetEmail = email;
    fpEmailDisplay.textContent = email;
    goToStep(2);
  }
});

/* --------------------------------------------------------------------------
   STEP 2: OTP
   -------------------------------------------------------------------------- */

// ------------------------------------------------------------------
// BACKEND CONTRACT - POST /forgot-password/send-otp
// Request:  { "email": "..." }
// Response success: { "success": true, "message": "OTP sent" }
// Response failure: { "success": false, "message": "No account exists with this email address." }
// ------------------------------------------------------------------
async function requestOtp(email, isResend) {
  try {
    const response = await fetch("/forgot-password/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const result = await response.json();

    if (!result.success) {
      if (isResend) {
        alert(result.message || "Could not resend the code. Please try again.");
      } else {
        fpEmailError.textContent = result.message || "No account exists with this email address.";
        fpEmailError.classList.add("is-active");
      }
      return false;
    }

    // Reset the OTP boxes to a fresh, empty entry state
    fpOtpBoxes.forEach((box) => {
      box.value = "";
      box.type = "text";
      box.classList.remove("is-invalid");
    });
    fpOtpNormalBlock.classList.add("is-active");
    fpOtpErrorBlock.classList.remove("is-active");
    fpOtpBoxes[0].focus();

    startResendCountdown();
    return true;
  } catch (error) {
    // Real error (backend not running, network issue) - deliberately
    // NOT faked here, since faking OTP delivery would defeat the point
    // of connecting this to a real backend in the first place.
    console.log("Could not reach the server.", error);
    if (isResend) {
      alert("Could not reach the server. Please try again in a moment.");
    } else {
      fpEmailError.textContent = "Could not reach the server. Please try again in a moment.";
      fpEmailError.classList.add("is-active");
    }
    return false;
  }
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
  requestOtp(currentResetEmail, /* isResend */ true);
});

fpResendBtnError.addEventListener("click", () => {
  requestOtp(currentResetEmail, /* isResend */ true);
});

fpGoBackChangeEmail.addEventListener("click", (e) => {
  e.preventDefault();
  goToStep(1);
});

// ------------------------------------------------------------------
// BACKEND CONTRACT - POST /forgot-password/verify-otp
// Request:  { "email": "...", "otp": "123456" }
// Response success: { "success": true }
// Response failure: { "success": false, "message": "Invalid or expired OTP." }
// ------------------------------------------------------------------
fpVerifyOtpBtn.addEventListener("click", async () => {
  const enteredOTP = Array.from(fpOtpBoxes).map((box) => box.value).join("");
  if (enteredOTP.length < 6) return; // incomplete, don't submit yet

  try {
    const response = await fetch("/forgot-password/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: currentResetEmail, otp: enteredOTP }),
    });
    const result = await response.json();

    if (result.success) {
      verifiedOtp = enteredOTP;
      goToStep(3);
    } else {
      showIncorrectOtpState();
    }
  } catch (error) {
    console.log("Could not reach the server.", error);
    alert("Could not reach the server. Please try again in a moment.");
  }
});

function showIncorrectOtpState() {
  // Mask entered digits as dots, highlight the boxes red, and swap the
  // footer to the error version (matches the "Incorrect OTP" mockup).
  fpOtpBoxes.forEach((box) => {
    box.type = "password";
    box.classList.add("is-invalid");
  });
  fpOtpNormalBlock.classList.remove("is-active");
  fpOtpErrorBlock.classList.add("is-active");
  clearInterval(resendTimerId);
}

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

// ------------------------------------------------------------------
// BACKEND CONTRACT - POST /forgot-password/reset
// Request:  { "email": "...", "otp": "123456", "newPassword": "..." }
//           (otp is sent again here on purpose - the backend should
//           re-check it's still valid/not expired, not just trust that
//           step 2 already passed)
// Response success: { "success": true }
// Response failure: { "success": false, "message": "..." }
// ------------------------------------------------------------------
fpResetPasswordBtn.addEventListener("click", async () => {
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

  try {
    const response = await fetch("/forgot-password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: currentResetEmail,
        otp: verifiedOtp,
        newPassword: fpNewPassword.value,
      }),
    });
    const result = await response.json();

    if (result.success) {
      goToStep(4);
    } else {
      alert(result.message || "Could not reset your password. Please start over.");
      goToStep(1);
    }
  } catch (error) {
    console.log("Could not reach the server.", error);
    alert("Could not reach the server. Please try again in a moment.");
  }
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
