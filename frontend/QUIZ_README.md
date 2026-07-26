# Quiz Window Component — README

This is a **reusable component**, not a standalone page. It shows one question
at a time with 4 options, a Submit → reveal → Next flow, a hint mechanic, a
score screen, and a level-up celebration — and it can run either as a **popup**
(Daily Quiz) or **full-frame** (Lesson Quiz) using the exact same code.

Read this before touching `quiz.html`, `quiz.css`, or `quiz.js` — it'll save
you from re-discovering things we already decided.

---

## 1. Files

| File | What it does |
|---|---|
| `html/quiz.html` | Contains the reusable component markup + a demo control panel (demo panel is NOT part of the component - see below) |
| `css/quiz.css` | All styling, including the theme system and popup/full-frame modes |
| `js/quiz.js` | All behavior: rendering questions, scoring, hints, shuffling, leveling |
| `css/global.css` | Shared design tokens (colors, spacing, fonts) used by every page, including this one |

---

## 2. Testing it standalone (what exists today)

Open `html/quiz.html` directly in a browser. You'll see 6 demo buttons
(3 themes × 2 modes). These buttons **only exist on this test page** — they
call `openQuiz(mode, theme)` for you so you can try every combination without
writing code.

**These demo buttons are NOT part of the component.** Don't copy them into a
real page.

---

## 3. How to actually use this on a real page (Home, a Lesson page, etc.)

### Step 1 — Copy the component markup
In `quiz.html`, copy everything from:
```html
<div class="quiz-overlay" id="quizOverlay"></div>
```
down through the comment:
```html
<!-- END REUSABLE COMPONENT -->
```
This includes the overlay, the quiz window itself, AND the level-up modal —
all three need to come together.

Paste that block into the real page's HTML (once, near the end of `<body>`).

### Step 2 — Link the CSS and JS
In that page's `<head>` / before `</body>`, make sure you have:
```html
<link rel="stylesheet" href="../css/global.css" />
<link rel="stylesheet" href="../css/quiz.css" />
...
<script src="../js/quiz.js"></script>
```
(Adjust the `../` path depending on where that page actually sits.)

### Step 3 — Call `openQuiz()` from a real button on that page
```js
openQuiz(mode, theme, questions);
```

- **mode**: `"popup"` or `"fullframe"`
- **theme**: `"environmental"`, `"forest"`, or `"ocean"` (add more later, see Section 5)
- **questions**: *optional* — an array of question objects (see Section 4). If
  you leave this out, it falls back to 5 generic test questions.

**Example — Daily Quiz button on the Home page:**
```html
<button onclick="openQuiz('popup', 'environmental')">Start Daily Quiz</button>
```

**Example — Lesson Quiz button on a Forest lesson page:**
```html
<button onclick="openQuiz('fullframe', 'forest', forestLessonQuestions)">
  Start Quiz
</button>
```
(where `forestLessonQuestions` is a real array defined on that page, or loaded
from the backend later)

### Important: the user never picks the theme or topic themselves
The theme/topic is decided by **which page/button the user already clicked**,
never by a choice inside the quiz. A Forest lesson page always opens the quiz
with `"forest"`. The Daily Quiz button always opens it with `"environmental"`.
Don't add a theme-picker UI inside the quiz itself.

---

## 4. Question data format

```js
const exampleQuestions = [
  {
    topic: "Forest Ecosystems",       // shown as the pill above the question
    question: "What is the main producer in a forest ecosystem?",
    image: "../assets/images/topics/ecosystems.svg", // OPTIONAL - omit entirely for no image
    options: [
      { text: "Deer", correct: false },
      { text: "Trees", correct: true },
      { text: "Wolves", correct: false },
      { text: "Fungi", correct: false },
    ],
    hint: "Producers make their own food using sunlight.",
    xp: 20,                            // XP awarded if answered correctly
  },
  // ...more questions
];
```

**Notes:**
- `image` is optional. If omitted, no gap is left where it would've been.
- Options do NOT need a fixed letter (A/B/C/D) — letters are assigned
  automatically based on display order, since options and questions are
  **shuffled randomly every time `openQuiz()` runs** (a real Fisher-Yates
  shuffle, not a biased sort trick). Just mark exactly one option per
  question as `correct: true`.

---

## 5. Themes

Each theme is a CSS class on `.quiz-window` (`theme-environmental`,
`theme-forest`, `theme-ocean`) that sets a background image + a small color
palette, defined in `quiz.css` near the bottom.

**To add a new theme** (e.g. a "Desert" unit later):
1. Add a background image to `assets/images/quiz-backgrounds/`
2. Copy one of the existing theme blocks in `quiz.css` and change the values:
   ```css
   .quiz-window.theme-desert {
     --quiz-bg-image: url('../assets/images/quiz-backgrounds/desert-bg.png');
     --quiz-color-primary: #...;
     --quiz-color-primary-dark: #...;
     --quiz-color-primary-light: #...;
     --quiz-color-pale: #...;
   }
   ```
3. Call `openQuiz(mode, "desert", questions)` — done, no other changes needed.

---

## 6. Known limitations / things that still need backend work

These are **intentional placeholders**, not bugs — flagging them so nobody
re-discovers them mid-integration:

- **Coins, XP, and Level are frontend-only variables** (`userXP`, `userCoins`,
  `userLevel` at the top of `quiz.js`). They reset every time the page
  reloads. Once Flask + SQLite exist, these need to be replaced with real
  data fetched from the logged-in user's account, and every change (XP gain,
  coin spend) needs to be sent to the backend to actually persist.
- **The hint's coin check is NOT secure.** Right now it's a plain `if` check
  in browser JS — a user could bypass it via DevTools. The real, tamper-proof
  check must happen server-side when the backend exists.
- **Level thresholds are placeholders** (`levelThresholds` array in
  `quiz.js`). Real values need to come from the team once lesson/quiz volume
  is finalized.
- **The Google/Microsoft-style "who is logged in" question doesn't apply
  here**, but similarly: nothing in this component currently checks whether
  a real user is logged in at all. That's a Navbar/session concern, not this
  component's.

---

## 7. Quick sanity checklist after copying this into a new page

- [ ] `global.css` and `quiz.css` both linked
- [ ] `quiz.js` linked at the end of `<body>`
- [ ] Copied the overlay + quiz-window + level-up modal (all 3 pieces)
- [ ] Did NOT copy the demo control buttons
- [ ] Real button calls `openQuiz(mode, theme, questions)` with the correct,
      hardcoded mode/theme for that page — no user-facing theme picker
- [ ] If using real questions, they match the shape in Section 4
