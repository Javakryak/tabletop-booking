# apps/web/AGENTS.md

Rules for the Next.js web app.

## Product UI

- User-facing UI text should be Russian.
- Use mobile-first responsive layouts.
- Default visual direction: dark theme, clean, minimal, and club-friendly.
- Handle loading, empty, error, and unauthorized states.
- Use clear status labels for bookings and meetups.

## Privacy

- Do not expose admin or owner data in client-side code unless authorized and necessary.
- Do not display full phone numbers or email addresses by default.
- Do not store sensitive auth material in unsafe browser storage.

## Components

- Prefer shared UI components over duplicated markup.
- Keep components focused and accessible.
- Design reusable booking/meetup components with future Telegram Mini App usage in mind.
- Useful component boundaries include `BookingCalendar`, `SlotPicker`, `RoomSelector`, `TableSelector`, `BookingSummary`, and `MeetupCard`.

## Testing

- Add Playwright smoke tests for main UI flows when UI implementation exists.
- Cover critical states: unauthenticated, loading, empty, validation error, and forbidden access.
