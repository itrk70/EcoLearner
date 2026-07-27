/* ==========================================================================
   LEVELS.JS
   Shared level-system logic - used by BOTH the Quiz window and the
   Profile page, so these numbers only ever live in ONE place. If you
   change a threshold or a title here, every page automatically agrees.

   To use this on a page: link this file BEFORE quiz.js or profile.js
   in your <script> tags, e.g.:
     <script src="../js/levels.js"></script>
     <script src="../js/profile.js"></script>
   ========================================================================== */

/* Each number is the TOTAL cumulative XP needed to REACH that level.
   e.g. LEVEL_THRESHOLDS[1] = 100 means: once total XP hits 100, user is Level 1.
   TODO: these numbers are placeholders - the real values will be decided
   later by the team once the full lesson/quiz content is finalized. */
const LEVEL_THRESHOLDS = [0, 100, 500, 1200, 2200, 3500, 5200, 7200, 9500, 12200];

/* Every 2 levels get their own title. TODO: add more pairs here as
   higher levels are designed - anything past the last entry below
   currently just repeats "Eco Legend" as a safe fallback. */
const LEVEL_TITLES = [
  { min: 1, max: 2, title: "Eco Beginner" },
  { min: 3, max: 4, title: "Nature Learner" },
  { min: 5, max: 6, title: "Green Guardian" },
  { min: 7, max: 8, title: "Eco Explorer" },
  { min: 9, max: 10, title: "Planet Protector" },
  { min: 11, max: 12, title: "Forest Keeper" },
  { min: 13, max: 14, title: "Ocean Defender" },
  { min: 15, max: 16, title: "Earth Champion" },
  { min: 17, max: 18, title: "Climate Hero" },
  { min: 19, max: 20, title: "Eco Master" },
];

// Works out what level a given amount of total XP corresponds to.
function getLevelForXP(xp) {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
    }
  }
  return level;
}

// Returns the title text for a given level (e.g. 8 -> "Eco Explorer").
// Level 0 is a special case - the user hasn't started yet.
function getLevelTitle(level) {
  if (level === 0) return "Just Getting Started";

  const match = LEVEL_TITLES.find((row) => level >= row.min && level <= row.max);
  return match ? match.title : "Eco Legend"; // fallback for levels beyond the table above
}

// Returns everything needed to draw an XP progress bar:
// how much XP into the CURRENT level, how much is needed for the NEXT
// level, and what percentage that is (0-100).
function getXPProgress(xp) {
  const currentLevel = getLevelForXP(xp);
  const currentLevelFloor = LEVEL_THRESHOLDS[currentLevel] ?? 0;
  const nextLevelCeiling = LEVEL_THRESHOLDS[currentLevel + 1] ?? currentLevelFloor; // stays flat if already at max defined level

  const xpIntoLevel = xp - currentLevelFloor;
  const xpNeededForLevel = nextLevelCeiling - currentLevelFloor;
  const percent = xpNeededForLevel > 0 ? Math.min(100, (xpIntoLevel / xpNeededForLevel) * 100) : 100;

  return {
    level: currentLevel,
    xpIntoLevel,
    xpNeededForLevel,
    nextLevelCeiling,
    percent,
  };
}
