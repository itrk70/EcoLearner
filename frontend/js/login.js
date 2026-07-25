/* ==========================================================================
   LOGIN.JS
   Handles: showing/hiding the password field, and (for now) preventing
   the form from actually submitting anywhere, since there's no backend yet.
   ========================================================================== */

const passwordInput = document.getElementById("passwordInput");
const togglePasswordBtn = document.getElementById("togglePassword");
const passwordHint = document.getElementById("passwordHint");
const loginForm = document.getElementById("loginForm");
const backLink = document.getElementById("backLink");

// ---------- Back button ----------
// Sends the user back to whichever page they actually came from
// (e.g. About, Home, Quiz...) instead of a hardcoded page like Home.
// This works because the browser already remembers the page the user
// was on right before this one - we're just asking it to go back one step.
if (backLink) {
  backLink.addEventListener("click", (event) => {
    event.preventDefault(); // stop the "#" in the href from jumping the page
    window.history.back();
  });
}

// The original hint text, saved so we can restore it after showing an error
const defaultHintText = passwordHint ? passwordHint.textContent : "";

// ---------- Show/hide password ----------
if (togglePasswordBtn && passwordInput) {
  togglePasswordBtn.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";

    // Switch the input type - this is what actually shows/hides the characters
    passwordInput.type = isHidden ? "text" : "password";

    // Dim the eye icon slightly when the password IS visible,
    // just as a small visual hint that it's in "shown" mode.
    togglePasswordBtn.style.opacity = isHidden ? "0.6" : "1";
    togglePasswordBtn.setAttribute(
      "aria-label",
      isHidden ? "Hide password" : "Show password"
    );
  });
}

// ---------- Password rule checking ----------
// Checks that the password is 8-20 characters AND contains at least
// one uppercase letter, one lowercase letter, one number, and one
// special character. Returns true if it passes, false if it doesn't.
function isPasswordValid(password) {
  const lengthOk = password.length >= 8 && password.length <= 20;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);

  return lengthOk && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
}

// ---------- Form submission (placeholder until Flask backend exists) ----------
if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    // Stops the browser from actually submitting/reloading the page.
    event.preventDefault();

    if (!isPasswordValid(passwordInput.value)) {
      // Show the rule as an error message instead of the normal grey hint
      passwordHint.textContent =
        "Password must be 8-20 characters and include uppercase, lowercase, a number, and a special character.";
      passwordHint.classList.add("is-error");
      passwordInput.focus();
      return; // stop here - don't pretend to log the user in
    }

    // Password passed the check - reset the hint back to normal
    passwordHint.textContent = defaultHintText;
    passwordHint.classList.remove("is-error");

    // TODO: Replace this with a real fetch() call once the Flask backend
    // has a /login route, e.g.:
    //
    // const response = await fetch("/login", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ username, password })
    // });

    console.log("Login form submitted (not yet connected to a backend).");
  });
}
