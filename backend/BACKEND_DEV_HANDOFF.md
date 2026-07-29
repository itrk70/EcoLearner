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
| `frontend/js/login.js` | Current login form behavior |
| `frontend/js/forgot-password.js` | Shows the full OTP flow - search for `TODO` comments, each one marks exactly where your route plugs in |
| `frontend/FORGOT_PASSWORD_BACKEND_README.md` | Explains the Forgot Password routes and security rules in plain language |
| `frontend/js/quiz.js` | Search for "Hint" - shows where `spend_coins()` needs to plug in for real |

---

## 2. Build order

**Phase 1: Signup + Login**
- `POST /signup` → calls `db_helpers.create_user()`
- `POST /login` → calls `db_helpers.get_user_by_email()` or `get_user_by_username()`, then checks the password with `werkzeug.security.check_password_hash()`
- `POST /logout`

**Phase 2: Forgot Password**
- `POST /forgot-password/send-otp` → checks the email exists, generates a code, saves it with `db_helpers.set_otp()`, emails it
- `POST /forgot-password/verify-otp` → compares the submitted code to `user["otp_code"]`, and checks `user["otp_created_at"]` isn't too old
- `POST /forgot-password/reset` → calls `db_helpers.update_password()`, then `db_helpers.clear_otp()`

**Phase 3: Profile page data**
- `GET /profile` → just calls `db_helpers.get_profile_data(user_id)` - it already returns the exact shape `profile.js` needs

**Phase 4: Quiz hint coin-spending**
- A route the Quiz page calls when "Use Hint" is clicked → calls `db_helpers.spend_coins(user_id, 20)`, catches the `ValueError` if they don't have enough

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
2. `/login` (POST) - look up the user, check their password with
   werkzeug.security.check_password_hash(), start a Flask session if
   correct.
3. `/logout` (POST) - clears the session.

PHASE 2 - Forgot Password:
Please read FORGOT_PASSWORD_BACKEND_README.md (attached) first - it
already explains what to build here in detail, including security
rules like OTP expiry and never sending the correct OTP back to the
frontend. Use set_otp(), clear_otp(), and update_password() from
db_helpers.py for this.

PHASE 3 - Profile data:
A `/profile` route (GET) that returns whatever get_profile_data()
gives you, as JSON, for the logged-in user.

PHASE 4 - Quiz hint spending:
A route the Quiz page can call when someone uses a hint, which calls
spend_coins(user_id, 20) and handles the case where they don't have
enough (catch the ValueError it raises).

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
