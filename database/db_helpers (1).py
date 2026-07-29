"""
db_helpers.py
=============
Reusable functions for talking to ecolearner.db. Your backend teammate
imports these into Flask routes instead of writing raw SQL in every
route - e.g. a /signup route just calls create_user(...).

Every function opens its own connection and ALWAYS closes it again
using try/finally - even if something goes wrong partway through (like
a duplicate email). Without this, a single failed write (e.g. someone
signing up twice with the same email) leaves the database locked for
EVERY other user until the app restarts. This was tested and confirmed
as a real bug during review - see DATABASE_REVIEW_NOTES.md.
"""

import sqlite3
import os
from datetime import datetime, date
from werkzeug.security import generate_password_hash

DB_FILE = os.path.join(os.path.dirname(__file__), "ecolearner.db")

# ==========================================================================
# LEVEL SYSTEM - mirrors levels.js exactly, so the backend and frontend
# always agree on what level a given XP total means. If you ever change
# levels.js, make the same change here.
# ==========================================================================
LEVEL_THRESHOLDS = [0, 100, 500, 1200, 2200, 3500, 5200, 7200, 9500, 12200]

LEVEL_TITLES = [
    (1, 2, "Eco Beginner"),
    (3, 4, "Nature Learner"),
    (5, 6, "Green Guardian"),
    (7, 8, "Eco Explorer"),
    (9, 10, "Planet Protector"),
    (11, 12, "Forest Keeper"),
    (13, 14, "Ocean Defender"),
    (15, 16, "Earth Champion"),
    (17, 18, "Climate Hero"),
    (19, 20, "Eco Master"),
]


def get_level_for_xp(xp):
    """Same logic as getLevelForXP() in levels.js."""
    level = 0
    for i, threshold in enumerate(LEVEL_THRESHOLDS):
        if xp >= threshold:
            level = i
    return level


def get_level_title(level):
    """Same logic as getLevelTitle() in levels.js."""
    if level == 0:
        return "Just Getting Started"
    for min_lvl, max_lvl, title in LEVEL_TITLES:
        if min_lvl <= level <= max_lvl:
            return title
    return "Eco Legend"  # fallback for levels beyond the table, same as JS


# ==========================================================================
# CONNECTION HELPER
# ==========================================================================
def get_connection():
    """
    Opens a connection to ecolearner.db with two settings turned on:
    - foreign_keys ON, so SQLite actually enforces the relationships
      between tables (e.g. blocks a QuizAttempt for a user_id that
      doesn't exist).
    - row_factory = sqlite3.Row, so query results come back as
      dictionary-like objects (row["xp"]) instead of plain tuples
      (row[7]) - much easier to read and less error-prone.

    IMPORTANT: whoever calls this MUST close the connection in a
    `finally` block, so it always closes even if an error happens
    partway through - otherwise the database can end up locked for
    everyone else. See any function below for the pattern to copy.
    """
    connection = sqlite3.connect(DB_FILE)
    connection.execute("PRAGMA foreign_keys = ON")
    connection.row_factory = sqlite3.Row
    return connection


# ==========================================================================
# USER CREATION / LOOKUP
# ==========================================================================
def create_user(full_name, username, email, password=None,
                 google_id=None, microsoft_id=None, country="India"):
    """
    Creates a new user. Pass a plain-text `password` for normal signups
    (it gets hashed here, before it ever touches the database) OR pass
    google_id/microsoft_id for OAuth signups - not both.

    Returns the new user's id on success.
    Raises sqlite3.IntegrityError if the username/email/google_id/
    microsoft_id is already taken (because of the UNIQUE constraints
    in schema.sql) - the calling Flask route should catch this and
    show the user a friendly "already taken" message.
    """
    password_hash = generate_password_hash(password) if password else None

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            """
            INSERT INTO Users (full_name, username, email, password_hash,
                                google_id, microsoft_id, country)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (full_name, username, email, password_hash, google_id, microsoft_id, country),
        )
        connection.commit()
        return cursor.lastrowid
    finally:
        # Runs whether the INSERT succeeded OR raised an error (e.g. a
        # duplicate email). This is what actually fixes the "locked
        # database" bug - the connection always gets closed, so an
        # uncommitted transaction never sits around blocking others.
        connection.close()


def get_user_by_email(email):
    """Returns the user row (or None if no match) - used for login and
    for the Forgot Password 'does this email exist' check."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM Users WHERE email = ?", (email,))
        return cursor.fetchone()
    finally:
        connection.close()


def get_user_by_username(username):
    """Same idea as get_user_by_email(), but by username."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM Users WHERE username = ?", (username,))
        return cursor.fetchone()
    finally:
        connection.close()


def get_user_by_id(user_id):
    """Fetch one user by their internal id number."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT * FROM Users WHERE id = ?", (user_id,))
        return cursor.fetchone()
    finally:
        connection.close()


# ==========================================================================
# STREAK HANDLING
# ==========================================================================
def touch_streak(user_id):
    """
    Call this once whenever a user does a streak-worthy action (finishes
    a lesson or quiz). Looks at last_active_date to decide what happens:
      - already active today      -> do nothing (don't double-count)
      - active yesterday          -> streak continues, +1
      - active 2+ days ago / never -> streak resets to 1
    """
    today = date.today().isoformat()  # e.g. "2026-07-28"

    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT streak_days, last_active_date FROM Users WHERE id = ?", (user_id,))
        row = cursor.fetchone()

        if row is None:
            raise ValueError(f"No user with id {user_id}")

        last_active = row["last_active_date"]

        if last_active == today:
            # Already counted today - nothing to do.
            return row["streak_days"]

        if last_active is not None:
            days_gap = (date.fromisoformat(today) - date.fromisoformat(last_active)).days
        else:
            days_gap = None  # brand new user, never active before

        new_streak = row["streak_days"] + 1 if days_gap == 1 else 1

        cursor.execute(
            "UPDATE Users SET streak_days = ?, last_active_date = ? WHERE id = ?",
            (new_streak, today, user_id),
        )
        connection.commit()
        return new_streak
    finally:
        connection.close()


# ==========================================================================
# QUIZZES
# ==========================================================================
def record_quiz_attempt(user_id, topic, score, xp_earned):
    """
    Call this when a user finishes a quiz. Does three things together,
    so they can never end up out of sync with each other:
      1. Inserts the QuizAttempts row (the permanent record).
      2. Adds xp_earned onto the user's total XP.
      3. Adds a RecentActivity row so it shows up on their Profile page.
    Also updates their streak, since finishing a quiz counts as activity.
    """
    connection = get_connection()
    try:
        cursor = connection.cursor()

        cursor.execute(
            "INSERT INTO QuizAttempts (user_id, topic, score, xp_earned) VALUES (?, ?, ?, ?)",
            (user_id, topic, score, xp_earned),
        )
        cursor.execute(
            "UPDATE Users SET xp = xp + ? WHERE id = ?",
            (xp_earned, user_id),
        )
        cursor.execute(
            """
            INSERT INTO RecentActivity (user_id, icon_path, title, subtitle, activity_type)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                user_id,
                "../assets/icons/ui/badge.svg",
                "Completed a quiz",
                f"{topic} - scored {score}",
                "quiz",
            ),
        )
        connection.commit()
    finally:
        connection.close()

    # Runs as its own separate connection, AFTER the one above has
    # fully closed - avoiding two connections ever being open at once.
    touch_streak(user_id)


# ==========================================================================
# BADGES
# ==========================================================================
def award_badge(user_id, badge_id):
    """
    Gives a user a badge, and logs it to RecentActivity. Safe to call
    even if they already have it - INSERT OR IGNORE just skips silently
    instead of raising an error, thanks to the UNIQUE(user_id, badge_id)
    constraint in schema.sql.
    """
    connection = get_connection()
    try:
        cursor = connection.cursor()

        cursor.execute(
            "INSERT OR IGNORE INTO UserBadges (user_id, badge_id) VALUES (?, ?)",
            (user_id, badge_id),
        )
        already_had_it = cursor.rowcount == 0  # 0 rows changed = INSERT OR IGNORE skipped it

        if not already_had_it:
            cursor.execute("SELECT name, icon_path FROM Badges WHERE id = ?", (badge_id,))
            badge = cursor.fetchone()
            cursor.execute(
                """
                INSERT INTO RecentActivity (user_id, icon_path, title, subtitle, activity_type)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, badge["icon_path"], "Earned new badge", badge["name"], "badge"),
            )

        connection.commit()
        return not already_had_it  # True if it was newly awarded
    finally:
        connection.close()


# ==========================================================================
# FORGOT PASSWORD - OTP HANDLING
# ==========================================================================
def set_otp(user_id, otp_code):
    """Saves a freshly-generated OTP for this user, timestamped now.
    Call this from the /forgot-password/send-otp route."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE Users SET otp_code = ?, otp_created_at = CURRENT_TIMESTAMP WHERE id = ?",
            (otp_code, user_id),
        )
        connection.commit()
    finally:
        connection.close()


def clear_otp(user_id):
    """Wipes the OTP once it's been used (or should no longer be valid).
    Call this after a successful password reset, or after generating a
    fresh OTP to replace an old unused one."""
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE Users SET otp_code = NULL, otp_created_at = NULL WHERE id = ?",
            (user_id,),
        )
        connection.commit()
    finally:
        connection.close()


# NOTE: checking whether a submitted OTP is correct AND not expired is
# intentionally NOT a db_helpers function - that's a business-logic
# decision (how many minutes counts as "expired"?) that belongs in the
# Flask route itself. The route should call get_user_by_id() or
# get_user_by_email(), then compare user["otp_code"] to what the user
# submitted, and compare user["otp_created_at"] to the current time.


def update_password(user_id, new_password):
    """Hashes and saves a new password - used by the final step of
    Forgot Password, and could also be reused for a future 'Change
    Password' settings feature."""
    password_hash = generate_password_hash(new_password)
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute(
            "UPDATE Users SET password_hash = ? WHERE id = ?",
            (password_hash, user_id),
        )
        connection.commit()
    finally:
        connection.close()


# ==========================================================================
# COINS
# ==========================================================================
def spend_coins(user_id, amount):
    """
    Safely deducts coins - e.g. when a user pays 20 coins for a quiz
    hint. This is the REAL, secure version of the coin check that
    quiz.js currently only fakes in the browser (see the note in
    QUIZ_README.md about this) - always call this from the backend
    route, never trust a coin amount the frontend sends you.

    Returns the user's new coin balance on success.
    Raises ValueError if they don't have enough coins - the calling
    route should catch this and reject the hint request.
    """
    connection = get_connection()
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT coins FROM Users WHERE id = ?", (user_id,))
        row = cursor.fetchone()

        if row is None:
            raise ValueError(f"No user with id {user_id}")
        if row["coins"] < amount:
            raise ValueError("Not enough coins")

        new_balance = row["coins"] - amount
        cursor.execute("UPDATE Users SET coins = ? WHERE id = ?", (new_balance, user_id))
        connection.commit()
        return new_balance
    finally:
        connection.close()


# ==========================================================================
# PROFILE PAGE DATA
# ==========================================================================
def get_profile_data(user_id):
    """
    Gathers everything profile.js needs in one call: user info, the
    CALCULATED level/title/badge-count/quiz-count (never stored columns),
    and their most recent activity rows.
    """
    connection = get_connection()
    try:
        cursor = connection.cursor()

        cursor.execute("SELECT * FROM Users WHERE id = ?", (user_id,))
        user = cursor.fetchone()
        if user is None:
            raise ValueError(f"No user with id {user_id}")

        cursor.execute("SELECT COUNT(*) AS count FROM UserBadges WHERE user_id = ?", (user_id,))
        badge_count = cursor.fetchone()["count"]

        cursor.execute("SELECT COUNT(*) AS count FROM QuizAttempts WHERE user_id = ?", (user_id,))
        quiz_count = cursor.fetchone()["count"]

        cursor.execute(
            "SELECT * FROM RecentActivity WHERE user_id = ? ORDER BY created_at DESC LIMIT 4",
            (user_id,),
        )
        recent_activity = cursor.fetchall()

        level = get_level_for_xp(user["xp"])

        return {
            "name": user["full_name"],
            "country": user["country"],
            "xp": user["xp"],
            "coins": user["coins"],
            "streak_days": user["streak_days"],
            "level": level,
            "title": get_level_title(level),
            "badge_count": badge_count,
            "quiz_count": quiz_count,
            "recent_activity": [dict(row) for row in recent_activity],
        }
    finally:
        connection.close()
