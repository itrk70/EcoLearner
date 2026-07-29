# Notifications — Backend Handoff

This describes what the backend needs to provide so the notification
popover (bell icon, top-right of the Profile page) works with real
data instead of the placeholder array currently in `notifications.js`.

## Where this lives in the frontend
- `frontend/html/profile.html` — the bell button + popover markup
- `frontend/css/notifications.css` — popover styling
- `frontend/js/notifications.js` — currently uses a hardcoded array
  called `notifications`. Replace the top of that file with a real
  `fetch()` call once the endpoint below exists — nothing else in the
  file needs to change, since rendering only depends on the data
  having the shape described below.

## Expected database table: `notifications`

| Column      | Type      | Notes                                              |
|-------------|-----------|-----------------------------------------------------|
| id          | INTEGER   | Primary key, autoincrement                          |
| user_id     | INTEGER   | Foreign key → `users.id`                             |
| type        | TEXT      | `"welcome"`, `"badge"`, `"streak"`, `"mission"`, `"leaderboard"`, etc. Used by the frontend to pick an icon. |
| title       | TEXT      | Short heading, e.g. "Welcome to EcoLearner! 🌍"      |
| message     | TEXT      | Longer body text                                     |
| is_read     | BOOLEAN   | Defaults to `0` (unread) when created                |
| created_at  | DATETIME  | Defaults to current timestamp                        |

## Default "welcome" notification

When a new user completes signup, insert one row automatically:

```sql
INSERT INTO notifications (user_id, type, title, message, is_read)
VALUES (
  :new_user_id,
  'welcome',
  'Welcome to EcoLearner! 🌍',
  'Your account is ready. Complete your first quiz to start earning XP!',
  0
);
```

This is why, on the frontend right now, a freshly-loaded Profile page
shows exactly one notification — that's the expected state for a user
who just signed up, before they've done anything else yet.

## Expected API endpoints

**`GET /api/notifications`**
Returns all notifications for the *currently logged-in* user (via
session/cookie — no user_id should be passed by the frontend directly,
for security), newest first.

Response shape the frontend expects:
```json
[
  {
    "id": 1,
    "type": "welcome",
    "title": "Welcome to EcoLearner! 🌍",
    "message": "Your account is ready. Complete your first quiz to start earning XP!",
    "time": "Just now",
    "isRead": false
  }
]
```
Note: the frontend uses `isRead` (camelCase) and a human-friendly
`time` string (e.g. "2 hours ago") rather than a raw timestamp — either
convert `created_at` to a relative string server-side, or send the
timestamp and the frontend can format it. Not decided yet — flag this
when we build the route.

**`POST /api/notifications/<id>/read`**
Marks a single notification as read. No body needed.

**`POST /api/notifications/read-all`**
Marks every notification for the current user as read.

## Not yet decided (flag for later)
- Whether `time` gets formatted on the backend or frontend
- Pagination/limit if a user accumulates a large number of notifications
  over time (currently the popover just scrolls, no "load more")
