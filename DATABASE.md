# DATABASE.md

Database design for the board game and wargame club booking application.

This document describes the initial PostgreSQL data model, domain entities, relationships, constraints, indexes, and data rules. It is intended for developers, Codex agents, reviewers, and future maintainers.

---

## 1. Database goals

The database must support:

- one real board game and wargame club;
- room and table management;
- configurable club schedule;
- fixed 30-minute booking slots represented as time intervals;
- admin-confirmed bookings;
- prevention of double booking;
- open game meetups;
- simple meetup message feed;
- Telegram-first authentication;
- optional email for backup access;
- phone number for emergency contact only;
- privacy-aware access control;
- audit logging;
- legal consent tracking;
- demo data for portfolio mode.

The database is designed for PostgreSQL and Prisma ORM.

---

## 2. Core principles

### 2.1. One club, not multi-tenant SaaS

The MVP is designed for one club. Do not introduce multi-club abstractions unless there is a clear product decision to turn the project into SaaS later.

Acceptable:

- `club_settings`
- `rooms`
- `tables`
- global booking rules

Avoid in MVP:

- `organizations`
- `tenants`
- `club_id` on every table
- multi-tenant auth complexity

### 2.2. Bookings are intervals, not stored slot rows

The UI uses 30-minute slots, but the database stores bookings as intervals:

```ts
start_at: DateTime
end_at: DateTime
```

This keeps booking updates, cancellation, display, and conflict checks simpler.

Slot validation belongs to business logic:

- `start_at` must align to a 30-minute boundary;
- `end_at` must align to a 30-minute boundary;
- `end_at` must be greater than `start_at`;
- duration must satisfy booking rules;
- full-day booking is represented as opening time to closing time.

### 2.3. Protect against double booking at the database/service level

The system must prevent two confirmed or pending bookings from occupying the same table at overlapping times.

Conflict condition:

```sql
existing.start_at < requested.end_at
AND existing.end_at > requested.start_at
```

For MVP, implement:

- transaction around booking creation/confirmation;
- service-level overlap check;
- integration test for concurrent requests.

Recommended PostgreSQL hardening after MVP foundation:

- PostgreSQL range type for booking interval;
- exclusion constraint on `(table_id, tstzrange(start_at, end_at))` for active statuses.

### 2.4. Privacy by design

Do not store personal data unless needed.

Required personal data:

- display name;
- Telegram ID for Telegram auth;
- phone number for emergency contact;
- consent records.

Optional personal data:

- Telegram username;
- email.

Avoid in MVP:

- user birth date;
- address;
- passport data;
- social profiles beyond Telegram;
- marketing tracking identifiers.

### 2.5. Soft delete for users

User deletion should not destroy historical booking integrity.

Recommended approach:

- soft-delete user account;
- anonymize personal profile fields;
- preserve booking records in anonymized form;
- preserve audit logs where legally/operationally needed.

---

## 3. Naming conventions

Use clear snake_case names in the database.

Examples:

```text
users
user_profiles
booking_rules
schedule_exceptions
meetup_participants
created_at
updated_at
deleted_at
```

Enums should use uppercase database values or Prisma enums with explicit mappings.

Recommended TypeScript enum names:

```ts
BookingStatus
MeetupStatus
UserRole
NotificationChannel
```

Recommended DB values:

```text
pending
confirmed
cancelled_by_user
cancelled_by_admin
completed
expired
```

---

## 4. Entity overview

Main entities:

```text
users
user_profiles
user_roles
rooms
tables
club_working_hours
schedule_exceptions
room_closures
table_closures
booking_rules
bookings
booking_status_history
games
meetups
meetup_participants
meetup_messages
meetup_tags
friendships
notifications
audit_logs
legal_documents
consents
```

Optional later entities:

```text
user_sessions
refresh_tokens
email_login_tokens
passwordless_login_tokens
file_uploads
admin_notes
moderation_reports
backup_runs
```

---

## 5. Users and access control

## 5.1. `users`

Represents the system account.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `telegram_id` | String | yes for Telegram users | Unique if present |
| `telegram_username` | String | no | May be absent or changed by user |
| `email` | String | no | Optional backup login/contact |
| `email_verified_at` | DateTime | no | For future email login |
| `status` | UserStatus | yes | active, blocked, deleted |
| `blocked_at` | DateTime | no | Set when blocked |
| `blocked_reason` | String | no | Owner/admin note |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |
| `deleted_at` | DateTime | no | Soft delete |

Recommended indexes:

```text
unique users.telegram_id where telegram_id is not null
unique users.email where email is not null
index users.status
index users.created_at
```

Notes:

- Do not rely on `telegram_username` as a stable identifier.
- Store Telegram ID as a string to avoid numeric range issues.
- Do not expose internal user IDs in public URLs unless needed.

---

## 5.2. `user_profiles`

Stores user-facing profile data.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `user_id` | UUID | yes | Unique FK to users |
| `display_name` | String | yes | Visible name/nickname |
| `phone` | String? | no at DB level | Emergency contact only; required by business rule before real booking creation |
| `phone_visible_to_admin` | Boolean | yes | Default false or limited use |
| `show_telegram_to_meetup_participants` | Boolean | yes | Default true or user-controlled |
| `show_phone_to_meetup_participants` | Boolean | yes | Default false |
| `avatar_url` | String | no | Optional, avoid in MVP unless needed |
| `bio` | String | no | Optional later |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
unique user_profiles.user_id
index user_profiles.display_name
```

Privacy notes:

- Phone is collected because Telegram can be unstable and emergency contact may be needed.
- Phone is nullable in the database to support deletion/anonymization.
- Booking creation must validate that phone is present for real, non-demo bookings.
- Phone should be masked in admin UI unless explicitly needed.
- Full phone reveal must be a break-glass action and must be audit-logged.
- Do not log phone numbers.

---

## 5.3. `user_roles`

Stores role assignments.

Recommended roles:

```text
guest
user
admin
owner
```

`guest` is usually not stored; it represents an unauthenticated visitor.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `user_id` | UUID | yes | FK to users |
| `role` | UserRole | yes | user, admin, owner |
| `created_at` | DateTime | yes | Auto |

Recommended constraints:

```text
unique user_roles.user_id + user_roles.role
```

---

## 6. Club resources

## 6.1. `rooms`

Represents club rooms/areas.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `name` | String | yes | Room name |
| `description` | String | no | Optional |
| `sort_order` | Int | yes | UI ordering |
| `is_active` | Boolean | yes | Soft disable |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index rooms.is_active
index rooms.sort_order
```

---

## 6.2. `tables`

Represents game tables.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `room_id` | UUID | yes | FK to rooms |
| `number` | String | yes | Human-readable number/name |
| `capacity` | Int | yes | Number of players |
| `is_active` | Boolean | yes | Soft disable |
| `sort_order` | Int | yes | UI ordering |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended constraints:

```text
unique tables.room_id + tables.number
```

Recommended indexes:

```text
index tables.room_id
index tables.is_active
index tables.capacity
```

---

## 7. Schedule and availability

## 7.1. `club_working_hours`

Base weekly schedule.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `day_of_week` | Int | yes | 0-6 or 1-7, document convention |
| `opens_at` | Time | no | Null if closed |
| `closes_at` | Time | no | Null if closed |
| `is_closed` | Boolean | yes | Closed whole day |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended constraints:

```text
unique club_working_hours.day_of_week
check day_of_week between 1 and 7
check opens_at < closes_at when is_closed = false
```

Recommended convention:

```text
1 = Monday
7 = Sunday
```

---

## 7.2. `schedule_exceptions`

Date-specific schedule overrides.

Examples:

- public holiday;
- closed day;
- shortened day;
- special event day.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `date` | Date | yes | Calendar date |
| `opens_at` | Time | no | Null if closed |
| `closes_at` | Time | no | Null if closed |
| `is_closed` | Boolean | yes | Closed whole day |
| `reason` | String | no | Visible/admin reason |
| `created_by_user_id` | UUID | no | Admin/owner |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended constraints:

```text
unique schedule_exceptions.date
check opens_at < closes_at when is_closed = false
```

---

## 7.3. `room_closures`

Blocks a room for a period.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `room_id` | UUID | yes | FK to rooms |
| `start_at` | DateTime | yes | Start |
| `end_at` | DateTime | yes | End |
| `reason` | String | no | Maintenance, event, etc. |
| `created_by_user_id` | UUID | no | Admin/owner |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index room_closures.room_id
index room_closures.start_at
index room_closures.end_at
```

---

## 7.4. `table_closures`

Blocks a specific table for a period.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `table_id` | UUID | yes | FK to tables |
| `start_at` | DateTime | yes | Start |
| `end_at` | DateTime | yes | End |
| `reason` | String | no | Maintenance, tournament, etc. |
| `created_by_user_id` | UUID | no | Admin/owner |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index table_closures.table_id
index table_closures.start_at
index table_closures.end_at
```

---

## 8. Booking rules

## 8.1. `booking_rules`

Stores owner-configurable rules.

For MVP there should be one active row.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `slot_step_minutes` | Int | yes | Default 30 |
| `min_booking_duration_minutes` | Int | yes | Example: 30 |
| `max_booking_duration_minutes` | Int | no | Null if no limit |
| `allow_full_day_booking` | Boolean | yes | Default true |
| `min_cancel_before_minutes` | Int | yes | Example: 120 |
| `max_active_bookings_per_user` | Int | yes | Example: 3 |
| `requires_admin_confirmation` | Boolean | yes | true |
| `is_active` | Boolean | yes | only one active |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended constraints:

```text
slot_step_minutes = 30 for MVP
min_booking_duration_minutes >= slot_step_minutes
max_active_bookings_per_user >= 0
```

---

## 9. Bookings

## 9.1. Booking statuses

Recommended enum:

```text
pending
confirmed
cancelled_by_user
cancelled_by_admin
completed
expired
```

Meaning:

| Status | Meaning |
|---|---|
| `pending` | User created request; waiting for admin confirmation |
| `confirmed` | Admin confirmed booking |
| `cancelled_by_user` | User cancelled according to rules |
| `cancelled_by_admin` | Admin cancelled or rejected |
| `completed` | Booking time passed and booking is closed |
| `expired` | Request expired or related meetup failed |

---

## 9.2. `bookings`

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `user_id` | UUID | yes | Booking owner |
| `table_id` | UUID | yes | FK to tables |
| `meetup_id` | UUID | no | FK to meetups if created from meetup |
| `start_at` | DateTime | yes | Start timestamp |
| `end_at` | DateTime | yes | End timestamp |
| `status` | BookingStatus | yes | Current status |
| `guest_count` | Int | no | Optional expected players |
| `comment` | String | no | User comment |
| `admin_comment` | String | no | Internal admin note |
| `confirmed_by_user_id` | UUID | no | Admin who confirmed |
| `confirmed_at` | DateTime | no | Confirmation time |
| `cancelled_by_user_id` | UUID | no | User/admin who cancelled |
| `cancelled_at` | DateTime | no | Cancellation time |
| `cancellation_reason` | String | no | Optional reason |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index bookings.user_id
index bookings.table_id
index bookings.meetup_id
index bookings.status
index bookings.start_at
index bookings.end_at
index bookings.table_id + bookings.start_at + bookings.end_at
```

Recommended constraints:

```text
check end_at > start_at
```

Conflict statuses:

```text
pending
confirmed
```

Only these statuses should block a table.

---

## 9.3. Preventing booking conflicts

Service-level algorithm:

1. Validate user is active and not blocked.
2. Validate requested time aligns to 30-minute slots.
3. Validate requested time is within club working hours or exception hours.
4. Validate room/table is active and not closed.
5. Validate user active booking limit.
6. Start DB transaction.
7. Check overlapping active bookings for the same table.
8. Create `pending` booking.
9. Write `booking_status_history` entry.
10. Commit transaction.
11. Queue Telegram/admin notification.

Overlap query:

```sql
SELECT id
FROM bookings
WHERE table_id = :table_id
  AND status IN ('pending', 'confirmed')
  AND start_at < :requested_end_at
  AND end_at > :requested_start_at
LIMIT 1;
```

For stronger protection, consider PostgreSQL advisory locks or exclusion constraints.

Suggested advisory lock key:

```text
booking_table_{table_id}_{date}
```

---

## 9.4. `booking_status_history`

Tracks booking lifecycle.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `booking_id` | UUID | yes | FK to bookings |
| `from_status` | BookingStatus | no | Null for initial creation |
| `to_status` | BookingStatus | yes | New status |
| `changed_by_user_id` | UUID | no | User/admin/system |
| `reason` | String | no | Optional |
| `created_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index booking_status_history.booking_id
index booking_status_history.created_at
```

---

## 10. Games catalog

## 10.1. `games`

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `title` | String | yes | Game title |
| `genre` | String | no | Board game, wargame, euro, etc. |
| `description` | String | no | Public description |
| `duration_minutes` | Int | no | Approximate duration |
| `min_players` | Int | no | Recommended min |
| `max_players` | Int | no | Recommended max |
| `complexity` | GameComplexity | no | light, medium, heavy |
| `image_url` | String | no | Cover/photo |
| `is_active` | Boolean | yes | Visible in catalog |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index games.title
index games.genre
index games.is_active
```

Recommended optional enum:

```text
light
medium
heavy
```

---

## 11. Meetups

## 11.1. Meetup statuses

Recommended enum:

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

Meaning:

| Status | Meaning |
|---|---|
| `draft` | Creator is preparing meetup |
| `open` | Meetup is open for participants |
| `ready_to_book` | Required participants reached |
| `booking_pending` | Booking request created and awaits admin confirmation |
| `booked` | Related booking confirmed |
| `cancelled` | Cancelled by creator/admin/system |
| `expired` | Not enough participants or time passed |
| `completed` | Meetup finished |

---

## 11.2. `meetups`

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `created_by_user_id` | UUID | yes | Creator |
| `game_id` | UUID | no | FK to games |
| `custom_game_title` | String | no | Used when game is not in catalog |
| `title` | String | yes | Meetup title |
| `description` | String | no | Details |
| `start_at` | DateTime | yes | Desired start |
| `end_at` | DateTime | yes | Desired end |
| `min_participants` | Int | yes | Required count including creator or not — document convention |
| `max_participants` | Int | no | Optional cap |
| `status` | MeetupStatus | yes | Current status |
| `booking_id` | UUID | no | Related booking once created |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |
| `cancelled_at` | DateTime | no | Optional |
| `cancellation_reason` | String | no | Optional |

Recommended constraints:

```text
check end_at > start_at
check min_participants > 0
check max_participants is null or max_participants >= min_participants
check game_id is not null or custom_game_title is not null
```

Recommended indexes:

```text
index meetups.created_by_user_id
index meetups.game_id
index meetups.status
index meetups.start_at
index meetups.booking_id
```

Important rule:

A meetup does not reserve a table until enough participants are collected and a booking request is created.

---

## 11.3. `meetup_participants`

Recommended participant statuses:

```text
joined
left
removed
confirmed
```

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `meetup_id` | UUID | yes | FK to meetups |
| `user_id` | UUID | yes | FK to users |
| `status` | MeetupParticipantStatus | yes | joined, left, removed, confirmed |
| `joined_at` | DateTime | yes | Auto |
| `left_at` | DateTime | no | If left |

Recommended constraints:

```text
unique meetup_participants.meetup_id + meetup_participants.user_id
```

Recommended indexes:

```text
index meetup_participants.meetup_id
index meetup_participants.user_id
index meetup_participants.status
```

---

## 11.4. `meetup_messages`

Simple message feed for MVP. Not a realtime chat.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `meetup_id` | UUID | yes | FK to meetups |
| `user_id` | UUID | yes | Sender |
| `body` | String | yes | Message text |
| `deleted_at` | DateTime | no | Soft delete/hide |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index meetup_messages.meetup_id + meetup_messages.created_at
index meetup_messages.user_id
```

Privacy/security notes:

- Do not expose messages to non-participants.
- Do not log message body in application logs.
- Add moderation later if needed.

---

## 11.5. `meetup_tags`

Tags like:

- beginner friendly;
- host needed;
- 2000 points;
- own game;
- competitive;
- campaign.

Simplest MVP model:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `meetup_id` | UUID | yes | FK to meetups |
| `name` | String | yes | Tag text |

Recommended constraints:

```text
unique meetup_tags.meetup_id + meetup_tags.name
```

Later, if controlled tags are needed, split into:

```text
tags
meetup_tag_assignments
```

---

## 12. Friendships

## 12.1. `friendships`

Minimal friends feature for MVP 2.

Recommended statuses:

```text
pending
accepted
declined
blocked
```

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `requester_user_id` | UUID | yes | User who sent request |
| `addressee_user_id` | UUID | yes | User who receives request |
| `status` | FriendshipStatus | yes | pending, accepted, declined, blocked |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended constraints:

```text
check requester_user_id != addressee_user_id
unique requester_user_id + addressee_user_id
```

Note:

This model allows directional records. Service logic should avoid duplicate inverse pending requests.

---

## 13. Notifications

## 13.1. `notifications`

Tracks notification delivery attempts.

Recommended channels:

```text
telegram
email
system
```

Recommended statuses:

```text
queued
sent
failed
cancelled
```

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `user_id` | UUID | no | Recipient user |
| `channel` | NotificationChannel | yes | telegram/email/system |
| `type` | String | yes | booking_created, booking_confirmed, etc. |
| `status` | NotificationStatus | yes | queued/sent/failed |
| `payload` | Json | no | Avoid sensitive data |
| `scheduled_for` | DateTime | no | For reminders |
| `sent_at` | DateTime | no | Delivery time |
| `error_message` | String | no | Sanitized error |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index notifications.user_id
index notifications.status
index notifications.scheduled_for
index notifications.type
```

Do not store Telegram bot token or raw sensitive webhook payloads here.

---

## 14. Audit logs

## 14.1. `audit_logs`

Tracks important administrative and security actions.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `actor_user_id` | UUID | no | Null for system |
| `action` | String | yes | booking.confirmed, user.blocked, etc. |
| `entity_type` | String | yes | booking, user, table, etc. |
| `entity_id` | String | no | Target entity ID |
| `metadata` | Json | no | Sanitized details |
| `ip_address` | String | no | Store carefully |
| `user_agent` | String | no | Store carefully |
| `created_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index audit_logs.actor_user_id
index audit_logs.action
index audit_logs.entity_type + audit_logs.entity_id
index audit_logs.created_at
```

Do not put raw phone numbers, emails, tokens, cookies, or message bodies in audit metadata. For emergency phone reveal, store the fact that access happened, the reason/context, and the target user ID, but not the phone value itself.

---

## 15. Legal documents and consents

## 15.1. `legal_documents`

Versioned legal documents.

Recommended document types:

```text
privacy_policy
user_agreement
personal_data_consent
club_rules
```

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `type` | LegalDocumentType | yes | privacy_policy, etc. |
| `version` | String | yes | Example: 1.0.0 |
| `title` | String | yes | Display title |
| `content_md` | String | yes | Markdown content |
| `published_at` | DateTime | no | Null if draft |
| `is_active` | Boolean | yes | Current active version |
| `created_at` | DateTime | yes | Auto |
| `updated_at` | DateTime | yes | Auto |

Recommended constraints:

```text
unique legal_documents.type + legal_documents.version
```

Only one active document per type should be enforced by service logic or partial unique index.

---

## 15.2. `consents`

Records user consent acceptance.

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `user_id` | UUID | yes | FK to users |
| `legal_document_id` | UUID | yes | FK to legal_documents |
| `document_type` | LegalDocumentType | yes | Denormalized for easier queries |
| `document_version` | String | yes | Denormalized version |
| `accepted_at` | DateTime | yes | Timestamp |
| `ip_address` | String | no | Required if available |
| `user_agent` | String | no | Required if available |

Recommended indexes:

```text
index consents.user_id
index consents.document_type
index consents.accepted_at
unique consents.user_id + consents.legal_document_id
```

---

## 16. Optional authentication tables

These are not required for the first Telegram-only implementation but should be considered if email magic-link login is added.

## 16.1. `email_login_tokens`

Recommended fields:

| Field | Type | Required | Notes |
|---|---:|---:|---|
| `id` | UUID | yes | Primary key |
| `email` | String | yes | Target email |
| `token_hash` | String | yes | Never store raw token |
| `expires_at` | DateTime | yes | Short lifetime |
| `used_at` | DateTime | no | Prevent reuse |
| `created_at` | DateTime | yes | Auto |

Recommended indexes:

```text
index email_login_tokens.email
unique email_login_tokens.token_hash
index email_login_tokens.expires_at
```

---

## 17. Relationships overview

Simplified relationship graph:

```text
users 1---1 user_profiles
users 1---N user_roles
users 1---N bookings
users 1---N meetups created_by_user_id
users N---N meetups through meetup_participants
users 1---N meetup_messages
users N---N users through friendships

rooms 1---N tables
tables 1---N bookings
rooms 1---N room_closures
tables 1---N table_closures

meetups 0..1---1 bookings
meetups 1---N meetup_participants
meetups 1---N meetup_messages
meetups 1---N meetup_tags

audit_logs reference entities by type/id
legal_documents 1---N consents
users 1---N consents
```

---

## 18. Prisma enum draft

```prisma
enum UserStatus {
  active
  blocked
  deleted
}

enum UserRole {
  user
  admin
  owner
}

enum BookingStatus {
  pending
  confirmed
  cancelled_by_user
  cancelled_by_admin
  completed
  expired
}

enum MeetupStatus {
  draft
  open
  ready_to_book
  booking_pending
  booked
  cancelled
  expired
  completed
}

enum MeetupParticipantStatus {
  joined
  left
  removed
  confirmed
}

enum FriendshipStatus {
  pending
  accepted
  declined
  blocked
}

enum NotificationChannel {
  telegram
  email
  system
}

enum NotificationStatus {
  queued
  sent
  failed
  cancelled
}

enum LegalDocumentType {
  privacy_policy
  user_agreement
  personal_data_consent
  club_rules
}

enum GameComplexity {
  light
  medium
  heavy
}
```

---

## 19. Prisma model draft

This is an illustrative draft, not the final schema.

```prisma
model User {
  id               String      @id @default(uuid())
  telegramId       String?     @unique @map("telegram_id")
  telegramUsername String?     @map("telegram_username")
  email            String?     @unique
  emailVerifiedAt  DateTime?   @map("email_verified_at")
  status           UserStatus  @default(active)
  blockedAt        DateTime?   @map("blocked_at")
  blockedReason    String?     @map("blocked_reason")
  createdAt        DateTime    @default(now()) @map("created_at")
  updatedAt        DateTime    @updatedAt @map("updated_at")
  deletedAt        DateTime?   @map("deleted_at")

  profile          UserProfile?
  roles            UserRoleAssignment[]
  bookings         Booking[]
  meetups          Meetup[]   @relation("MeetupCreator")
  messages         MeetupMessage[]
  consents         Consent[]

  @@map("users")
}

model UserProfile {
  id                                   String   @id @default(uuid())
  userId                               String   @unique @map("user_id")
  displayName                          String   @map("display_name")
  phone                                String?
  phoneVisibleToAdmin                  Boolean  @default(false) @map("phone_visible_to_admin")
  showTelegramToMeetupParticipants     Boolean  @default(true) @map("show_telegram_to_meetup_participants")
  showPhoneToMeetupParticipants        Boolean  @default(false) @map("show_phone_to_meetup_participants")
  avatarUrl                            String?  @map("avatar_url")
  bio                                  String?
  createdAt                            DateTime @default(now()) @map("created_at")
  updatedAt                            DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])

  @@map("user_profiles")
}

model UserRoleAssignment {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  role      UserRole
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, role])
  @@map("user_roles")
}

model Room {
  id          String   @id @default(uuid())
  name        String
  description String?
  sortOrder   Int      @default(0) @map("sort_order")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  tables      ClubTable[]

  @@map("rooms")
}

model ClubTable {
  id        String   @id @default(uuid())
  roomId    String   @map("room_id")
  number    String
  capacity  Int
  isActive  Boolean  @default(true) @map("is_active")
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  room      Room      @relation(fields: [roomId], references: [id])
  bookings  Booking[]

  @@unique([roomId, number])
  @@map("tables")
}

model Booking {
  id                String        @id @default(uuid())
  userId            String        @map("user_id")
  tableId           String        @map("table_id")
  meetupId          String?       @map("meetup_id")
  startAt           DateTime      @map("start_at")
  endAt             DateTime      @map("end_at")
  status            BookingStatus @default(pending)
  guestCount        Int?          @map("guest_count")
  comment           String?
  adminComment      String?       @map("admin_comment")
  confirmedByUserId String?       @map("confirmed_by_user_id")
  confirmedAt       DateTime?     @map("confirmed_at")
  cancelledByUserId String?       @map("cancelled_by_user_id")
  cancelledAt       DateTime?     @map("cancelled_at")
  cancellationReason String?      @map("cancellation_reason")
  createdAt         DateTime      @default(now()) @map("created_at")
  updatedAt         DateTime      @updatedAt @map("updated_at")

  user              User          @relation(fields: [userId], references: [id])
  table             ClubTable     @relation(fields: [tableId], references: [id])

  @@index([userId])
  @@index([tableId])
  @@index([status])
  @@index([startAt])
  @@index([endAt])
  @@index([tableId, startAt, endAt])
  @@map("bookings")
}
```

---

## 20. Index strategy

Minimum required indexes:

```text
users.telegram_id unique
users.email unique
user_profiles.user_id unique
user_roles.user_id + role unique
rooms.is_active
tables.room_id
tables.room_id + number unique
bookings.table_id + start_at + end_at
bookings.user_id
bookings.status
meetups.status
meetups.start_at
meetup_participants.meetup_id + user_id unique
meetup_messages.meetup_id + created_at
notifications.status + scheduled_for
audit_logs.created_at
consents.user_id
```

Review indexes after real usage data appears. Avoid premature indexing of every field.

---

## 21. Data retention and deletion

## 21.1. User deletion

When a user requests deletion:

1. mark user as `deleted`;
2. set `deleted_at`;
3. anonymize profile:
   - display name → `Deleted user`;
   - phone → removed or replaced with null/placeholder depending schema;
   - email → null;
   - Telegram username → null;
   - Telegram ID → null or hashed/anonymized if legally acceptable;
4. preserve non-personal booking history;
5. write audit event.

Because `phone` is nullable in the schema, anonymization should remove the value by setting it to `null`. The business rule that requires phone before real booking creation must live in the booking/profile validation layer, not as a non-null database constraint.

## 21.2. Booking history

Booking history is operationally important and may be kept in anonymized form.

## 21.3. Meetup messages

Messages may contain personal data typed by users. For MVP:

- allow user/account deletion process to anonymize sender;
- consider deleting or anonymizing messages on user deletion;
- do not export raw messages unless needed.

---

## 22. Seed data

Seed data must support local development and portfolio demo.

Recommended seed users:

```text
demo-user
demo-admin
demo-owner
```

Recommended seed rooms:

```text
Main Hall
Wargame Room
Small Room
```

Recommended seed tables:

```text
Main Hall: Table 1, Table 2, Table 3
Wargame Room: Table W1, Table W2
Small Room: Table S1
```

Recommended seed games:

```text
Dune: Imperium
Warhammer 40,000
Twilight Imperium
Catan
Ark Nova
Root
Gloomhaven
```

Recommended seed bookings:

- one pending booking;
- one confirmed booking;
- one cancelled booking;
- one past completed booking.

Recommended seed meetups:

- open meetup looking for participants;
- ready-to-book meetup;
- booked meetup.

Seed data must not contain real personal data.

---

## 23. Migration guidelines

Rules for migrations:

- every schema change must have a migration;
- do not manually edit production DB;
- keep migrations small and reviewable;
- include rollback notes in PR description if relevant;
- never drop columns with data without explicit migration plan;
- never commit real production dumps.

Suggested commands:

```bash
pnpm db:migrate
pnpm db:generate
pnpm db:seed
pnpm db:reset
```

Exact commands must be finalized in `package.json`.

---

## 24. Backup considerations

Production database must have automated backups.

Minimum backup requirements:

- daily PostgreSQL dump;
- several recent copies retained;
- backup stored outside the running container;
- restore procedure documented;
- periodic restore test.

Do not store backup files in Git.

---

## 25. Security notes

Do not store or log:

- Telegram bot token;
- raw Telegram Mini App init data after validation;
- JWT secrets;
- session cookies;
- full phone numbers in logs;
- raw email login tokens;
- plaintext passwords, if passwords are ever added;
- private message bodies in logs.

Use hashing for:

- email magic-link tokens;
- future reset tokens;
- any one-time secret.

---

## 26. Open decisions

These decisions should be revisited during implementation:

| Decision | Current recommendation |
|---|---|
| Phone nullable or required | Nullable in DB; required by business rule before creating real bookings |
| Exclusion constraint | Add after first service-level implementation is stable |
| Email login | Optional later, schema-ready from start |
| Full realtime chat | Not in MVP |
| Multi-club support | Not in MVP |
| Analytics tables | Not in MVP; use admin statistics from operational data |

---

## 27. MVP database checklist

Before MVP is considered database-complete:

- [ ] Prisma schema created.
- [ ] PostgreSQL migrations created.
- [ ] Seed data added.
- [ ] Users and roles implemented.
- [ ] Rooms and tables implemented.
- [ ] Schedule and exceptions implemented.
- [ ] Booking rules implemented.
- [ ] Booking conflict checks implemented.
- [ ] Concurrent booking test passes.
- [ ] Legal documents and consents implemented.
- [ ] Audit log implemented for privileged admin/owner actions.
- [ ] Emergency full-phone reveal is audit-logged.
- [ ] Notifications table implemented or explicitly deferred.
- [ ] Soft-delete/anonymization approach documented.
- [ ] Backup and restore notes documented.

---

## 28. Related documents

- `README.md`
- `ROADMAP.md`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `API_SPEC.md`
- `MVP_CHECKLIST.md`
- `docs/architecture/booking.md`
- `docs/architecture/auth.md`
- `docs/architecture/telegram.md`
