/* ==========================================================================
   QUIZ.JS
   Drives the reusable Quiz Window: renders questions, handles select ->
   submit -> next, the hint button, skip, progress bar, and the final
   score screen. Works identically whether the window is shown as a
   popup or full-frame - only the CSS classes differ.
   ========================================================================== */

/* --------------------------------------------------------------------------
   DEFAULT TEST DATA
   5 general-knowledge placeholder questions, used automatically if
   openQuiz() is called without a real question set - so this file still
   works standalone for testing. Once real content exists (per lesson,
   or for the Daily Quiz), pass it into openQuiz() instead - see the
   openQuiz() function and the demo buttons at the bottom of this file
   for exactly how.

   NOTE: "image" is OPTIONAL. Leave it out entirely (like below) for a
   text-only question, or add "image: '../assets/images/topics/forest.svg'"
   to show a picture above the options.

   NOTE: each option now uses "correct: true/false" instead of a fixed
   letter - this is what allows answers to be safely shuffled into a
   random order every time (the correct one is tracked by content, not
   by position).
   -------------------------------------------------------------------------- */
const defaultQuizData = [
  {
    topic: "General Knowledge",
    question: "What is the capital of France?",
    options: [
      { text: "Berlin", correct: false },
      { text: "Madrid", correct: false },
      { text: "Paris", correct: true },
      { text: "Rome", correct: false },
    ],
    hint: "It's famous for the Eiffel Tower.",
    xp: 20,
  },
  {
    topic: "General Knowledge",
    question: "Which planet is known as the Red Planet?",
    options: [
      { text: "Earth", correct: false },
      { text: "Mars", correct: true },
      { text: "Jupiter", correct: false },
      { text: "Venus", correct: false },
    ],
    hint: "Named after the Roman god of war.",
    xp: 20,
  },
  {
    topic: "General Knowledge",
    question: "How many continents are there on Earth?",
    options: [
      { text: "5", correct: false },
      { text: "6", correct: false },
      { text: "7", correct: true },
      { text: "8", correct: false },
    ],
    hint: "Asia, Africa, North America, South America, Antarctica, Europe...",
    xp: 20,
  },
  {
    topic: "General Knowledge",
    question: "What is the largest ocean on Earth?",
    options: [
      { text: "Atlantic Ocean", correct: false },
      { text: "Indian Ocean", correct: false },
      { text: "Arctic Ocean", correct: false },
      { text: "Pacific Ocean", correct: true },
    ],
    hint: "It touches Asia, Australia, and the Americas.",
    xp: 20,
  },
  {
    topic: "General Knowledge",
    question: "Which gas do plants absorb from the atmosphere?",
    options: [
      { text: "Oxygen", correct: false },
      { text: "Carbon Dioxide", correct: true },
      { text: "Nitrogen", correct: false },
      { text: "Hydrogen", correct: false },
    ],
    hint: "Plants release oxygen and absorb the opposite of that.",
    xp: 20,
  },
];

const HINT_COST = 20;
const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"]; // supports up to 6 options per question

/* --------------------------------------------------------------------------
   SHUFFLING
   A proper Fisher-Yates shuffle - gives a genuinely random order every
   time, unlike naive approaches (like sorting by Math.random()) which
   can be biased. Never modifies the original array - always returns a
   new shuffled copy, so the source data (defaultQuizData, or whatever
   a lesson page passes in) is never altered.
   -------------------------------------------------------------------------- */
function shuffleArray(originalArray) {
  const array = originalArray.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/* --------------------------------------------------------------------------
   LEVEL SYSTEM
   Each number is the TOTAL cumulative XP needed to REACH that level.
   e.g. levelThresholds[1] = 100 means: once total XP hits 100, user is Level 1.
   TODO: these numbers are placeholders - the real values will be decided
   later by the team once the full lesson/quiz content is finalized.
   -------------------------------------------------------------------------- */
const levelThresholds = [0, 100, 500, 1200, 2200, 3500, 5200, 7200, 9500, 12200];

// Works out what level a given amount of total XP corresponds to.
function getLevelForXP(xp) {
  let level = 0;
  for (let i = 0; i < levelThresholds.length; i++) {
    if (xp >= levelThresholds[i]) {
      level = i;
    }
  }
  return level;
}

/* --------------------------------------------------------------------------
   STATE
   These placeholder numbers stand in for real account data (which will
   come from Flask + SQLite later). Everything here is just so the UI
   has something to react to and update on screen.
   -------------------------------------------------------------------------- */
let quizData = []; // filled in fresh (shuffled) each time openQuiz() runs
let currentIndex = 0;
let currentCorrectLetter = null; // which letter (A/B/C...) is correct for the CURRENT question, after shuffling
let selectedOptionId = null;
let hasSubmitted = false;
let hintUsedThisQuestion = false;
let correctCount = 0;
let xpEarned = 0;

// Placeholder "account" values - stand-ins until real login/XP/coins exist
let userXP = 0;
let userLevel = 0;
let userCoins = 100;

/* --------------------------------------------------------------------------
   DOM REFERENCES
   -------------------------------------------------------------------------- */
const quizOverlay = document.getElementById("quizOverlay");
const quizWindow = document.getElementById("quizWindow");
const quizCloseBtn = document.getElementById("quizCloseBtn");

const xpValueEl = document.getElementById("xpValue");
const levelValueEl = document.getElementById("levelValue");
const coinsValueEl = document.getElementById("coinsValue");

const skipButton = document.getElementById("skipButton");
const progressFill = document.getElementById("progressFill");
const questionCounter = document.getElementById("questionCounter");
const rewardXP = document.getElementById("rewardXP");

const topicTag = document.getElementById("topicTag");
const questionText = document.getElementById("questionText");
const questionImage = document.getElementById("questionImage");
const optionsList = document.getElementById("optionsList");

const submitButton = document.getElementById("submitButton");

const hintText = document.getElementById("hintText");
const hintButton = document.getElementById("hintButton");

const quizCardSection = document.getElementById("quizCardSection");
const quizScore = document.getElementById("quizScore");
const finalScoreEl = document.getElementById("finalScore");
const finalXPEl = document.getElementById("finalXP");
const scoreCloseBtn = document.getElementById("scoreCloseBtn");

const levelUpOverlay = document.getElementById("levelUpOverlay");
const levelUpNumber = document.getElementById("levelUpNumber");
const levelUpCloseBtn = document.getElementById("levelUpCloseBtn");

/* --------------------------------------------------------------------------
   OPENING / CLOSING THE QUIZ WINDOW
   -------------------------------------------------------------------------- */

// mode = "popup" or "fullframe"
// theme = "environmental" | "forest" | "ocean"
// questions = OPTIONAL - an array of question objects (same shape as
//             defaultQuizData above). If left out, the built-in test
//             questions are used instead.
//
// Example for a real lesson page:
//   openQuiz("fullframe", "forest", forestLessonQuestions);
// Example for the Daily Quiz on Home (no custom questions needed yet):
//   openQuiz("popup", "environmental");
function openQuiz(mode, theme, questions) {
  // Reset any leftover theme/mode classes from a previous open, then apply the new ones
  quizWindow.className = "quiz-window is-active mode-" + mode + " theme-" + theme;

  if (mode === "popup") {
    quizOverlay.classList.add("is-active");
  }

  const sourceQuestions = questions && questions.length ? questions : defaultQuizData;

  // Shuffle the QUESTION order, and separately shuffle each question's
  // OPTION order - both freshly randomized every time the quiz opens.
  quizData = shuffleArray(sourceQuestions).map((question) => ({
    ...question,
    options: shuffleArray(question.options),
  }));

  resetQuizState();
  renderQuestion(0);
}

function closeQuiz() {
  quizWindow.classList.remove("is-active");
  quizOverlay.classList.remove("is-active");
}

if (quizCloseBtn) quizCloseBtn.addEventListener("click", closeQuiz);
if (scoreCloseBtn) scoreCloseBtn.addEventListener("click", closeQuiz);
if (quizOverlay) quizOverlay.addEventListener("click", closeQuiz);

/* --------------------------------------------------------------------------
   RESETTING STATE (so re-opening the quiz starts fresh)
   -------------------------------------------------------------------------- */
function resetQuizState() {
  currentIndex = 0;
  correctCount = 0;
  xpEarned = 0;
  quizCardSection.style.display = "";
  submitButton.style.display = "";
  quizScore.classList.remove("is-active");
  updateHeaderStats();
}

/* --------------------------------------------------------------------------
   RENDERING A QUESTION
   -------------------------------------------------------------------------- */
function renderQuestion(index) {
  const question = quizData[index];

  selectedOptionId = null;
  hasSubmitted = false;
  hintUsedThisQuestion = false;
  currentCorrectLetter = null;

  // Topic + progress row
  topicTag.textContent = question.topic;
  questionCounter.textContent = `Question ${index + 1}/${quizData.length}`;
  progressFill.style.width = `${(index / quizData.length) * 100}%`;
  rewardXP.textContent = `+${question.xp} XP`;

  // Question text
  questionText.textContent = question.question;

  // Image is OPTIONAL - only show the <img> (and its spacing) if this
  // question actually has one, so text-only questions leave no gap.
  if (question.image) {
    questionImage.src = question.image;
    questionImage.style.display = "block";
  } else {
    questionImage.style.display = "none";
  }

  // Hint text starts hidden - a placeholder message shows until the
  // user actually pays for it (matches the "locked hint" behavior).
  hintText.textContent = "Use a hint to reveal a clue for this question.";
  hintButton.classList.remove("is-disabled");
  hintButton.innerHTML =
    'Use Hint <img src="../assets/icons/ui/coin.svg" alt="" class="icon" /> <span>' +
    HINT_COST +
    "</span>";

  // Build the option buttons fresh each time (so old selected/correct/
  // wrong states never leak into the next question). Options were already
  // shuffled once in openQuiz() - here we just assign letters A, B, C...
  // based on their (already-random) position, and remember which letter
  // ended up being the correct one.
  optionsList.innerHTML = "";
  question.options.forEach((option, i) => {
    const letter = OPTION_LETTERS[i];
    if (option.correct) {
      currentCorrectLetter = letter;
    }

    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.dataset.optionId = letter;
    btn.innerHTML = `
      <span class="quiz-option__letter">${letter}</span>
      <span class="quiz-option__text">${option.text}</span>
      <img src="../assets/icons/ui/checkmark.svg" alt="" class="icon quiz-option__check" style="visibility:hidden;" />
    `;
    btn.addEventListener("click", () => selectOption(letter));
    optionsList.appendChild(btn);
  });

  // Submit button resets to its disabled "pick an answer first" state
  submitButton.textContent = "Submit";
  submitButton.disabled = true;
}

/* --------------------------------------------------------------------------
   SELECTING AN OPTION (before submitting)
   -------------------------------------------------------------------------- */
function selectOption(optionId) {
  if (hasSubmitted) return; // locked in already, no changing the answer

  selectedOptionId = optionId;
  submitButton.disabled = false;

  // Visually mark only the clicked option as selected
  document.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.classList.toggle("is-selected", btn.dataset.optionId === optionId);
  });
}

/* --------------------------------------------------------------------------
   SUBMIT / NEXT BUTTON
   Before submitting: locks in the answer and reveals correct/wrong.
   After submitting: the SAME button becomes "Next" and advances.
   -------------------------------------------------------------------------- */
submitButton.addEventListener("click", () => {
  if (!hasSubmitted) {
    submitAnswer();
  } else {
    goToNextQuestion();
  }
});

function submitAnswer() {
  hasSubmitted = true;
  const question = quizData[currentIndex];
  const isCorrect = selectedOptionId === currentCorrectLetter;

  // Reveal correct/wrong coloring and lock all options from further clicks
  document.querySelectorAll(".quiz-option").forEach((btn) => {
    btn.disabled = true;
    const checkIcon = btn.querySelector(".quiz-option__check");

    if (btn.dataset.optionId === currentCorrectLetter) {
      btn.classList.add("is-correct");
      checkIcon.style.visibility = "visible";
    } else if (btn.dataset.optionId === selectedOptionId) {
      btn.classList.add("is-wrong");
    }
  });

  if (isCorrect) {
    correctCount++;
    xpEarned += question.xp;
    userXP += question.xp;
    checkForLevelUp();
    updateHeaderStats();
  }

  submitButton.textContent =
    currentIndex === quizData.length - 1 ? "See Results" : "Next \u2192";
}

function goToNextQuestion() {
  const nextIndex = currentIndex + 1;
  if (nextIndex >= quizData.length) {
    showScoreScreen();
  } else {
    currentIndex = nextIndex;
    renderQuestion(currentIndex);
  }
}

/* --------------------------------------------------------------------------
   SKIP BUTTON - moves on without answering, no XP awarded
   -------------------------------------------------------------------------- */
if (skipButton) {
  skipButton.addEventListener("click", () => {
    if (hasSubmitted) return; // already answered, skip no longer makes sense
    goToNextQuestion();
  });
}

/* --------------------------------------------------------------------------
   HINT BUTTON
   IMPORTANT: this is a FRONTEND-ONLY simulation. The real coin balance
   and the actual deduction must happen on the backend (Flask + SQLite)
   so it can't be tampered with from the browser. This just demonstrates
   the intended behavior: locked -> costs coins -> reveals hint -> disabled.
   -------------------------------------------------------------------------- */
if (hintButton) {
  hintButton.addEventListener("click", () => {
    if (hintUsedThisQuestion || hasSubmitted) return;

    if (userCoins < HINT_COST) {
      // Not enough coins - the real check will live on the backend later
      alert("Not enough coins to use a hint!");
      return;
    }

    userCoins -= HINT_COST;
    hintUsedThisQuestion = true;
    updateHeaderStats();

    const question = quizData[currentIndex];
    hintText.textContent = question.hint;

    hintButton.classList.add("is-disabled");
    hintButton.innerHTML =
      '<img src="../assets/icons/ui/lightbulb.svg" alt="" class="icon" /> Hint Used';
  });
}

/* --------------------------------------------------------------------------
   SCORE SCREEN
   -------------------------------------------------------------------------- */
function showScoreScreen() {
  quizCardSection.style.display = "none";
  submitButton.style.display = "none";

  finalScoreEl.textContent = `${correctCount}/${quizData.length}`;
  finalXPEl.textContent = xpEarned;

  quizScore.classList.add("is-active");
}

/* --------------------------------------------------------------------------
   LEVEL-UP CHECK
   Compares the level BEFORE this XP gain to the level AFTER it. If they're
   different, the user just crossed into a new level, so we show the
   celebration modal.
   -------------------------------------------------------------------------- */
function checkForLevelUp() {
  const previousLevel = userLevel;
  const newLevel = getLevelForXP(userXP);

  if (newLevel > previousLevel) {
    userLevel = newLevel;
    showLevelUpModal(newLevel);
  }
}

function showLevelUpModal(level) {
  levelUpNumber.textContent = level;
  levelUpOverlay.classList.add("is-active");
}

function closeLevelUpModal() {
  levelUpOverlay.classList.remove("is-active");
}

if (levelUpCloseBtn) levelUpCloseBtn.addEventListener("click", closeLevelUpModal);
if (levelUpOverlay) {
  levelUpOverlay.addEventListener("click", (event) => {
    // Only close if the dark backdrop itself was clicked, not the card inside it
    if (event.target === levelUpOverlay) closeLevelUpModal();
  });
}

/* --------------------------------------------------------------------------
   UPDATING THE TOP STATS BAR
   -------------------------------------------------------------------------- */
function updateHeaderStats() {
  xpValueEl.textContent = userXP;
  levelValueEl.textContent = userLevel;
  coinsValueEl.textContent = userCoins;
}

/* --------------------------------------------------------------------------
   DEMO CONTROLS (only relevant on this test page - a real page would call
   openQuiz() directly, e.g. when someone taps "Start Daily Quiz")
   -------------------------------------------------------------------------- */
document.querySelectorAll("[data-open-quiz]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.mode;
    const theme = btn.dataset.theme;
    openQuiz(mode, theme); // no custom questions passed - uses defaultQuizData
  });
});
