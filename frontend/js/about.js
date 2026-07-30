/* ==========================================================================
   ABOUT.JS
   This page is intentionally almost JS-free - the fade-in/slide-up
   animations are handled entirely in about.css since they only need to
   run once on page load. The only real behavior needed here is the
   back button.
   ========================================================================== */

const aboutBackBtn = document.getElementById("aboutBackBtn");

if (aboutBackBtn) {
  aboutBackBtn.addEventListener("click", () => {
    window.history.back();
  });
}
