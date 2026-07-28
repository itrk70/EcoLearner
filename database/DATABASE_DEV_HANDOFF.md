# Database Developer — Handoff Guide

This tells you exactly what to download from the repo, and gives you a
ready-to-paste prompt for your own Claude chat. Read the whole thing once
before pasting anything — the prompt references files you need to upload
alongside it.

---

## 1. Files to download from the repo and have ready to upload

You need these files **in your Claude chat**, not just on your computer —
upload them alongside the prompt below so Claude can read the actual field
names/IDs instead of guessing.

| File | Why you need it |
|---|---|
| `frontend/html/signup.html` | Shows the exact fields collected at signup (Full Name, Username, Email, Password) |
| `frontend/js/signup.js` | Shows the EXACT data shape sent to the backend (see the `signupData` object near the bottom) |
| `frontend/js/levels.js` | Shows the XP/Level system your Users table needs to support |
| `frontend/js/profile.js` | Shows every piece of user data the Profile page displays (coins, badges, streak, country, etc.) |
| `frontend/js/quiz.js` | Shows starting values for a new user: 0 XP, 0 Level, 100 Coins |
| `frontend/FORGOT_PASSWORD_BACKEND_README.md` | Explains what OTP-related data needs to be stored temporarily |

---

## 2. What you're actually building

A SQLite database with (at minimum) one `Users` table that can support:
- Signing up and logging in
- Forgot-password OTP verification
- Everything the Profile page displays
- Future Google/Microsoft login (some users won't have a password at all)

---

## 3. The prompt — paste this into your own Claude chat

Copy everything in the box below into a new Claude conversation, then
attach the 6 files listed in Section 1 to that same message.

```
I'm the database developer on a student team building "EcoLearner" - a
gamified environmental education website. We're using Python Flask +
SQLite. I'm a beginner with SQL/SQLite, so please explain things simply
and comment the code well.

I've attached our frontend files so you can see exactly what data we
collect and display. Please read them first.

Your task: design and create our SQLite database for user accounts.

Requirements:
1. Build these tables (all in ONE SQLite file - not separate database
   files, SQLite doesn't handle that well):

   - **Users** - one row per account: full name, username, email,
     password (hashed), XP, coins, streak days, country, avatar,
     google_id (nullable), microsoft_id (nullable)
   - **Badges** - a fixed master list of every badge that can exist
     (name, description, icon path) - this is reference data, not
     per-user data
   - **UserBadges** - links a user to a badge they've earned, plus when
     (one row per user per badge earned)
   - **QuizAttempts** - one row per quiz a user completes: which user,
     topic, score, XP earned, when
   - **RecentActivity** - one row per notable event (badge earned, quiz
     completed, lesson finished) - this is what will power the "Recent
     Activity" list on our Profile page

2. IMPORTANT: Do NOT add "level", "badge_count", or "quiz_count" columns
   to Users. These should be CALCULATED, not stored, so they can never
   go out of sync:
   - Level comes from XP using the thresholds in levels.js (attached)
   - Badge count = COUNT(*) of that user's rows in UserBadges
   - Quiz count = COUNT(*) of that user's rows in QuizAttempts

3. Some users will sign up with Google or Microsoft instead of a
   password - password_hash must be allowed to be empty/NULL for those
   accounts. Add nullable, UNIQUE `google_id` and `microsoft_id` columns
   to Users for this.

4. Passwords must NEVER be stored as plain text - use a hashed password
   column (I know the actual hashing happens in backend code, not in
   SQLite itself - just make sure the column is designed for storing a
   hash, not raw text).

4. Please give me:
   - A `schema.sql` file with the full CREATE TABLE statement(s), heavily
     commented so I understand what each column is for
   - A short Python script that runs that schema and creates the actual
     `.db` file
   - A plain-English explanation of every table and column
   - Simple instructions for how I actually run this on my computer

5. Suggest sensible default values matching our frontend's placeholder
   data for a brand new user: 0 XP, 100 coins, 0 badges, 0 quizzes,
   0 day streak, country defaulting to "India".

Please ask me any clarifying questions before writing code, since I
won't be able to easily preview/iterate on this like a webpage.
```

---

## 4. After you get your results back

Share these with the team (especially the backend developer):
- Your `schema.sql` file
- The generated `.db` file (or instructions to regenerate it)
- The plain-English explanation of your tables/columns

The backend developer needs to know your **exact column names** to write
working code - mismatched names between your database and their Flask
code is the single most common integration bug, so double check this
with them directly once you're both done.
