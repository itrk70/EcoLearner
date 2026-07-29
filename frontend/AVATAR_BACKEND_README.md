# Avatar Selection — Backend Handoff

This describes what the backend needs to provide so the "Choose Your
Avatar" modal (pencil icon on the Profile page) works with real user
data instead of the placeholder array currently in `avatar-modal.js`.

## Where this lives in the frontend
- `frontend/html/profile.html` — pencil button + modal markup
- `frontend/css/avatar-modal.css` — modal styling
- `frontend/js/avatar-modal.js` — currently uses a hardcoded `avatars`
  array. Replace the top of that file with a real `fetch()` call once
  the endpoint below exists.

## Why this needs TWO tables, not one

A single flat list of avatars isn't enough, because avatars aren't
all available to everyone by default — some are earned later through
Challenges/Rewards. We need to track *which avatars exist* separately
from *which ones a specific user has unlocked*.

### Table: `avatars` (the full catalog — same for every user)

| Column       | Type    | Notes                                              |
|--------------|---------|-----------------------------------------------------|
| id           | INTEGER | Primary key                                         |
| filename     | TEXT    | e.g. `"tiger-boy.svg"`                               |
| label        | TEXT    | e.g. `"Tiger Boy"` (shown under the avatar in the grid) |
| is_default   | BOOLEAN | `1` for avatars every new user gets automatically    |
| unlock_type  | TEXT    | `"default"` or `"reward"` — how a user gets access   |

Pre-given avatars to insert now (`is_default = 1` for all four):

| filename             | label          |
|----------------------|----------------|
| avatar-default.svg   | Boy            |
| girl-avatar.svg      | Girl           |
| tiger-boy.svg        | Tiger Boy      |
| flamingo-girl.svg    | Flamingo Girl  |

Files already exist at `frontend/assets/images/avatars/`.

### Table: `user_avatars` (which user owns which avatar)

| Column      | Type      | Notes                                    |
|-------------|-----------|--------------------------------------------|
| id          | INTEGER   | Primary key                                |
| user_id     | INTEGER   | Foreign key → `users.id`                    |
| avatar_id   | INTEGER   | Foreign key → `avatars.id`                  |
| unlocked_at | DATETIME  | Defaults to current timestamp               |

When a new user signs up, insert one `user_avatars` row for every
avatar where `is_default = 1`. When a user earns an avatar from a
Challenge/Reward later, insert one more row here — nothing else
changes.

### Table/column: current avatar

The `users` table needs a `current_avatar_id` column (foreign key →
`avatars.id`), defaulting to whichever avatar has `filename =
'avatar-default.svg'`.

## Expected API endpoints

**`GET /api/user/avatars`**
Returns every avatar the *currently logged-in* user owns, default
avatar first, plus which one is currently active. Response shape the
frontend expects:

```json
{
  "currentAvatarId": "default",
  "avatars": [
    { "id": "default", "filename": "avatar-default.svg", "label": "Boy", "isDefault": true },
    { "id": "girl", "filename": "girl-avatar.svg", "label": "Girl", "isDefault": false }
  ]
}
```
Note: the frontend's `avatar.id` values (`"default"`, `"girl"`, etc.)
are just placeholder string IDs right now — fine to swap these for
real integer `avatars.id` primary keys once this is wired up, the JS
doesn't care what type the ID is.

**`POST /api/user/avatar`**
Sets the user's active avatar. Body: `{ "avatarId": <id> }`. Should
reject IDs the user doesn't actually own (don't trust the frontend
blindly here — someone could tamper with the request).

## Not yet decided (flag for later)
- Exact mechanism for how Challenges/Rewards grant a new `user_avatars`
  row (probably happens inside whatever route completes a
  challenge/reward, not a separate endpoint)
