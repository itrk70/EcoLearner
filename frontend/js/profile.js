/* ==========================================================================
   PROFILE.JS
   Renders the profile banner (level, title, XP bar), stats cards,
   achievements, recent activity, and the random typing-animation banner.

   Uses getLevelForXP() / getLevelTitle() / getXPProgress() from
   levels.js - make sure that file is linked BEFORE this one in profile.html.
   ========================================================================== */

/* --------------------------------------------------------------------------
   PLACEHOLDER USER DATA
   Stands in for a real logged-in user's data until the backend exists.
   Deliberately matches the "brand new user" starting values used on the
   Quiz page (Level 0, 0 XP, 100 coins) so the whole app is consistent
   about what a fresh account looks like.
   -------------------------------------------------------------------------- */
const currentUser = {
  name: "Aarav",
  country: "India",
  countryFlagEmoji: "🇮🇳",
  xp: 0,
  coins: 100,
  badgeCount: 0,
  quizCount: 0,
  streakDays: 0,
};

/* --------------------------------------------------------------------------
   ACHIEVEMENTS (max 4 shown on this page - "View All" leads to the full list)
   Each one calculates its own progress from currentUser's real stats,
   so as those numbers grow (once connected to a backend), this updates
   automatically - nothing here needs to change later.
   -------------------------------------------------------------------------- */
const achievements = [
  {
    icon: "../assets/icons/badges/badge-eco-warrior.svg",
    title: "Nature Saver",
    subtitle: "Complete 5 lessons",
    current: 0, // TODO: replace with real "lessons completed" count once tracked
    target: 5,
  },
  {
    icon: "../assets/icons/badges/badge-quiz-master.svg",
    title: "Quiz Master",
    subtitle: "Score 100% in 10 quizzes",
    current: 0, // TODO: replace with real "perfect quiz" count once tracked
    target: 10,
  },
  {
    icon: "../assets/icons/badges/badge-streak.svg",
    title: "Green Warrior",
    subtitle: "Maintain a 7-day streak",
    current: currentUser.streakDays,
    target: 7,
  },
  {
    icon: "../assets/icons/ui/badge.svg",
    title: "Planet Protector",
    subtitle: "Earn 1000 XP",
    current: currentUser.xp,
    target: 1000,
  },
];

/* --------------------------------------------------------------------------
   RECENT ACTIVITY (max 4 shown)
   Empty for a brand new user - real entries get pushed into this array
   once lessons/quizzes/badges are actually happening. The empty-state
   message below only shows when this array is empty.
   -------------------------------------------------------------------------- */
const recentActivity = [
  // Example shape for later:
  // { icon: "../assets/icons/ui/badge.svg", title: "Earned new badge", subtitle: "Nature Lover", time: "1d ago" }
];

/* --------------------------------------------------------------------------
   BOTTOM BANNER MESSAGES - one random pair shown (with a typing effect)
   every time the page loads.
   -------------------------------------------------------------------------- */
const bannerMessages = [
  { heading: "Keep learning, keep protecting!", subheading: "Every small step leads to a greener tomorrow." },
  { heading: "Learn. Grow. Protect.", subheading: "Every lesson helps build a sustainable future." },
  { heading: "Together for a Greener Earth", subheading: "Together for a Greener Earth" },
  { heading: "Every Lesson Matters", subheading: "Keep exploring and make a positive impact." },
  { heading: "Small Actions, Big Impact", subheading: "Your eco journey begins with learning." },
];

/* --------------------------------------------------------------------------
   RENDER: BANNER (avatar area, level, title, XP bar, country)
   -------------------------------------------------------------------------- */
function renderBanner() {
  document.getElementById("profileName").textContent = currentUser.name;
  document.getElementById("profileTitle").textContent = getLevelTitle(getLevelForXP(currentUser.xp));
  document.getElementById("profileCountry").textContent =
    `${currentUser.countryFlagEmoji} ${currentUser.country}`;

  const level = getLevelForXP(currentUser.xp);
  document.getElementById("profileLevelValue").textContent = level;

  const progress = getXPProgress(currentUser.xp);
  document.getElementById("profileXpText").textContent =
    `${progress.xpIntoLevel} / ${progress.xpNeededForLevel} XP`;
  document.getElementById("profileXpBarFill").style.width = `${progress.percent}%`;

  // Level 0 = no badge earned yet, show the empty dashed placeholder instead
  const badgeSlot = document.getElementById("profileLatestBadge");
  if (level === 0) {
    badgeSlot.classList.add("profile-latest-badge--empty");
    badgeSlot.innerHTML = "";
  } else {
    badgeSlot.classList.remove("profile-latest-badge--empty");
    // TODO: once real badge data exists, swap this for the user's actual
    // most-recently-earned badge icon instead of this generic one.
    badgeSlot.innerHTML = '<img src="../assets/icons/ui/badge.svg" alt="" class="icon" />';
  }
}

/* --------------------------------------------------------------------------
   RENDER: TOP-RIGHT COIN COUNT
   -------------------------------------------------------------------------- */
function renderCoinPill() {
  document.getElementById("profileCoinValue").textContent = currentUser.coins;
}

/* --------------------------------------------------------------------------
   RENDER: STATS GRID
   -------------------------------------------------------------------------- */
function renderStats() {
  document.getElementById("statCoins").textContent = currentUser.coins;
  document.getElementById("statBadges").textContent = currentUser.badgeCount;
  document.getElementById("statQuizzes").textContent = currentUser.quizCount;
  document.getElementById("statStreak").textContent = currentUser.streakDays;
}

/* --------------------------------------------------------------------------
   RENDER: ACHIEVEMENTS LIST
   -------------------------------------------------------------------------- */
function renderAchievements() {
  const list = document.getElementById("achievementsList");
  list.innerHTML = "";

  achievements.slice(0, 4).forEach((item) => {
    const isComplete = item.current >= item.target;
    const row = document.createElement("div");
    row.className = "achievement-row";
    row.innerHTML = `
      <div class="achievement-row__icon">
        <img src="${item.icon}" alt="" class="icon" />
      </div>
      <div class="achievement-row__text">
        <div class="achievement-row__title">${item.title}</div>
        <div class="achievement-row__subtitle">${item.subtitle}</div>
      </div>
      <div class="achievement-row__progress ${isComplete ? "is-complete" : ""}">
        ${isComplete
          ? '<img src="../assets/icons/ui/checkmark.svg" alt="" class="icon icon-white" />'
          : `${Math.min(item.current, item.target)}/${item.target}`}
      </div>
    `;
    list.appendChild(row);
  });
}

/* --------------------------------------------------------------------------
   RENDER: RECENT ACTIVITY LIST (or empty state)
   -------------------------------------------------------------------------- */
function renderRecentActivity() {
  const list = document.getElementById("activityList");
  list.innerHTML = "";

  if (recentActivity.length === 0) {
    list.innerHTML = `
      <div class="profile-empty-state">
        <img src="../assets/icons/ui/leaf.svg" alt="" class="icon" />
        <p>No activity yet - complete a lesson or quiz to see it show up here!</p>
      </div>
    `;
    return;
  }

  recentActivity.slice(0, 4).forEach((item) => {
    const row = document.createElement("div");
    row.className = "activity-row";
    row.innerHTML = `
      <div class="activity-row__icon">
        <img src="${item.icon}" alt="" class="icon" />
      </div>
      <div class="activity-row__text">
        <div class="activity-row__title">${item.title}</div>
        <div class="activity-row__subtitle">${item.subtitle}</div>
      </div>
      <div class="activity-row__time">${item.time}</div>
    `;
    list.appendChild(row);
  });
}

/* --------------------------------------------------------------------------
   BOTTOM BANNER - random message + simple typewriter effect
   -------------------------------------------------------------------------- */
function typeText(element, text, speedMs, onDone) {
  element.textContent = "";
  element.classList.add("typing-cursor");
  let i = 0;

  const intervalId = setInterval(() => {
    element.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(intervalId);
      element.classList.remove("typing-cursor");
      if (onDone) onDone();
    }
  }, speedMs);
}

function renderBottomBanner() {
  const message = bannerMessages[Math.floor(Math.random() * bannerMessages.length)];
  const headingEl = document.getElementById("bottomBannerHeading");
  const subheadingEl = document.getElementById("bottomBannerSubheading");

  typeText(headingEl, message.heading, 45, () => {
    typeText(subheadingEl, message.subheading, 30);
  });
}

/* --------------------------------------------------------------------------
   BACK BUTTON - returns to whichever page the user actually came from
   -------------------------------------------------------------------------- */
document.getElementById("profileBackBtn").addEventListener("click", () => {
  window.history.back();
});

/* --------------------------------------------------------------------------
   NOTIFICATION BUTTON - placeholder only for now (popup built later)
   -------------------------------------------------------------------------- */
document.getElementById("profileNotifBtn").addEventListener("click", () => {
  // TODO: open the notifications popup once that component is built
  console.log("Notification button clicked - popup not built yet.");
});

/* --------------------------------------------------------------------------
   AVATAR EDIT BUTTON - placeholder only for now (avatar-picker popup
   built later). This just proves the button itself is wired up and
   clickable - the actual picker UI is a separate future component.
   -------------------------------------------------------------------------- */
document.getElementById("editAvatarBtn").addEventListener("click", () => {
  // TODO: open the avatar-selection popup once that component is built
  console.log("Avatar edit button clicked - avatar picker not built yet.");
});

/* --------------------------------------------------------------------------
   RUN EVERYTHING ON PAGE LOAD
   -------------------------------------------------------------------------- */
renderBanner();
renderCoinPill();
renderStats();
renderAchievements();
renderRecentActivity();
renderBottomBanner();
