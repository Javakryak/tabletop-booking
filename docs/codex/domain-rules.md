# Domain Rules

Reference for domain behavior. Local `AGENTS.md` files should link here rather than duplicate long domain lists.

## Roles

### Guest

Can view public pages:

- Home page.
- Schedule.
- Game catalog.
- Rules.
- Contacts.

### Registered User

Can:

- Register/login primarily through Telegram.
- Maintain a profile.
- Add emergency phone number.
- Optionally add email.
- Request table bookings.
- Cancel own bookings according to club rules.
- View own booking history.
- Create and join open game meetups.
- Post messages in meetup message feed.
- Receive Telegram notifications.

### Club Administrator

Can:

- View booking requests.
- Confirm, move, or cancel bookings.
- View daily schedule.
- Receive new-request notifications.
- See only the minimum contact information needed for club operations.

Administrators must not receive unnecessary personal data.

### Club Owner

Can:

- Manage rooms.
- Manage tables.
- Manage club schedule.
- Configure booking rules.
- Block users.
- View audit logs.
- View statistics in MVP 3 / portfolio polish unless explicitly required earlier.
- Export CSV/Excel in MVP 3 / portfolio polish unless explicitly required earlier.

## Booking Rules

Bookings are stored as intervals:

```text
start_at
end_at
```

The UI uses 30-minute slot increments, but the database should not store every slot as a separate row unless there is a strong reason.

Use these statuses unless the schema already defines an approved equivalent:

```text
pending
confirmed
cancelled_by_user
cancelled_by_admin
completed
expired
```

Booking workflow:

1. User selects date, room/table, and duration.
2. System validates schedule, closures, user limits, and conflicts.
3. Booking request is created as `pending`.
4. Administrator confirms or cancels.
5. User receives notification.
6. Completed bookings are marked `completed` by scheduled job or admin workflow.

Prevent overlapping confirmed or pending bookings for the same table.

Critical overlap rule:

```text
A.start_at < B.end_at AND A.end_at > B.start_at
```

Always consider race conditions. Use transactions and database-level protection where possible.

A required test must cover this case:

> Two users try to book the same table for overlapping time at the same time. Only one request may succeed or only one may become confirmable, depending on the chosen final business rule.

A full-day booking means the club's working interval for that date, not necessarily `00:00-23:59`.

## Schedule Rules

Support three levels of availability:

1. Weekly working hours.
2. Date-specific exceptions such as holidays, closed days, shortened days, or special schedules.
3. Room/table closures.

Do not build a complex calendar engine unless requested. Keep schedule rules simple and explicit.

Suggested entities:

```text
club_working_hours
schedule_exceptions
room_closures
table_closures
```

## Meetup Rules

Meetups are open game sessions created by users.

A meetup may reference either:

- A game from the club catalog.
- A custom game title provided by the user.

Suggested fields:

```text
game_id nullable
custom_game_title nullable
```

Only one should be required for a valid meetup.

A meetup does not reserve a table immediately.

Meetup booking workflow:

1. User creates an open meetup.
2. Other users join.
3. When the required number of players is reached, the meetup becomes ready for booking.
4. The system or creator creates a table booking request.
5. Administrator confirms the booking.
6. Meetup becomes booked.

Suggested statuses:

```text
draft
open
ready_to_book
booking_pending
booked
cancelled
expired
completed
```

MVP meetup chat is a simple message feed:

- No realtime requirement.
- No WebSocket requirement for MVP.
- Only participants can read and write.
- Moderation and soft delete should be considered.

Do not implement a complex social network unless explicitly requested.

## Telegram Bot Rules

Suggested user commands:

```text
/start
/help
/book
/my_bookings
/my_meetups
/find_game
/cancel
/settings
```

Suggested admin commands:

```text
/admin
/pending
/today
```

Prefer inline buttons and menus over command-heavy UX.

Telegram update handling:

```text
local: polling
staging: webhook
production: webhook
```

## Telegram Mini App Readiness

Telegram Mini App is planned, but not the first implementation target.

Design reusable frontend components so they can work in:

- Public web app.
- Mobile web layout.
- Future Telegram Mini App.

Avoid hard-coding assumptions that the app always runs in a normal browser.
