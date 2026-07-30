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

**Route:** `POST /forgot-password/send-otp`
**Request body:** `{ "email": "..." }`
**Response:** `{ "success": true, "message": "..." }` or `{ "success": false, "message": "No account exists with this email address." }`

**What it should do:** When the user enters their email and clicks "Send OTP",
the browser will send that email to your Flask route. Your route needs to:

1. Check if that email exists in the `Users` table.
   - If it doesn't exist → send back an error message. The frontend will
     show "No account exists with this email address."
   - If it does exist → continue to step 2.
2. Generate a random 6-digit number (the OTP).
3. Save that OTP using `db_helpers.set_otp(user_id, otp_code)` - this
   is already built and tested. It saves the code plus a timestamp on
   the Users table (`otp_code`, `otp_created_at` columns already exist).
4. Actually email that OTP to the user's real email address (see the
   email account setup below).
5. Send back a success response to the frontend.

**What to use:**
- **Flask-Mail** to actually send emails.

### Email account setup (already decided - use these exact settings)

We're sending from **reviewer.00976@gmail.com**. Before any code will
work, someone needs to do this manually (this can't be done through
Claude or code - it's a one-time step in your Google Account settings):

1. Go to that Google Account → **Security** → turn on **2-Step
   Verification**
2. Still in Security → **App Passwords** → generate a new one, name it
   "EcoLearner"
3. Google will show a 16-character password ONE TIME - save it somewhere
   safe. This is NOT the real Gmail password - it's a separate password
   just for this app to use.

Then in your Flask project, create a file called `.env` (do NOT commit
this file to GitHub - add `.env` to your `.gitignore` file first):

```
MAIL_USERNAME=reviewer.00976@gmail.com
MAIL_PASSWORD=<paste the 16-character app password here>
```

And your Flask-Mail config should look like:

```python
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_USERNAME')
```

**Why the .env file matters:** this is a public/shared GitHub repo. If
the real app password ever gets committed directly into a `.py` file,
anyone who views the repo (including after you delete it later - old
commits still exist in git history) could use it to send email from
that account. Environment variables plus `.gitignore` keep the secret
out of the repo entirely.

**Important:** Never send the OTP back in the response to the frontend.
The frontend should never know what the correct OTP is — it only finds
out by asking your "Verify OTP" route (see below).

---

### 2. Verify OTP route

**Route:** `POST /forgot-password/verify-otp`
**Request body:** `{ "email": "...", "otp": "123456" }`

**What it should do:**
1. Look up the user by email (`db_helpers.get_user_by_email()`) and
   read their `otp_code` and `otp_created_at` fields directly off the
   returned row.
2. Check two things:
   - Does the submitted code match `user["otp_code"]`?
   - Has it expired? Compare `user["otp_created_at"]` to the current
     time (Suggest: OTPs expire after 5-10 minutes)
3. Respond `{ "success": true }` or `{ "success": false, "message": "Invalid or expired OTP." }`

The frontend already knows what to do with your answer — it'll show the
"Incorrect OTP" screen if you say it's wrong, or move to the next step if
you say it's right. You don't need to build any of that part.

---

### 3. Reset Password route

**Route:** `POST /forgot-password/reset`
**Request body:** `{ "email": "...", "otp": "123456", "newPassword": "..." }`

Notice the OTP is sent again here, even though it was already checked
in step 2 - **please re-check it's still correct and not expired in
this route too**, rather than assuming step 2 already covered it. This
route could be called on its own without step 2 ever having succeeded
(a user could edit the request), so it needs to be safe on its own.

**What it should do:**
1. Re-verify the email + otp combination, exactly like Verify OTP above.
2. Check the new password meets the rules (8-20 characters, uppercase,
   lowercase, number, special character) — yes, check this again on the
   backend even though the frontend already checks it.
3. Call `db_helpers.update_password(user_id, new_password)` - this
   already hashes the password before saving it.
4. Call `db_helpers.clear_otp(user_id)` so the used code can't be
   reused.
5. Respond `{ "success": true }` or `{ "success": false, "message": "..." }`

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
