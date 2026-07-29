/* ==========================================================================
   AVATAR-MODAL.JS
   Handles the "change avatar" popup opened from the pencil icon on the
   Profile page: shows all avatars this user has available, lets them
   pick one, and only applies it once they hit Save.
   ========================================================================== */

// ---------- Data (until a Flask API exists) ----------
//
// This is every avatar the CURRENT USER has access to - not just the
// 4 pre-given ones. Later, avatars won through Challenges/Rewards get
// added to this same list for that specific user, which is why each
// entry is shaped like a database row (see AVATAR_BACKEND_README.md)
// rather than just being a flat array of filenames.
//
// Once the backend exists, replace this with:
//   const avatars = await fetch(`/api/user/avatars`).then(res => res.json());
// The default avatar should always be sent first by that endpoint (or
// sorted first here) since it must appear in the first grid position.
let avatars = [
  { id: "default", filename: "avatar-default.svg", label: "Boy", isDefault: true },
  { id: "girl", filename: "girl-avatar.svg", label: "Girl", isDefault: false },
  { id: "tiger-boy", filename: "tiger-boy.svg", label: "Tiger Boy", isDefault: false },
  { id: "flamingo-girl", filename: "flamingo-girl.svg", label: "Flamingo Girl", isDefault: false },
];

// The avatar actually applied to the profile right now. On a real
// account this would come from the logged-in user's DB record - for
// now it starts on "default" to match the <img> already in profile.html.
let currentAvatarId = "default";

// The avatar the user has clicked on INSIDE the modal, before saving.
// Starts equal to currentAvatarId every time the modal opens.
let pendingAvatarId = currentAvatarId;

// ---------- Element references ----------
const editAvatarBtn = document.getElementById("editAvatarBtn");
const avatarModalOverlay = document.getElementById("avatarModalOverlay");
const avatarModalClose = document.getElementById("avatarModalClose");
const avatarGrid = document.getElementById("avatarGrid");
const avatarSaveBtn = document.getElementById("avatarSaveBtn");
const profileAvatarImg = document.getElementById("profileAvatarImg");

if (editAvatarBtn && avatarModalOverlay && avatarGrid && avatarSaveBtn) {

  // ---------- Rendering the grid ----------
  function renderAvatarGrid() {
    avatarGrid.innerHTML = "";

    avatars.forEach((avatar) => {
      const isSelected = avatar.id === pendingAvatarId;

      const option = document.createElement("button");
      option.type = "button";
      option.className = "avatar-option" + (isSelected ? " is-selected" : "");
      option.dataset.avatarId = avatar.id;
      option.setAttribute("aria-label", `Select ${avatar.label} avatar`);

      option.innerHTML = `
        <div class="avatar-option__img-wrap">
          <img src="../assets/images/avatars/${avatar.filename}" alt="" class="avatar-option__img" />
          <span class="avatar-option__check">
            <img src="../assets/icons/ui/checkmark.svg" alt="" class="icon" />
          </span>
        </div>
        <span class="avatar-option__label">${avatar.label}</span>
      `;

      option.addEventListener("click", () => selectAvatar(avatar.id));

      avatarGrid.appendChild(option);
    });
  }

  // ---------- Selecting an avatar (not saved yet) ----------
  function selectAvatar(avatarId) {
    pendingAvatarId = avatarId;
    renderAvatarGrid();
    updateSaveButtonState();
  }

  // ---------- Save button gray/green logic ----------
  // Only enabled when the pending pick is actually DIFFERENT from
  // whatever avatar is currently active on the profile.
  function updateSaveButtonState() {
    const hasNewSelection = pendingAvatarId !== currentAvatarId;
    avatarSaveBtn.disabled = !hasNewSelection;
  }

  // ---------- Open / close modal ----------
  function openAvatarModal() {
    pendingAvatarId = currentAvatarId; // reset to current every time it opens
    renderAvatarGrid();
    updateSaveButtonState();
    avatarModalOverlay.classList.add("is-active");
  }

  function closeAvatarModal() {
    avatarModalOverlay.classList.remove("is-active");
  }

  editAvatarBtn.addEventListener("click", openAvatarModal);

  if (avatarModalClose) {
    avatarModalClose.addEventListener("click", closeAvatarModal);
  }

  // NOTE: deliberately NO click-outside-to-close listener here - this
  // modal only closes via the X button or after a successful Save,
  // unlike the notification popover.

  // ---------- Save ----------
  avatarSaveBtn.addEventListener("click", () => {
    if (avatarSaveBtn.disabled) return; // safety check, shouldn't be reachable via click anyway

    currentAvatarId = pendingAvatarId;

    // Update the actual profile picture shown on the page
    const chosen = avatars.find((a) => a.id === currentAvatarId);
    if (chosen && profileAvatarImg) {
      profileAvatarImg.src = `../assets/images/avatars/${chosen.filename}`;
    }

    // TODO: once backend exists, persist the choice, e.g.
    // fetch("/api/user/avatar", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ avatarId: currentAvatarId }),
    // });

    closeAvatarModal();
  });
}
