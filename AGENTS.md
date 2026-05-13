# Repository Guidelines

## Communication Preferences

- 기본 답변 언어는 한국어로 한다. 사용자가 명시적으로 다른 언어를 요청한 경우에만 해당 언어를 사용한다.
- 사용자는 "오빠"라고 부른다.

## Project Structure & Module Organization

This is a Next.js 16 TypeScript application. Routes and API handlers live in `src/app`, with dashboard pages under `src/app/dashboard` and API endpoints under `src/app/api`. Shared UI components are in `src/components`, hooks in `src/hooks`, contexts in `src/contexts`, and utilities/services in `src/lib`. Static assets live in `public`. Database schema and migrations are in `prisma` and `supabase/migrations`. Import, seed, backup, and repair utilities are in `scripts`; avoid importing them into runtime app code.

## Build, Test, and Development Commands

Use npm because this repo includes `package-lock.json`.

- `npm run dev`: start the local Next.js dev server.
- `npm run build`: run `prisma generate` and create a production build.
- `npm run start`: serve the production build on `0.0.0.0`.
- `npm run lint`: run ESLint with Next core-web-vitals and TypeScript rules.
- `npm test`: run Vitest tests.
- `npm run test:ui`: open the Vitest UI.

After changing `prisma/schema.prisma`, run `npx prisma generate` unless you are doing a full build.

## Coding Style & Naming Conventions

Write TypeScript for `strict` mode and prefer the `@/*` path alias for imports from `src`. Use React function components and hooks. Name components and providers in `PascalCase` (`WbsToolbar.tsx`), hooks with `use` prefixes (`useWbsTree.ts`), and API route files as `route.ts`. Keep feature-specific components, hooks, constants, and types close to their dashboard module. Follow existing formatting: semicolons in TypeScript and 2-space JSON indentation.

## Testing Guidelines

Vitest runs in `jsdom` with React support. Place tests next to source files or in the relevant module using `*.test.ts` or `*.test.tsx`; the include pattern is `**/*.test.{ts,tsx}`. Focus tests on hooks, utilities, API behavior, and high-risk UI state changes. Run `npm test` before submitting.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commit prefixes such as `feat:` and `fix:`. Keep commit messages imperative and scoped to one change, for example `fix: prevent duplicate weekly report auto-load`. Pull requests should include a summary, linked issue or task, test results, migration notes for Prisma/Supabase changes, and screenshots for visible UI changes.

## Security & Configuration

Do not commit secrets. Use `.env.example` as the template and keep local values in `.env.local`. Treat scripts that mutate production-like data carefully; document required environment variables and expected target database before running import, seed, backup, or cleanup scripts.
