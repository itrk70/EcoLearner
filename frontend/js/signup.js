/* ==========================================================================
   SIGNUP.JS
   Handles: showing/hiding both password fields, checking the password
   meets the rules AND that the two password fields match, the creative
   "go back" link, and (for now) preventing the form from actually
   submitting anywhere, since there's no backend yet.
   ========================================================================== */

const passwordInput = document.getElementById("passwordInput");
const confirmPasswordInput = document.getElementById("confirmPasswordInput");
const togglePasswordBtn = document.getElementById("togglePassword");
const toggleConfirmPasswordBtn = document.getElementById("toggleConfirmPassword");
const passwordHint = document.getElementById("passwordHint");
const signupForm = document.getElementById("signupForm");
const exploreBackLink = document.getElementById("exploreBackLink");

const defaultHintText = passwordHint ? passwordHint.textContent : "";

/* --------------------------------------------------------------------------
   Generic show/hide toggle - reused for both password fields below
   -------------------------------------------------------------------------- */
function setupPasswordToggle(inputEl, buttonEl) {
  if (!inputEl || !buttonEl) return;

  buttonEl.addEventListener("click", () => {
    const isHidden = inputEl.type === "password";
    inputEl.type = isHidden ? "text" : "password";
    buttonEl.style.opacity = isHidden ? "0.6" : "1";
    buttonEl.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
}

setupPasswordToggle(passwordInput, togglePasswordBtn);
setupPasswordToggle(confirmPasswordInput, toggleConfirmPasswordBtn);

/* --------------------------------------------------------------------------
   Password rule checking - same rules as Login: 8-20 characters, with
   at least one uppercase, one lowercase, one number, one special character.
   -------------------------------------------------------------------------- */
function isPasswordValid(password) {
  const lengthOk = password.length >= 8 && password.length <= 20;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);

  return lengthOk && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

/* --------------------------------------------------------------------------
   Form submission (placeholder until Flask backend exists)
   -------------------------------------------------------------------------- */
if (signupForm) {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!isPasswordValid(passwordInput.value)) {
      passwordHint.textContent =
        "Password must be 8-20 characters and include uppercase, lowercase, a number, and a special character.";
      passwordHint.classList.add("is-error");
      passwordInput.focus();
      return;
    }

    if (passwordInput.value !== confirmPasswordInput.value) {
      passwordHint.textContent = "Passwords do not match.";
      passwordHint.classList.add("is-error");
      confirmPasswordInput.focus();
      return;
    }

    // Password passed both checks - reset the hint back to normal
    passwordHint.textContent = defaultHintText;
    passwordHint.classList.remove("is-error");

    // TODO: Replace this with a real fetch() call once the Flask backend
    // has a /signup route, e.g.:
    //
    // const response = await fetch("/signup", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ fullName, username, email, password })
    // });

    console.log("Signup form submitted (not yet connected to a backend).");
  });
}

/* --------------------------------------------------------------------------
   "Go back" link - same behavior as Login: returns to whichever page the
   user actually came from, using the browser's own history.
   -------------------------------------------------------------------------- */
if (exploreBackLink) {
  exploreBackLink.addEventListener("click", (event) => {
    event.preventDefault();
    window.history.back();
  });
}
