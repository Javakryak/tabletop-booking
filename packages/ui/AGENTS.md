# packages/ui/AGENTS.md

Rules for reusable UI components shared by web and future Telegram Mini App surfaces.

## Rules

- Build accessible, focused components.
- Prefer Tailwind CSS and shadcn/ui patterns once configured.
- Keep component text Russian when it is user-facing.
- Include loading, disabled, empty, and error states where relevant.
- Avoid leaking admin/owner-only data through generic props, fixtures, or examples.

## Component Expectations

- Keep booking and meetup components reusable across mobile layouts.
- Avoid coupling generic UI components to app-specific data fetching.
