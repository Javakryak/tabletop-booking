# API_SPEC.md

> Draft REST API specification for the board game and wargame club booking application.
>
> This document defines the intended public contract between the backend API, web frontend, Telegram bot, and future Telegram Mini App. It is not a generated OpenAPI file. The generated Swagger/OpenAPI documentation must be produced from the backend code and kept consistent with this document.

---

## 1. API principles

### 1.1. API style

The project uses a versioned REST API.

```txt
/api/v1
```

REST is preferred over GraphQL and tRPC because:

- the API is used by controlled clients: web app, Telegram bot, and future Telegram Mini App;
- REST is easy to document through OpenAPI/Swagger;
- REST endpoints map well to Codex tasks and PRs;
- it is easier to test with integration and API e2e tests;
- it is suitable for portfolio demonstration.

### 1.2. API consumers

Primary API consumers:

- `apps/web` — public website, user cabinet, admin panel, owner panel;
- `apps/bot` — Telegram bot;
- future Telegram Mini App — reused web booking UI inside Telegram.

The API is not designed as a public third-party API in MVP.

### 1.3. Base URL

Local development:

```txt
http://localhost:3001/api/v1
```

Staging and production URLs must be configured through environment variables.

```txt
API_BASE_URL
APP_BASE_URL
```

---

## 2. Authentication and authorization

### 2.1. Primary auth method

Primary authentication method: Telegram-first auth.

Supported auth flows:

1. Web login through Telegram authentication.
2. Telegram bot account linking through `/start`.
3. Future Telegram Mini App authentication through Telegram init data.
4. Optional email-based alternative login may be added later.

### 2.2. Session model

Recommended session model for MVP:

- access token for authenticated API requests;
- refresh token or secure session cookie depending on frontend implementation;
- httpOnly cookies are preferred for browser sessions;
- bot service may use internal service credentials for bot-to-api calls.

Final implementation must avoid exposing long-lived secrets to the browser.

### 2.3. Roles

Supported roles:

```txt
guest
user
admin
owner
```

Role meanings:

| Role | Description |
|---|---|
| `guest` | Unauthenticated visitor. Can access public pages and public API resources. |
| `user` | Registered club user. Can manage own profile, bookings, meetups, and participation. |
| `admin` | Club administrator. Can confirm, move, cancel bookings and handle operational tasks. |
| `owner` | Club owner. Can manage rooms, tables, rules, schedules, users, exports, and audit logs. |

### 2.4. Authorization rules

General rules:

- users can access only their own private data;
- admins must see only the minimum contact information needed for operations;
- owners can access management data and audit logs;
- phone numbers and emails must not be exposed unless explicitly required;
- Telegram ID must not be displayed in normal UI;
- all privileged actions must be logged in `audit_logs`.

---

## 3. Common conventions

### 3.1. Request and response format

All requests and responses use JSON unless explicitly stated otherwise.

```http
Content-Type: application/json
Accept: application/json
```

### 3.2. Date and time format

All API timestamps must use ISO 8601.

```txt
2026-05-02T15:30:00+03:00
```

Storage should use UTC internally. UI must display times in the club timezone.

### 3.3. Pagination

List endpoints should support cursor or page-based pagination.

Recommended MVP format:

```http
GET /resources?page=1&pageSize=20
```

Response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

For high-volume resources, cursor pagination may be introduced later.

### 3.4. Sorting

Recommended query format:

```http
GET /bookings?sort=startAt&order=asc
```

### 3.5. Filtering

Recommended query format:

```http
GET /bookings?status=pending&date=2026-05-02
```

### 3.6. Response envelope

Successful single-resource response:

```json
{
  "data": {
    "id": "..."
  }
}
```

Successful list response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "startAt",
        "message": "startAt must be a valid ISO datetime"
      }
    ],
    "requestId": "req_..."
  }
}
```

---

## 4. Common HTTP status codes

| Status | Meaning |
|---:|---|
| 200 | OK |
| 201 | Created |
| 204 | No content |
| 400 | Bad request |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Resource not found |
| 409 | Conflict, for example booking time overlap |
| 422 | Validation error |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Service unavailable |

---

## 5. Common error codes

```txt
VALIDATION_ERROR
AUTH_REQUIRED
FORBIDDEN
NOT_FOUND
BOOKING_CONFLICT
BOOKING_RULE_VIOLATION
BOOKING_CANCELLATION_NOT_ALLOWED
USER_BLOCKED
RESOURCE_UNAVAILABLE
MEETUP_FULL
MEETUP_NOT_READY_TO_BOOK
CONSENT_REQUIRED
RATE_LIMITED
INTERNAL_ERROR
```

---

## 6. Public endpoints

Public endpoints are available to guests.

### 6.1. Health

#### `GET /health`

Checks whether the API is alive.

Access: public or infrastructure-only.

Response:

```json
{
  "data": {
    "status": "ok",
    "timestamp": "2026-05-02T12:00:00Z",
    "services": {
      "database": "ok",
      "redis": "ok"
    }
  }
}
```

### 6.2. Public club information

#### `GET /public/club`

Returns public club information for the website.

Access: public.

Response fields:

```json
{
  "data": {
    "name": "Board Game Club",
    "description": "...",
    "contacts": {
      "telegram": "...",
      "address": "..."
    }
  }
}
```

### 6.3. Public schedule

#### `GET /public/schedule`

Returns public club schedule.

Access: public.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `from` | ISO date | Start date |
| `to` | ISO date | End date |

### 6.4. Public games catalog

#### `GET /public/games`

Returns visible games from the club catalog.

Access: public.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `q` | string | Search query |
| `genre` | string | Genre filter |
| `difficulty` | string | Difficulty filter |
| `page` | number | Page number |
| `pageSize` | number | Page size |

#### `GET /public/games/:id`

Returns one public game by id.

---

## 7. Authentication endpoints

### 7.1. Telegram web auth

#### `POST /auth/telegram`

Authenticates a user through Telegram login data.

Access: public.

Request:

```json
{
  "telegramAuthData": {
    "id": "123456789",
    "first_name": "Ivan",
    "username": "ivan_boardgames",
    "photo_url": "https://...",
    "auth_date": 1710000000,
    "hash": "..."
  }
}
```

Response:

```json
{
  "data": {
    "user": {
      "id": "user_id",
      "displayName": "Ivan",
      "roles": ["user"],
      "profileCompleted": false,
      "consentRequired": true
    },
    "accessToken": "..."
  }
}
```

Implementation notes:

- verify Telegram hash server-side;
- create account if it does not exist;
- update Telegram username if changed;
- do not trust client-provided role data.

### 7.2. Telegram Mini App auth

#### `POST /auth/telegram-mini-app`

Authenticates user from Telegram Mini App init data.

Access: public.

Request:

```json
{
  "initData": "query_id=...&user=...&auth_date=...&hash=..."
}
```

Response: same as `POST /auth/telegram`.

Implementation notes:

- planned for future Mini App integration;
- validate init data server-side;
- do not log raw init data.

### 7.3. Bot account linking

#### `POST /auth/telegram-bot/link`

Links Telegram bot user to an application account.

Access: internal bot service only.

Request:

```json
{
  "telegramId": "123456789",
  "telegramUsername": "ivan_boardgames",
  "displayName": "Ivan"
}
```

Response:

```json
{
  "data": {
    "userId": "user_id",
    "isNewUser": true,
    "profileCompleted": false
  }
}
```

### 7.4. Current session

#### `GET /auth/me`

Returns authenticated user session info.

Access: user/admin/owner.

Response:

```json
{
  "data": {
    "id": "user_id",
    "displayName": "Ivan",
    "roles": ["user"],
    "profileCompleted": true,
    "consentRequired": false
  }
}
```

### 7.5. Logout

#### `POST /auth/logout`

Invalidates current session.

Access: authenticated.

Response: `204 No Content`.

---

## 8. User profile endpoints

### 8.1. Get my profile

#### `GET /users/me/profile`

Access: user/admin/owner.

Response:

```json
{
  "data": {
    "id": "user_id",
    "displayName": "Ivan",
    "telegramUsername": "ivan_boardgames",
    "phone": "+79990000000",
    "email": "ivan@example.com",
    "privacy": {
      "showTelegramUsernameToMeetupParticipants": true,
      "showPhoneToAdmins": false
    }
  }
}
```

### 8.2. Update my profile

#### `PATCH /users/me/profile`

Access: user/admin/owner.

Request:

```json
{
  "displayName": "Ivan",
  "phone": "+79990000000",
  "email": "ivan@example.com",
  "privacy": {
    "showTelegramUsernameToMeetupParticipants": true
  }
}
```

Response: updated profile.

Validation rules:

- `displayName` is required after registration;
- `phone` is nullable in storage but required before creating real, non-demo bookings;
- `email` is optional;
- phone and email must not be logged in plain text.

### 8.3. Request account deletion

#### `POST /users/me/delete-request`

Access: user/admin/owner.

Request:

```json
{
  "reason": "I no longer use the club"
}
```

Response:

```json
{
  "data": {
    "status": "received"
  }
}
```

Implementation notes:

- MVP should create a deletion request instead of immediate hard deletion;
- owner/admin processing rules must be documented;
- personal data should be anonymized when deletion is completed.

---

## 9. Rooms and tables

### 9.1. Public room/table availability

#### `GET /rooms`

Returns rooms visible to authenticated users.

Access: user/admin/owner.

#### `GET /rooms/:roomId/tables`

Returns tables in a room.

Access: user/admin/owner.

### 9.2. Owner room management

#### `POST /owner/rooms`

Access: owner.

Request:

```json
{
  "name": "Main hall",
  "description": "Large room for board games",
  "isActive": true
}
```

#### `PATCH /owner/rooms/:roomId`

Access: owner.

#### `DELETE /owner/rooms/:roomId`

Access: owner.

Implementation notes:

- prefer soft delete or `isActive=false` if historical bookings reference the room;
- deletion must not break booking history.

### 9.3. Owner table management

#### `POST /owner/tables`

Access: owner.

Request:

```json
{
  "roomId": "room_id",
  "number": "T1",
  "capacity": 6,
  "isActive": true
}
```

#### `PATCH /owner/tables/:tableId`

Access: owner.

#### `DELETE /owner/tables/:tableId`

Access: owner.

Implementation notes:

- prefer soft delete or `isActive=false`;
- inactive tables must not be available for new bookings.

---

## 10. Schedule endpoints

### 10.1. Get club working hours

#### `GET /schedule/working-hours`

Access: public or authenticated.

### 10.2. Owner updates weekly working hours

#### `PUT /owner/schedule/working-hours`

Access: owner.

Request:

```json
{
  "timezone": "Europe/Moscow",
  "days": [
    {
      "dayOfWeek": 1,
      "opensAt": "12:00",
      "closesAt": "22:00",
      "isClosed": false
    }
  ]
}
```

### 10.3. Schedule exceptions

#### `GET /schedule/exceptions`

Access: public or authenticated.

#### `POST /owner/schedule/exceptions`

Access: owner/admin depending on policy.

Request:

```json
{
  "date": "2026-05-09",
  "type": "closed",
  "opensAt": null,
  "closesAt": null,
  "reason": "Holiday"
}
```

Types:

```txt
closed
short_day
special_hours
```

#### `PATCH /owner/schedule/exceptions/:exceptionId`

Access: owner/admin depending on policy.

#### `DELETE /owner/schedule/exceptions/:exceptionId`

Access: owner.

### 10.4. Resource closures

#### `POST /owner/rooms/:roomId/closures`

Access: owner/admin depending on policy.

#### `POST /owner/tables/:tableId/closures`

Access: owner/admin depending on policy.

Resource closure request:

```json
{
  "startAt": "2026-05-02T12:00:00+03:00",
  "endAt": "2026-05-02T18:00:00+03:00",
  "reason": "Private event"
}
```

---

## 11. Booking rules

### 11.1. Get booking rules

#### `GET /booking-rules`

Access: authenticated.

Response:

```json
{
  "data": {
    "slotMinutes": 30,
    "minCancellationNoticeMinutes": 120,
    "maxActiveBookingsPerUser": 3,
    "allowFullDayBooking": true
  }
}
```

### 11.2. Update booking rules

#### `PUT /owner/booking-rules`

Access: owner.

Request:

```json
{
  "slotMinutes": 30,
  "minCancellationNoticeMinutes": 120,
  "maxActiveBookingsPerUser": 3,
  "allowFullDayBooking": true
}
```

Implementation notes:

- `slotMinutes` is fixed to 30 in MVP unless future requirements change;
- rule changes should be logged in audit logs;
- rule changes should not silently invalidate existing confirmed bookings.

---

## 12. Booking endpoints

### 12.1. Check availability

#### `GET /bookings/availability`

Access: user/admin/owner.

Query parameters:

| Name | Type | Required | Description |
|---|---|---:|---|
| `date` | ISO date | yes | Date to check |
| `roomId` | string | no | Filter by room |
| `partySize` | number | no | Required capacity |
| `durationMinutes` | number | no | Desired booking duration |

Response:

```json
{
  "data": {
    "date": "2026-05-02",
    "slotMinutes": 30,
    "rooms": [
      {
        "id": "room_id",
        "name": "Main hall",
        "tables": [
          {
            "id": "table_id",
            "number": "T1",
            "capacity": 6,
            "availableSlots": [
              {
                "startAt": "2026-05-02T12:00:00+03:00",
                "endAt": "2026-05-02T12:30:00+03:00"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

Implementation notes:

- availability response is informational only;
- final conflict check must happen when creating/confirming booking;
- do not rely only on frontend availability data.

### 12.2. Create booking request

#### `POST /bookings`

Access: user/admin/owner.

Request:

```json
{
  "tableId": "table_id",
  "startAt": "2026-05-02T18:00:00+03:00",
  "endAt": "2026-05-02T21:00:00+03:00",
  "comment": "Warhammer game"
}
```

Response:

```json
{
  "data": {
    "id": "booking_id",
    "status": "pending",
    "tableId": "table_id",
    "startAt": "2026-05-02T18:00:00+03:00",
    "endAt": "2026-05-02T21:00:00+03:00"
  }
}
```

Validation rules:

- user must not be blocked;
- profile must be complete;
- required consent must be accepted;
- phone must be present for real booking flow;
- start/end must align with 30-minute slots;
- booking must be inside club working hours;
- table and room must be active and available;
- user must not exceed active booking limit;
- overlapping confirmed/pending bookings for the same table must be rejected according to policy.

Conflict response:

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "The selected table is not available for this time range",
    "requestId": "req_..."
  }
}
```

### 12.3. Get my bookings

#### `GET /bookings/my`

Access: user/admin/owner.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `status` | string | Filter by status |
| `from` | datetime | Start range |
| `to` | datetime | End range |
| `page` | number | Page |
| `pageSize` | number | Page size |

### 12.4. Get booking details

#### `GET /bookings/:bookingId`

Access:

- booking owner;
- admin;
- owner.

Response must expose contact data according to role and privacy rules.

### 12.5. Cancel my booking

#### `POST /bookings/:bookingId/cancel`

Access: booking owner.

Request:

```json
{
  "reason": "Plans changed"
}
```

Response: updated booking.

Validation rules:

- only pending/confirmed bookings may be cancelled by user;
- cancellation must respect minimum cancellation notice;
- cancellation action must be recorded in status history.

### 12.6. Admin list bookings

#### `GET /admin/bookings`

Access: admin/owner.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `status` | string | Booking status |
| `date` | ISO date | Booking date |
| `roomId` | string | Room filter |
| `tableId` | string | Table filter |
| `userId` | string | User filter, owner only if sensitive |
| `page` | number | Page |
| `pageSize` | number | Page size |

### 12.7. Admin confirm booking

#### `POST /admin/bookings/:bookingId/confirm`

Access: admin/owner.

Response: updated booking.

Implementation notes:

- run final conflict check in a transaction;
- reject if another confirmed booking overlaps;
- notify user after confirmation;
- write audit log.

### 12.8. Admin cancel booking

#### `POST /admin/bookings/:bookingId/cancel`

Access: admin/owner.

Request:

```json
{
  "reason": "Club schedule changed"
}
```

Response: updated booking.

### 12.9. Admin move booking

#### `POST /admin/bookings/:bookingId/move`

Access: admin/owner.

Request:

```json
{
  "tableId": "new_table_id",
  "startAt": "2026-05-02T19:00:00+03:00",
  "endAt": "2026-05-02T22:00:00+03:00",
  "reason": "Moved to another room"
}
```

Response: updated booking.

Implementation notes:

- same validation as booking creation;
- run conflict check in a transaction;
- notify user.

---

## 13. Games catalog endpoints

### 13.1. List games

#### `GET /games`

Access: authenticated.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `q` | string | Search query |
| `genre` | string | Genre |
| `difficulty` | string | Difficulty |
| `minPlayers` | number | Minimum players |
| `maxPlayers` | number | Maximum players |

### 13.2. Get game

#### `GET /games/:gameId`

Access: authenticated.

### 13.3. Owner create game

#### `POST /owner/games`

Access: owner.

Request:

```json
{
  "title": "Dune: Imperium",
  "genre": "strategy",
  "durationMinutes": 120,
  "recommendedPlayersMin": 2,
  "recommendedPlayersMax": 4,
  "difficulty": "medium",
  "description": "...",
  "imageUrl": "https://..."
}
```

### 13.4. Owner update game

#### `PATCH /owner/games/:gameId`

Access: owner.

### 13.5. Owner delete game

#### `DELETE /owner/games/:gameId`

Access: owner.

Implementation notes:

- prefer soft delete for games referenced by meetups;
- deleted games should remain visible in historical meetups as archived titles.

---

## 14. Meetup endpoints

### 14.1. List open meetups

#### `GET /meetups`

Access: authenticated.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `status` | string | Meetup status |
| `gameId` | string | Game filter |
| `date` | ISO date | Desired date |
| `tag` | string | Tag filter |
| `page` | number | Page |
| `pageSize` | number | Page size |

### 14.2. Create meetup

#### `POST /meetups`

Access: user/admin/owner.

Request for catalog game:

```json
{
  "gameId": "game_id",
  "title": "Dune Imperium on Saturday",
  "plannedStartAt": "2026-05-02T18:00:00+03:00",
  "plannedEndAt": "2026-05-02T21:00:00+03:00",
  "minPlayers": 4,
  "maxPlayers": 4,
  "tags": ["beginner-friendly", "needs-host"],
  "description": "Looking for 3 players"
}
```

Request for custom game:

```json
{
  "customGameTitle": "My own wargame scenario",
  "title": "Looking for players",
  "plannedStartAt": "2026-05-02T18:00:00+03:00",
  "plannedEndAt": "2026-05-02T21:00:00+03:00",
  "minPlayers": 2,
  "maxPlayers": 4,
  "tags": ["2000-points"],
  "description": "..."
}
```

Validation rules:

- either `gameId` or `customGameTitle` is required;
- creator automatically becomes participant;
- meeting does not reserve a table immediately;
- status starts as `open`.

### 14.3. Get meetup details

#### `GET /meetups/:meetupId`

Access: authenticated.

Response includes:

- meetup data;
- participant count;
- participant display names;
- visible contact fields according to privacy settings;
- booking status if booking exists.

### 14.4. Join meetup

#### `POST /meetups/:meetupId/join`

Access: user/admin/owner.

Response: updated meetup participation.

Validation rules:

- meetup must be open;
- user must not already participate;
- meetup must not exceed `maxPlayers`;
- blocked users cannot join;
- if participant count reaches `minPlayers`, meetup may become `ready_to_book`.

### 14.5. Leave meetup

#### `POST /meetups/:meetupId/leave`

Access: participant.

Response: updated meetup.

### 14.6. Create booking request for meetup

#### `POST /meetups/:meetupId/create-booking-request`

Access: meetup creator/admin/owner depending on policy.

Request:

```json
{
  "tableId": "table_id"
}
```

Response:

```json
{
  "data": {
    "meetupId": "meetup_id",
    "bookingId": "booking_id",
    "status": "booking_pending"
  }
}
```

Validation rules:

- meetup must have enough participants;
- meetup must not already have an active booking;
- booking uses planned start/end time;
- booking status is `pending` and still requires admin confirmation.

### 14.7. Cancel meetup

#### `POST /meetups/:meetupId/cancel`

Access: creator/admin/owner.

Request:

```json
{
  "reason": "Not enough players"
}
```

Response: updated meetup.

---

## 15. Meetup messages

MVP uses a simple message feed, not realtime chat.

### 15.1. List meetup messages

#### `GET /meetups/:meetupId/messages`

Access: meetup participant/admin/owner.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `page` | number | Page |
| `pageSize` | number | Page size |

### 15.2. Create meetup message

#### `POST /meetups/:meetupId/messages`

Access: meetup participant.

Request:

```json
{
  "text": "I can bring the expansion."
}
```

Response: created message.

Implementation notes:

- do not log message content;
- apply basic length validation;
- allow future moderation fields;
- no WebSocket required in MVP.

### 15.3. Delete own message

#### `DELETE /meetups/:meetupId/messages/:messageId`

Access: message author/admin/owner.

Implementation notes:

- prefer soft delete;
- retain moderation/audit metadata when required.

---

## 16. Friends endpoints

MVP friends functionality is intentionally minimal.

### 16.1. List friends

#### `GET /friends`

Access: authenticated.

### 16.2. Send friend request

#### `POST /friends/requests`

Access: authenticated.

Request:

```json
{
  "userId": "target_user_id"
}
```

### 16.3. Accept friend request

#### `POST /friends/requests/:requestId/accept`

Access: request recipient.

### 16.4. Decline friend request

#### `POST /friends/requests/:requestId/decline`

Access: request recipient.

### 16.5. Remove friend

#### `DELETE /friends/:friendUserId`

Access: authenticated.

---

## 17. Notifications endpoints

### 17.1. List my notifications

#### `GET /notifications`

Access: authenticated.

### 17.2. Mark notification as read

#### `POST /notifications/:notificationId/read`

Access: notification owner.

### 17.3. Notification preferences

#### `GET /users/me/notification-settings`

Access: authenticated.

#### `PATCH /users/me/notification-settings`

Access: authenticated.

Request:

```json
{
  "telegramBookingUpdates": true,
  "telegramMeetupUpdates": true,
  "telegramReminders": true
}
```

Implementation notes:

- Telegram is the primary notification channel;
- email notifications are optional and may be added later;
- notification jobs should use Redis/BullMQ in production.

---

## 18. Admin endpoints

### 18.1. Admin dashboard

#### `GET /admin/dashboard`

Access: admin/owner.

Response includes operational summary:

- pending bookings count;
- today bookings;
- upcoming confirmed bookings;
- open meetups needing attention.

### 18.2. Admin users list

#### `GET /admin/users`

Access: admin/owner.

Important privacy rule:

- admins must receive only minimum contact data;
- owners may receive more fields if required.

### 18.3. Admin get user summary

#### `GET /admin/users/:userId`

Access: admin/owner.

Response must be role-filtered.

### 18.4. Block user

#### `POST /owner/users/:userId/block`

Access: owner.

Request:

```json
{
  "reason": "Repeated no-shows"
}
```

### 18.5. Unblock user

#### `POST /owner/users/:userId/unblock`

Access: owner.

---


## 18.6. Emergency contact access

#### `POST /admin/users/:userId/emergency-contact-access`

Access: admin/owner.

Purpose: reveal the user's emergency phone number only when it is operationally necessary, for example when Telegram is unavailable and the booking requires urgent contact.

Request:

```json
{
  "reason": "Telegram unavailable; need to confirm today's booking",
  "relatedBookingId": "booking_id"
}
```

Response:

```json
{
  "data": {
    "displayName": "Ivan",
    "telegramUsername": "ivan_boardgames",
    "phone": "+79990000000"
  }
}
```

Rules:

- phone is masked everywhere else by default;
- access must be audit-logged;
- audit metadata must not store the raw phone value;
- repeated access may be rate-limited or require owner review later.

## 19. Owner statistics and exports

Implementation priority: these endpoints are MVP 3 / portfolio polish by default. They may be implemented earlier only if the club explicitly requires them for real operations. Audit log endpoints remain MVP 1.

### 19.1. Booking statistics

#### `GET /owner/stats/bookings`

Access: owner.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `from` | ISO date | Start date |
| `to` | ISO date | End date |

Response includes:

- total bookings;
- confirmed bookings;
- cancelled bookings;
- table utilization;
- peak days/hours.

### 19.2. Game statistics

#### `GET /owner/stats/games`

Access: owner.

Response includes:

- popular games;
- popular meetup tags;
- number of meetups by status.

### 19.3. Export bookings

#### `GET /owner/exports/bookings.csv`

Access: owner.

Response: CSV file.

### 19.4. Export users

#### `GET /owner/exports/users.csv`

Access: owner.

Privacy notes:

- include only necessary fields;
- exporting personal data must be audit-logged;
- do not include Telegram ID unless required for technical operations.

---

## 20. Audit log endpoints

### 20.1. List audit logs

#### `GET /owner/audit-logs`

Access: owner.

Query parameters:

| Name | Type | Description |
|---|---|---|
| `actorUserId` | string | Actor filter |
| `entityType` | string | Entity type |
| `entityId` | string | Entity id |
| `from` | datetime | Start date |
| `to` | datetime | End date |

Audit events should include:

- booking confirmation;
- booking cancellation;
- booking movement;
- user block/unblock;
- schedule changes;
- room/table changes;
- booking rule changes;
- export actions;
- legal document changes;
- emergency full-phone reveal.

---

## 21. Legal and privacy endpoints

### 21.1. Get active legal documents

#### `GET /legal/documents/active`

Access: public.

Response:

```json
{
  "data": [
    {
      "type": "privacy_policy",
      "version": "1.0.0",
      "title": "Privacy Policy",
      "contentUrl": "/legal/privacy-policy-v1.md"
    }
  ]
}
```

### 21.2. Accept legal documents

#### `POST /legal/consents`

Access: authenticated.

Request:

```json
{
  "documents": [
    {
      "type": "privacy_policy",
      "version": "1.0.0"
    },
    {
      "type": "personal_data_processing_consent",
      "version": "1.0.0"
    }
  ]
}
```

Response:

```json
{
  "data": {
    "accepted": true
  }
}
```

Implementation notes:

- store accepted document type, version, timestamp, IP, user-agent;
- if legal documents change, users may be required to accept new versions;
- exact legal text must be reviewed by the club or legal advisor.

### 21.3. My data export request

#### `POST /users/me/data-export-request`

Access: authenticated.

Response:

```json
{
  "data": {
    "status": "received"
  }
}
```

---

## 22. Telegram webhook endpoints

### 22.1. Telegram update webhook

#### `POST /telegram/webhook`

Access: Telegram only, verified by secret token/signature policy.

Request: Telegram update payload.

Response:

```json
{
  "ok": true
}
```

Implementation notes:

- production and staging should use webhook;
- local development may use polling;
- webhook endpoint must validate secret;
- do not log full Telegram update payload if it contains personal data;
- bot command handling should be delegated to `apps/bot` or bot service layer.

### 22.2. Internal bot API

The bot may call normal API endpoints using a service token or dedicated internal auth mechanism.

Internal bot endpoints must never be exposed without authentication.

Possible internal endpoints:

```txt
POST /internal/bot/booking-notification-delivered
POST /internal/bot/link-user
POST /internal/bot/admin-action
```

These should be introduced only when needed.

---

## 23. Demo mode endpoints

Demo mode is used for portfolio presentation without real personal data.

### 23.1. Demo login

#### `POST /demo/auth/login`

Access: staging/demo only.

Request:

```json
{
  "role": "user"
}
```

Allowed roles:

```txt
user
admin
owner
```

Implementation notes:

- must be disabled in production unless explicitly configured as a safe public demo;
- demo accounts must not contain real personal data;
- demo data should be resettable.

### 23.2. Reset demo data

#### `POST /demo/reset`

Access: demo environment only.

---

## 24. Rate limiting

Recommended rate limits:

| Area | Suggested limit |
|---|---:|
| Auth endpoints | strict |
| Booking creation | moderate |
| Meetup messages | moderate |
| Public catalog | relaxed |
| Admin actions | moderate |
| Telegram webhook | high but protected |

Implementation notes:

- Redis can be used for rate limiting;
- rate limit errors should return `429 RATE_LIMITED`;
- do not reveal whether a Telegram/email account exists through auth errors.

---

## 25. Security and privacy requirements

### 25.1. Do not log sensitive data

Never log:

- Telegram bot token;
- Telegram Mini App raw init data;
- JWT/session tokens;
- cookies;
- phone numbers;
- emails;
- full Telegram update payloads;
- private meetup message content;
- authorization headers.

### 25.2. Contact visibility

Default visibility:

| Field | User self | Meetup participant | Admin | Owner |
|---|---:|---:|---:|---:|
| display name | yes | yes | yes | yes |
| Telegram username | yes | only if allowed | yes if needed | yes |
| phone | yes | no | masked by default; full value only via audit-logged break-glass action | yes if needed, audit-logged |
| email | yes | no | no/masked | yes if needed |
| Telegram ID | no UI | no | no UI | technical only |

### 25.3. Auditability

All privileged actions must create audit records. Emergency access to a full phone number must also create an audit record and must not store the raw phone value in audit metadata.

### 25.4. Data minimization

Collect only data needed for club operations:

- display name;
- Telegram identity;
- phone for emergency contact;
- optional email;
- consents.

---

## 26. OpenAPI/Swagger requirements

The backend must generate OpenAPI/Swagger docs from code.

Minimum requirements:

- all public DTOs documented;
- auth requirements visible;
- role-specific endpoints tagged;
- common error responses documented;
- examples included for critical endpoints;
- Swagger available locally and on staging;
- production Swagger may be disabled or protected.

Recommended Swagger tags:

```txt
Auth
Users
Public
Rooms
Tables
Schedule
Booking Rules
Bookings
Games
Meetups
Meetup Messages
Friends
Notifications
Admin
Owner
Legal
Telegram
Demo
Health
```

---

## 27. API testing requirements

Critical API tests:

### 27.1. Booking flow

1. User creates booking request.
2. Booking is `pending`.
3. Admin confirms booking.
4. Booking becomes `confirmed`.
5. User receives notification job.

### 27.2. Booking conflict

1. User A creates/has confirmed booking for table T at time range R.
2. User B tries to create overlapping booking.
3. API returns `409 BOOKING_CONFLICT`.

### 27.3. Concurrent booking

1. Two users attempt to book the same table/time concurrently.
2. Only one request succeeds.
3. The other request fails with `BOOKING_CONFLICT` or equivalent.

### 27.4. Role protection

1. Regular user cannot access owner endpoints.
2. Admin cannot change owner-only booking rules if policy forbids it.
3. Guest cannot create booking.

### 27.5. Meetup flow

1. User creates meetup.
2. Other users join.
3. Meetup becomes ready to book.
4. Booking request is created.
5. Admin confirms booking.

---

## 28. Versioning policy

MVP uses:

```txt
/api/v1
```

Breaking changes require:

- new API version;
- migration notes;
- updated OpenAPI docs;
- updated frontend/bot clients;
- changelog entry.

Non-breaking changes:

- adding optional fields;
- adding new endpoints;
- adding new enum values only if clients handle unknown values safely.

---

## 29. Suggested implementation order

1. `GET /health`
2. `POST /auth/telegram`
3. `GET /auth/me`
4. `GET/PATCH /users/me/profile`
5. owner rooms CRUD
6. owner tables CRUD
7. schedule working hours
8. schedule exceptions
9. booking rules
10. booking availability
11. create booking request
12. admin booking list
13. admin confirm/cancel/move booking
14. Telegram notification integration
15. games catalog
16. meetups
17. meetup messages
18. friends minimal flow
19. owner statistics and exports
20. legal/consent endpoints
21. demo endpoints

---

## 30. Definition of Done for API endpoints

An endpoint is done only when:

- route implemented;
- request DTO implemented;
- response DTO implemented;
- validation implemented;
- authorization implemented;
- Swagger docs generated;
- success and failure tests added;
- sensitive fields are not leaked;
- audit log added for privileged mutations;
- errors use standard error format;
- README/API docs updated if needed.

