/* ==========================================================================
   NAVBAR.JS
   Handles opening and closing the slide-in side menu.
   ========================================================================== */

// Grab references to the elements we need to control.
// We check "if they exist" before using them, in case this script
// runs on a page that doesn't include the navbar (safe to reuse everywhere).
const menuToggleBtn = document.getElementById("menuToggle");
const menuCloseBtn = document.getElementById("menuClose");
const sideMenu = document.getElementById("sideMenu");
const overlay = document.getElementById("overlay");

// Opens the side menu by adding the "is-active" class,
// which navbar.css uses to slide it into view.
function openMenu() {
  sideMenu.classList.add("is-active");
  overlay.classList.add("is-active");
  document.body.style.overflow = "hidden"; // stop background from scrolling
}

// Closes the side menu by removing the "is-active" class.
function closeMenu() {
  sideMenu.classList.remove("is-active");
  overlay.classList.remove("is-active");
  document.body.style.overflow = ""; // restore normal scrolling
}

// Only attach listeners if the elements are actually present on this page.
if (menuToggleBtn && sideMenu && overlay) {
  menuToggleBtn.addEventListener("click", openMenu);
  menuCloseBtn.addEventListener("click", closeMenu);

  // Clicking the dimmed background also closes the menu.
  overlay.addEventListener("click", closeMenu);

  // Pressing the Escape key closes the menu too (good accessibility practice).
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });
}
