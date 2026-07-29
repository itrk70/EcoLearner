/* ==========================================================================
   NOTIFICATIONS.JS
   Handles the notification bell popover: open/close, rendering the list,
   and marking notifications as read (updates the badge count live).
   ========================================================================== */

// ---------- Data (until a Flask API exists) ----------
//
// This page represents a user's profile RIGHT AFTER they finish signing
// up - so there is exactly one notification: the automatic welcome
// message every new account gets. That's not a frontend design choice,
// it's what the data would actually look like at this point in a real
// user's timeline.
//
// Each object's shape mirrors what a "notifications" table row should
// look like in SQLite (see NOTIFICATIONS_BACKEND_README.md for the
// exact schema). Once the backend exists, this hardcoded array gets
// replaced by something like:
//
//   const notifications = await fetch(`/api/notifications?user_id=${currentUserId}`)
//     .then(res => res.json());
//
// ...and everything below (rendering, badge count, mark-as-read) keeps
// working unchanged, because it only depends on this shape existing -
// not on where the data came from.
let notifications = [
  {
    id: 1,
    userId: null, // will hold the real logged-in user's ID once sessions exist
    type: "welcome", // lets the backend distinguish notification kinds later (welcome, badge, streak, mission, leaderboard...)
    title: "Welcome to EcoLearner! 🌍",
    message: "Your account is ready. Complete your first quiz to start earning XP!",
    time: "Just now",
    isRead: false,
  },
];

// ---------- Element references ----------
const notifBtn = document.getElementById("profileNotifBtn");
const notifPopover = document.getElementById("notifPopover");
const notifList = document.getElementById("notifList");
const notifBadge = document.getElementById("notifBadgeCount");
const markAllBtn = document.getElementById("notifMarkAllBtn");

// Only run any of this if the page actually has the notification bell
// (keeps this script safe to include on pages that don't have it yet).
if (notifBtn && notifPopover && notifList) {

  // Maps a notification's "type" to an icon file. Add new entries here
  // as new notification types get introduced (badge, streak, mission...) -
  // rendering code below never needs to change, just this list.
  const notifIcons = {
    welcome: "leaf.svg",
    badge: "badge.svg",
    streak: "streak-fire.svg",
    mission: "quiz-symbol.svg",
    leaderboard: "medal.svg",
  };

  // ---------- Rendering ----------
  // Rebuilds the popover list from the "notifications" array above.
  // Called once on page load, and again any time read/unread state changes.
  function renderNotifications() {
    notifList.innerHTML = ""; // clear old content before redrawing

    if (notifications.length === 0) {
      notifList.innerHTML = `<div class="notif-popover__empty">You're all caught up! No notifications yet.</div>`;
      updateBadge();
      return;
    }

    notifications.forEach((notif) => {
      const item = document.createElement("div");
      item.className = "notif-item" + (notif.isRead ? "" : " is-unread");
      item.dataset.notifId = notif.id;

      const iconFile = notifIcons[notif.type] || "bell.svg";

      item.innerHTML = `
        <div class="notif-item__dot"></div>
        <div class="notif-item__icon">
          <img src="../assets/icons/ui/${iconFile}" alt="" class="icon" />
        </div>
        <div class="notif-item__text">
          <div class="notif-item__title">${notif.title}</div>
          <div class="notif-item__message">${notif.message}</div>
          <div class="notif-item__time">${notif.time}</div>
        </div>
      `;

      // Clicking a single notification marks just that one as read
      item.addEventListener("click", () => markAsRead(notif.id));

      notifList.appendChild(item);
    });

    updateBadge();
  }

  // ---------- Badge count ----------
  // Shows/hides the red badge on the bell icon and keeps its number
  // in sync with however many notifications are still unread.
  function updateBadge() {
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    if (!notifBadge) return;

    if (unreadCount > 0) {
      notifBadge.textContent = unreadCount;
      notifBadge.classList.add("is-active");
    } else {
      notifBadge.classList.remove("is-active");
    }
  }

  // ---------- Mark one as read ----------
  function markAsRead(id) {
    const notif = notifications.find((n) => n.id === id);
    if (notif && !notif.isRead) {
      notif.isRead = true;
      renderNotifications();
      // TODO: once backend exists, also send this update to Flask, e.g.
      // fetch(`/api/notifications/${id}/read`, { method: "POST" });
    }
  }

  // ---------- Mark all as read ----------
  if (markAllBtn) {
    markAllBtn.addEventListener("click", () => {
      notifications.forEach((n) => (n.isRead = true));
      renderNotifications();
    });
  }

  // ---------- Open / close popover ----------
  function openPopover() {
    notifPopover.classList.add("is-active");
  }

  function closePopover() {
    notifPopover.classList.remove("is-active");
  }

  notifBtn.addEventListener("click", (event) => {
    event.stopPropagation(); // stop this click from also triggering the "click outside" listener below
    const isOpen = notifPopover.classList.contains("is-active");
    isOpen ? closePopover() : openPopover();
  });

  // Clicking anywhere outside the popover closes it
  document.addEventListener("click", (event) => {
    const clickedInsidePopover = notifPopover.contains(event.target);
    const clickedButton = notifBtn.contains(event.target);
    if (!clickedInsidePopover && !clickedButton) {
      closePopover();
    }
  });

  // Escape key closes it too
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePopover();
    }
  });

  // ---------- Initial render on page load ----------
  renderNotifications();
}
