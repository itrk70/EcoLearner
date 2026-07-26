# Forgot Password — Backend To-Do List

Hey! The frontend for "Forgot Password" is done and working — but right now
it's all fake. This file explains what you need to build so it actually
works for real.

Everything the frontend currently fakes is marked with `TODO` comments
inside `forgot-password.js`. This README explains those TODOs in plain
words.

---

## The 4 things you need to build

### 1. Send OTP route

**What it should do:** When the user enters their email and clicks "Send OTP",
the browser will send that email to your Flask route. Your route needs to:

1. Check if that email exists in the `Users` table.
   - If it doesn't exist → send back an error message. The frontend will
     show "No account exists with this email address."
   - If it does exist → continue to step 2.
2. Generate a random 6-digit number (the OTP).
3. Save that OTP somewhere temporary, along with:
   - which user it belongs to
   - the time it was created (so you can check later if it's expired)
4. Actually email that OTP to the user's real email address.
5. Send back a success response to the frontend.

**What to use:**
- **Flask-Mail** (or a similar library) to actually send emails. You'll
  need a real email account/service to send from (Gmail SMTP works for
  testing, but for production something like SendGrid or Mailgun is
  better).
- For saving the OTP temporarily, the simplest option is a new column
  on the `Users` table (like `otp_code` and `otp_created_at`). You could
  also use a separate small table if you want to keep things tidy.

**Important:** Never send the OTP back in the response to the frontend.
The frontend should never know what the correct OTP is — it only finds
out by asking your "Verify OTP" route (see below).

---

### 2. Verify OTP route

**What it should do:** When the user types in the 6-digit code and clicks
"Verify OTP", the browser sends that code to your route. Your route needs to:

1. Look up the OTP you saved for that user.
2. Check two things:
   - Does the code match?
   - Has it expired? (Suggest: OTPs expire after 5-10 minutes)
3. Send back "correct" or "incorrect" to the frontend.

The frontend already knows what to do with your answer — it'll show the
"Incorrect OTP" screen if you say it's wrong, or move to the next step if
you say it's right. You don't need to build any of that part.

---

### 3. Reset Password route

**What it should do:** Once the OTP is verified, the user types a new
password and clicks "Reset Password." Your route needs to:

1. Check the new password meets the rules (8-20 characters, uppercase,
   lowercase, number, special character) — yes, check this again on the
   backend even though the frontend already checks it. Never trust
   anything the browser sends without double-checking.
2. **Hash the password** before saving it — never save a plain password
   in the database. Use a library like `werkzeug.security` (it has
   `generate_password_hash()` and `check_password_hash()` built in, and
   Flask usually already includes it).
3. Update that user's password in the `Users` table.
4. (Good idea) Delete/clear the OTP you saved earlier, so it can't be
   reused.
5. Send back a success response.

---

### 4. Security checklist (please actually read this one)

- **Never** send the correct OTP to the frontend in any response, ever.
- **Never** save passwords as plain text — always hash them.
- Make the OTP **expire** after a few minutes. Don't let old codes work
  forever.
- Consider limiting how many wrong attempts someone gets (e.g. block
  after 5 wrong tries) so people can't just guess codes over and over.
- Consider limiting how often "Send OTP" can be clicked for the same
  email (e.g. once every 30-60 seconds) so people can't spam someone's
  inbox.

---

## Quick summary table

| Frontend does this | You need to build this |
|---|---|
| User submits email | Route that checks email exists + generates + emails OTP |
| User submits 6-digit code | Route that checks the code is correct and not expired |
| User submits new password | Route that hashes and saves the new password |
| Frontend shows fake console.log OTP | You must remove this comment/log — it's just a placeholder for testing |

---

## Where to look in the frontend code

Open `js/forgot-password.js` and search for the word `TODO` — every place
that needs a real backend connection is marked, with a short note on
exactly what kind of request should go there instead.
