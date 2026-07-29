# Database Review Notes

Your database work is genuinely solid — clean schema, good comments,
correct use of foreign keys, and sensible design decisions (like not
storing "level" as its own column). Two things were found during
testing and fixed directly in the files, explained here so you know
what changed and why.

## 1. Connection locking bug (the important one)

**What was happening:** In `create_user()` (and a few other functions),
if `cursor.execute()` raised an error partway through — like someone
signing up with an email that's already taken — the function exited
immediately through the exception, skipping the `connection.close()`
line at the end entirely. That connection's write transaction stayed
open and kept holding SQLite's write lock.

**Why it mattered:** every write *after* that — from any user, any
function, anywhere in the app — would fail with "database is locked"
until the whole app restarted. This was confirmed by actually running
the code and reproducing it, not just reading it.

**The fix:** every function now wraps its connection usage in
`try: ... finally: connection.close()`. The `finally` block runs no
matter what — whether the code succeeds or raises an error — so the
connection is *guaranteed* to close and release its lock.

```python
# Before (the bug):
connection = get_connection()
cursor = connection.cursor()
cursor.execute(...)  # if this raises an error, connection.close() below never runs
connection.commit()
connection.close()

# After (the fix):
connection = get_connection()
try:
    cursor = connection.cursor()
    cursor.execute(...)
    connection.commit()
finally:
    connection.close()  # ALWAYS runs, even if the code above raised an error
```

This is a good pattern to reuse for any future database code you write.

## 2. Missing OTP storage

The Forgot Password feature needs somewhere to temporarily store a
verification code per user. `Users` didn't have columns for this yet,
so two were added:

- `otp_code` (TEXT, nullable)
- `otp_created_at` (TEXT, nullable)

Both stay `NULL` almost all the time — they only get filled in between
"user requested a reset code" and "code was verified or expired."

Since no real user data existed in the database yet, the schema was
just updated directly and the `.db` file regenerated from scratch,
rather than writing a migration script — that's the right call this
early on, but worth knowing that once real user data exists, schema
changes need a proper migration instead of a rebuild.

## 3. A few new helper functions were added

To support Forgot Password and the Quiz hint feature, these were added
to `db_helpers.py`, following the same connection pattern as your
existing functions: `set_otp()`, `clear_otp()`, `update_password()`,
`spend_coins()`. Feel free to read through them — they're small and
follow the exact same style as what you already wrote.

## Everything else

No other changes. `schema.sql`'s five original tables, the seed badge
data, `create_db.py`, and all your original comments are untouched.
