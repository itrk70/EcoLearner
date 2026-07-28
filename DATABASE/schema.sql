-- ==========================================================================
-- ECOLEARNER DATABASE SCHEMA
-- ==========================================================================
-- This file defines the STRUCTURE of our database: what tables exist,
-- what columns each table has, and how tables relate to each other.
-- It does NOT contain any actual user data - just the "blueprint."
--
-- How to read a CREATE TABLE statement:
--   column_name  DATA_TYPE  CONSTRAINTS
-- A "constraint" is a rule SQLite enforces for you automatically, e.g.
-- NOT NULL (this field can never be empty) or UNIQUE (no two rows can
-- share this value).
-- ==========================================================================

-- This turns ON foreign key enforcement. Without this line, SQLite will
-- silently let you break relationships (e.g. insert a QuizAttempt for a
-- user_id that doesn't exist). We want SQLite to stop us from doing that.
PRAGMA foreign_keys = ON;


-- ==========================================================================
-- TABLE 1: Users
-- One row = one account (whether they signed up with a password, Google,
-- or Microsoft).
-- ==========================================================================
CREATE TABLE Users (
    -- "id" is the PRIMARY KEY: a unique number SQLite assigns automatically
    -- to every row (1, 2, 3...). Every other table will refer to a user
    -- by this number instead of copying their name/email everywhere.
    id              INTEGER PRIMARY KEY AUTOINCREMENT,

    full_name       TEXT NOT NULL,

    -- UNIQUE = no two users can have the same username/email. SQLite will
    -- reject an INSERT that tries to violate this, so you don't have to
    -- manually check for duplicates every time in Python.
    username        TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL UNIQUE,

    -- This stores a HASHED password (e.g. what werkzeug's
    -- generate_password_hash() produces) - never a plain-text password.
    -- It's allowed to be NULL (empty) because Google/Microsoft users
    -- don't set a password with us at all - they log in through Google
    -- or Microsoft instead, so there is nothing to hash here.
    password_hash   TEXT,

    -- Nullable + UNIQUE: at most one user can be linked to a given
    -- Google/Microsoft account, but a password-based user will have
    -- NULL in both of these columns. SQLite treats NULL specially -
    -- multiple rows are allowed to have NULL here even though the
    -- column is UNIQUE (NULL never "matches" another NULL).
    google_id       TEXT UNIQUE,
    microsoft_id    TEXT UNIQUE,

    -- Gameplay stats. Defaults here match your frontend's placeholder
    -- data for a brand-new user (profile.js: xp: 0, coins: 100).
    xp              INTEGER NOT NULL DEFAULT 0,
    coins           INTEGER NOT NULL DEFAULT 100,
    streak_days     INTEGER NOT NULL DEFAULT 0,

    -- The date (YYYY-MM-DD) the user last did something streak-worthy
    -- (e.g. finished a lesson/quiz). Your backend teammate will use this
    -- to decide: was that yesterday -> streak continues (+1); was that
    -- today already -> do nothing; was that 2+ days ago -> streak resets
    -- to 1. NULL means "this user has never done a streak-worthy action
    -- yet" (a brand new account).
    last_active_date TEXT,

    country         TEXT NOT NULL DEFAULT 'India',

    -- Path/filename to their avatar image, e.g. 'avatar_leaf_3.png'.
    -- NULL = show the app's generic default avatar image.
    avatar          TEXT,

    -- Automatically recorded the moment the row is created - useful for
    -- "member since" type features later, and for debugging.
    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================================================
-- TABLE 2: Badges
-- The fixed CATALOG of every badge that can ever be earned - think of it
-- like a menu. This table never mentions any specific user.
-- ==========================================================================
CREATE TABLE Badges (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE,
    description     TEXT NOT NULL,
    icon_path       TEXT NOT NULL
);


-- ==========================================================================
-- TABLE 3: UserBadges
-- A "JOIN table" - it exists purely to connect Users and Badges. Each row
-- means: "this user earned this badge at this time." This is how one user
-- can earn many badges, and one badge can be earned by many users
-- (a many-to-many relationship), without duplicating any badge info.
-- ==========================================================================
CREATE TABLE UserBadges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,

    -- These two columns are FOREIGN KEYS: they must match an existing
    -- id in Users / Badges. "ON DELETE CASCADE" means if a user account
    -- is ever deleted, their earned-badge records get cleaned up
    -- automatically instead of being left behind as orphans.
    user_id     INTEGER NOT NULL REFERENCES Users(id)  ON DELETE CASCADE,
    badge_id    INTEGER NOT NULL REFERENCES Badges(id) ON DELETE CASCADE,

    earned_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- This UNIQUE constraint (on the COMBINATION of two columns) stops a
    -- user from "earning" the exact same badge twice.
    UNIQUE (user_id, badge_id)
);


-- ==========================================================================
-- TABLE 4: QuizAttempts
-- One row = one completed quiz. This is your source of truth for
-- "quiz count" (COUNT the rows for a user) and quiz history.
-- ==========================================================================
CREATE TABLE QuizAttempts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,

    -- e.g. "Water Conservation", "Recycling Basics" - whatever topic
    -- naming your quiz.js ends up using.
    topic           TEXT NOT NULL,

    -- Raw score, e.g. 8 (out of however many questions the quiz had).
    score           INTEGER NOT NULL,

    xp_earned       INTEGER NOT NULL DEFAULT 0,

    attempted_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================================================
-- TABLE 5: RecentActivity
-- One row = one notable event to show in the Profile page's "Recent
-- Activity" feed (badge earned, quiz completed, lesson finished, etc).
-- We're storing icon/title/subtitle directly on each row (rather than
-- linking back to QuizAttempts/UserBadges) so this table stays simple
-- and flexible - a lesson-finished event, for example, has nowhere else
-- to "link back" to yet, but can still show up here.
-- ==========================================================================
CREATE TABLE RecentActivity (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,

    -- Path to the small icon shown next to this activity row, matching
    -- the icon paths you're already using in profile.js
    -- (e.g. '../assets/icons/ui/badge.svg').
    icon_path       TEXT NOT NULL,

    -- What profile.js currently calls "title" / "subtitle", e.g.
    -- title = "Earned new badge", subtitle = "Nature Lover".
    title           TEXT NOT NULL,
    subtitle        TEXT,

    -- A short label like 'badge', 'quiz', or 'lesson' - lets your
    -- frontend/backend filter or style rows differently by type later
    -- if you want to (e.g. a different icon background color per type).
    activity_type   TEXT NOT NULL,

    created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ==========================================================================
-- SEED DATA: pre-fill the Badges catalog with the 4 badges already
-- referenced in profile.js, so your team has real data to test against
-- immediately.
-- ==========================================================================
INSERT INTO Badges (name, description, icon_path) VALUES
    ('Nature Saver',     'Complete 5 lessons',              '../assets/icons/badges/badge-eco-warrior.svg'),
    ('Quiz Master',       'Score 100% in 10 quizzes',        '../assets/icons/badges/badge-quiz-master.svg'),
    ('Green Warrior',     'Maintain a 7-day streak',         '../assets/icons/badges/badge-streak.svg'),
    ('Planet Protector',  'Earn 1000 XP',                    '../assets/icons/ui/badge.svg');
