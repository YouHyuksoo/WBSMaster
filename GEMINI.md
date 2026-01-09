# WBS Master - Project Context & Instructions

## 1. Project Overview
**WBS Master** is a project management tool designed for Work Breakdown Structure (WBS) management, featuring AI capabilities (AI Copilot) for dependency analysis and schedule suggestions. The application is built with a modern web stack focusing on performance and user experience.

## 2. Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **State Management:** React Context / Hooks
- **Visualization:** Recharts, ECharts
- **Drag & Drop:** @dnd-kit

### Backend
- **Runtime:** Node.js
- **API:** Next.js API Routes (App Router)
- **Database:** PostgreSQL (via Supabase)
- **ORM:** Prisma
- **Auth:** Supabase Auth
- **AI Integration:** Google Generative AI, Mistral AI

## 3. Project Structure

```
src/
├── app/                  # Next.js App Router pages and layouts
│   ├── (auth)/           # Authentication routes (login, callback)
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── dashboard/    # Main WBS Dashboard
│   │   ├── kanban/       # Kanban Board
│   │   ├── ...           # Other feature pages
│   ├── api/              # API Routes
│   └── ...
├── components/           # React Components
│   ├── ui/               # Reusable base UI components (Button, Card, etc.)
│   ├── layout/           # Layout components (Sidebar, Header)
│   ├── dashboard/        # Dashboard-specific widgets
│   └── ...
├── hooks/                # Custom React Hooks
├── lib/                  # Utilities, API clients, Database configuration
│   ├── prisma.ts         # Prisma client instance
│   ├── supabase/         # Supabase client setup
│   └── ...
└── scripts/              # Maintenance and seeding scripts
```

## 4. Key Commands

### Development
- `npm run dev`: Start the development server.
- `npm run build`: Build the application for production.
- `npm run start`: Start the production server.
- `npm run lint`: Run ESLint.

### Database (Prisma)
- `npx prisma generate`: Generate Prisma client.
- `npx prisma db push`: Push schema changes to the database.
- `npx prisma studio`: Open Prisma Studio to view data.

## 5. Development Conventions

- **File Naming:** Use PascalCase for components (`DashboardSidebar.tsx`) and camelCase for utilities/hooks (`useAuth.ts`).
- **Styling:** Use Tailwind CSS utility classes.
- **Imports:** Always use absolute imports or relative paths carefully. **CRITICAL:** When using UI components (especially icons), ensure they are explicitly imported to avoid runtime errors.
- **Comments:** Add JSDoc-style comments in **Korean** for all new files and major functions, explaining purpose, usage, and maintenance tips.
- **User Interaction:** Address the user as '오빠' (oppa) in all responses.

## 6. Important Notes (Memories)
- **Language:** All conversation and documentation must be in **Korean**.
- **Verification:** Do not guess. Analyze the code (read files) before answering.
- **Permissions:** Always ask for permission before modifying source code.
- **Comments:** Always add Korean JSDoc comments when creating or modifying files.
