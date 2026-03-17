# Fluent — CLAUDE.md

Language learning platform built with Next.js and Supabase. Users learn languages through structured modules, interactive quizzes, flashcards, and stories.

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui (base-nova style), Framer Motion
- **Backend:** Supabase (PostgreSQL, Auth)
- **Icons:** Lucide React
- **Notifications:** Sonner
- **Theming:** next-themes (light/dark)
- **Font:** Lexend (Google Fonts)

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login & signup pages (centered layout)
│   ├── (app)/           # Protected routes with sidebar layout
│   │   ├── dashboard/
│   │   ├── learn/[slug]/
│   │   ├── review/
│   │   ├── progress/
│   │   ├── profile/
│   │   └── onboarding/
│   ├── auth/callback/   # OAuth callback handler
│   ├── page.tsx         # Landing page
│   └── globals.css
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── layout/          # Sidebar, bottom nav, topbar
│   ├── landing/         # Landing page sections
│   ├── dashboard/       # Dashboard-specific components
│   ├── profile/         # Profile components
│   └── providers/       # ThemeProvider
└── lib/
    ├── supabase/        # client.ts, server.ts, middleware.ts
    ├── types/           # database.ts (Supabase types)
    └── utils.ts         # cn() utility
```

## Common Commands

```bash
npm run dev      # Start dev server at localhost:3000
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

## Database Schema (Supabase)

| Table | Key Fields |
|---|---|
| `Languages` | language_code, name, native_name, flag_emoji, is_available |
| `UserProfile` | user_id, display_name, streak_count, total_xp, last_activity_date |
| `UserLanguage` | user_id, language_code, is_active, is_unlocked |
| `Modules` | language_code, title, icon, order_index, is_published |
| `Lessons` | module_id, type, title, content (JSON), is_published |
| `UserProgress` | user_id, lesson_id, module_id, score, attempts |

Lesson types: `vocabulary`, `phrases`, `qa`, `story`

## Auth Flow

1. Users sign in at `/login` or `/signup` (Google OAuth or email/password)
2. OAuth redirects to `/auth/callback` for session exchange
3. All routes under `/(app)` require authentication
4. Supabase SSR handles server-side auth via cookies

## Design System

- **Primary color:** `#ff8052` (warm orange)
- **Light bg:** `#f8f6f5` | **Dark bg:** `#23140f`
- Colors defined as CSS HSL variables in `globals.css`
- Path alias: `@/` → `src/`
- Responsive: sidebar on desktop, bottom nav on mobile

## Key Conventions

- Use `'use client'` for interactive/stateful components
- Server components for data fetching with Supabase server client (`lib/supabase/server.ts`)
- Client components use `lib/supabase/client.ts`
- Use `cn()` from `lib/utils.ts` for conditional classNames
- shadcn components go in `src/components/ui/`
