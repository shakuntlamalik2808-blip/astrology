# Shakuntla Malik — Astrology Consulting & Academy

Next.js 14 (App Router) marketing site and admin panel for a professional Jyotish consulting practice. Tailwind CSS, shadcn/ui-style components, NextAuth, and Prisma.

## Stack

- Next.js 14 App Router + TypeScript
- Tailwind CSS with cosmic blue (`#0B192C`) and gold (`#D4AF37`)
- Inter + Playfair Display
- NextAuth credentials for `/admin`
- Prisma (SQLite locally) for clients, appointments, session notes, and booking records
- WhatsApp-based consultation requests instead of online payment checkout

## Setup

```bash
npm install
copy .env.example .env
npx prisma generate
npx prisma db push
npm run dev
```

On macOS/Linux use `cp .env.example .env` instead of `copy`.

Open [http://localhost:3000](http://localhost:3000). Sign in to admin at `/admin/login` with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home, authority hero, three practice pillars |
| `/about` | Biography |
| `/services` | Pricing grid, retainers, Vastu, rectification |
| `/academy` | Course directory |
| `/book` | Timezone calendar + WhatsApp booking request form |
| `/admin/dashboard` | Metrics |
| `/admin/clients` | CRM + counseling notes |
| `/admin/appointments` | Kundli vs daily counseling calendar |
| `/admin/payments` | Fee tracking |

Admin CRM currently uses demo records in `lib/data.ts`. Wire the table to `GET/POST/PATCH /api/clients` after Prisma is running.
