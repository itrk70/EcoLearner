# Backend Developer — Handoff Guide

The database is done, reviewed, tested, and one real bug in it was found
and fixed (details in Section 4). You're clear to start.

Read this whole guide once before pasting anything into your own Claude
chat — the prompt references files you need to upload alongside it.

---

## 1. Files to download and upload to your Claude chat

| File | Why you need it |
|---|---|
| `database/schema.sql` | Shows every table and column, fully commented |
| `database/db_helpers.py` | **Use these functions - don't write your own raw SQL for things they already do.** Every Flask route below maps to one or more of these |
| `database/ecolearner.db` | The actual database file - drop it in your Flask project folder |
| `frontend/html/signup.html` | Shows every Signup field and its exact `id` |
| `frontend/js/signup.js` | **Most important frontend file.** Shows the EXACT request your `/signup` route must accept and the EXACT response shape it must return |
| `frontend/html/login.html` | Shows the Login form fields |
| `frontend/js/login.js` | **Has a real fetch("/login") contract now** - shows the exact request/response shape expected |
| `frontend/html/profile.html` | Shows every stat displayed on the Profile page |
| `frontend/js/profile.js` | **Has a real fetch("/profile") contract now** - shows the exact response shape expected back |
| `frontend/js/forgot-password.js` | **Has real fetch() contracts now** for all 3 routes (send-otp, verify-otp, reset) - exact shapes are in the code comments and in FORGOT_PASSWORD_BACKEND_README.md |
| `frontend/FORGOT_PASSWORD_BACKEND_README.md` | Explains the Forgot Password routes, security rules, and email setup in plain language |
| `frontend/js/quiz.js` | Search for `"use-hint"` and `"/profile"` - both real `fetch()` calls are already built in |

---

## 2. Build order

**Phase 1: Signup + Login**
- `POST /signup` → calls `db_helpers.create_user()`
- `POST /login` → request body is `{ "identifier": "...", "password": "..." }` (identifier = email OR username - try both when looking up the account), calls `db_helpers.get_user_by_email()`/`get_user_by_username()`, then checks the password with `werkzeug.security.check_password_hash()`. Response: `{ "success": true/false, "message": "..." }`. On success, start a Flask session - `/profile` and the Quiz hint route below both depend on that session existing.
- `POST /logout`

**Phase 2: Forgot Password**
- `POST /forgot-password/send-otp` → checks the email exists, generates a code, saves it with `db_helpers.set_otp()`, emails it
- `POST /forgot-password/verify-otp` → compares the submitted code to `user["otp_code"]`, and checks `user["otp_created_at"]` isn't too old
- `POST /forgot-password/reset` → calls `db_helpers.update_password()`, then `db_helpers.clear_otp()`

**Phase 3: Profile page data**
- `GET /profile` → just calls `db_helpers.get_profile_data(user_id)` - it already returns the exact shape `profile.js` needs

**Phase 4: Quiz hint coin-spending**
- `POST /quiz/use-hint` → calls `db_helpers.spend_coins(user_id, 20)`, catches the `ValueError` it raises if there aren't enough coins. Response success: `{ "success": true, "newCoinBalance": 80 }`. Response failure: `{ "success": false, "message": "Not enough coins" }`. This is also the route `quiz.js` calls now - and `openQuiz()` in that same file also calls `GET /profile` when the quiz opens, to show the user's real starting XP/Level/Coins instead of placeholder numbers.

**Phase 5: Google/Microsoft Login** (last, or skip if time is short)
- Uses `db_helpers.create_user()` with `google_id`/`microsoft_id` instead of a password

---

## 3. The prompt — paste this into your own Claude chat

```
I'm the backend developer on a student team building "EcoLearner" - a
gamified environmental education website. We're using Python Flask.
Our database developer already built and tested our SQLite database -
I'm attaching schema.sql, db_helpers.py, and ecolearner.db.

I'm a beginner with Flask, so please explain things simply, comment
the code well, and build this step by step rather than all at once.

IMPORTANT: Use the functions already in db_helpers.py wherever they
cover what I need (create_user, get_user_by_email, get_user_by_username,
get_user_by_id, touch_streak, record_quiz_attempt, award_badge,
get_profile_data, set_otp, clear_otp, update_password, spend_coins).
Don't write your own raw SQL for things these already do - they're
already tested and handle connection cleanup correctly.

I've also attached our frontend files so you can see the EXACT data
shapes our JavaScript sends and expects back. Please read signup.js
first - it has a `signupData` object and a `fetch()` call showing
precisely what my /signup route must accept and return. Match that
exactly, don't redesign the contract.

Please build this in this exact order, confirming each phase works
before moving to the next:

PHASE 1 - Signup and Login:
1. `/signup` (POST) - call create_user(). Catch sqlite3.IntegrityError
   (means username or email is already taken) and return
   { "success": false, "message": "..." } instead of crashing.
   On success return { "success": true, "message": "..." }.
2. `/login` (POST) - request body is { "identifier": "...", "password": "..." }
   where identifier could be an email OR a username - try looking up
   both. Check the password with werkzeug.security.check_password_hash(),
   start a Flask session if correct. Response shape is the same
   { "success": true/false, "message": "..." } pattern as /signup.
3. `/logout` (POST) - clears the session.

PHASE 2 - Forgot Password:
Please read FORGOT_PASSWORD_BACKEND_README.md (attached) first - it
already explains what to build here in detail, including security
rules like OTP expiry and never sending the correct OTP back to the
frontend, AND the real email account to send from. Use set_otp(),
clear_otp(), and update_password() from db_helpers.py for this.

PHASE 3 - Profile data:
A `/profile` route (GET) that returns whatever get_profile_data()
gives you, as JSON, for the logged-in user (read from the Flask
session, not a URL parameter - never trust the browser to tell you
which user it is). This route is called by BOTH profile.js and
quiz.js (quiz.js calls it once, when the quiz window opens, just to
show real starting XP/Level/Coins).

PHASE 4 - Quiz hint spending:
A `/quiz/use-hint` (POST) route - calls spend_coins(user_id, 20).
On success return { "success": true, "newCoinBalance": <their new balance> }.
If they don't have enough coins, spend_coins() raises a ValueError -
catch it and return { "success": false, "message": "Not enough coins" }.

PHASE 5 - Google/Microsoft Login (only after everything above works):
Help me add "Sign in with Google" first (simpler than Microsoft), using
a library like Authlib. When someone logs in via Google, call
create_user() with google_id set instead of a password - explain how
to check first whether that google_id already exists (returning user)
vs. creating a new account (first-time user). Explain what I need to
set up in Google Cloud Console before any code will work, since that
part happens outside of Claude entirely.

For every route, tell me exactly how to test it (e.g. a sample curl
command) and what success vs. failure responses look like.

Please ask me any clarifying questions before writing code.
```

---

## 4. What was found and fixed during database review (for your awareness)

- `db_helpers.py` had a bug where a failed write (like a duplicate
  signup attempt) could leave the database locked for every other user
  until the app restarted. This was found by actually testing it, not
  just reading the code, and has been fixed - every function now
  guarantees its connection closes no matter what.
- The database didn't originally have anywhere to store the OTP for
  Forgot Password - two columns (`otp_code`, `otp_created_at`) were
  added to `Users`, along with matching helper functions.
- A `spend_coins()` function was added to close a security gap flagged
  earlier in `QUIZ_README.md` - the hint coin-check was only ever fake
  frontend JS; this is the real, server-side version of it.

None of this needs redoing on your end - just explaining why the files
you're getting today look slightly different from what may have been
described to you earlier.

---

## 5. A few things to double check once you get code back

- Passwords should look like a long random hash in the database, never
  plain text
- Try submitting Signup twice with the same email - should reject the
  second attempt cleanly, and the app should keep working normally
  right after (this exact scenario was the bug that got fixed above)
- Confirm `/profile` returns data in exactly the shape `profile.js`
  expects (open that file and compare field names)
