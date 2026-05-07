# apps/bot/AGENTS.md

Rules for the grammY Telegram bot.

## Responsibilities

- Register or link accounts through `/start`.
- Notify users about booking updates.
- Notify administrators about new booking requests.
- Remind users before a game.
- Support lightweight booking and meetup actions.
- Provide buttons that open the web app or future Telegram Mini App.

## Runtime

- Local development uses polling.
- Staging and production use webhooks.

## Security And Privacy

- Never commit bot tokens.
- Never log Telegram bot tokens, Telegram auth/init data, phone numbers, email addresses, or message bodies containing personal data.
- Avoid sending unnecessary personal data in chats.
- Bot-to-API calls must use safe service credentials/config.

## UX

- Keep user-facing bot text in Russian.
- Prefer inline buttons and menus over command-heavy flows.

## Testing

- Add tests for commands, callbacks, and notification formatting when bot behavior is implemented.
