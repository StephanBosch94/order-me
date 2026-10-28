# Poruci

Poruci is a multi-tenant B2B ordering app for suppliers in Serbia. Each supplier gets a private admin and a public ordering page, such as `/s/gastro-supply`. Business customers browse the catalog, enter quantities, and submit an order without creating an account.

The interface is in Serbian Latin. Money is shown in RSD and dates use the Europe/Belgrade time zone.

## Architecture

The app is a Next.js App Router application.

- Server Components load supplier data.
- Server Actions validate input with Zod and write through a repository.
- `src/lib/data/demo-store.ts` persists to `.data/demo-db.json` when Supabase is not configured. This is local development storage, not a production database.
- `src/lib/data/supabase-store.ts` uses the Supabase service role on the server only. Every query is scoped to an organization id taken from the authenticated session, not from the browser.
- `supabase/schema.sql` creates the tables, indexes, and Row Level Security policies. The anon key cannot read another supplier's orders, customers, or settings.
- Order items store a snapshot of the product name, unit, quantity, and price. Later catalog edits do not change old orders.
- Public checkout sends an idempotency key, so a repeated click returns the original order.
- Email uses Resend when `RESEND_API_KEY` is set. Otherwise messages are written to `.data/outbox/` and the order is still saved.
- PDF documents are labeled **Potvrda porudžbine**. They are not invoices.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Short introduction |
| `/login`, `/signup` | Supplier authentication |
| `/dashboard` | Overview |
| `/orders`, `/orders/[id]` | Order list and detail |
| `/products`, `/products/new`, `/products/[id]` | Catalog management |
| `/customers`, `/customers/[id]` | Customers created from orders |
| `/settings` | Supplier profile and public link |
| `/s/[slug]` | Public ordering page |
| `/s/[slug]/potvrda/[token]` | Order confirmation |
| `/api/orders/[id]/pdf` | Supplier PDF download |
| `/api/confirmations/[token]/pdf` | Customer PDF download |

Important UI lives in `src/components/admin`, `src/components/storefront`, and `src/components/auth`.

## Run locally

Node.js 22 is the version current Supabase packages expect. Node.js 20 still runs this app and prints a deprecation warning from `@supabase/supabase-js`.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Demo mode starts automatically when the Supabase variables are empty. The seeded supplier is Gastro Supply.

- Email: `ana@gastrosupply.rs`
- Password: `poruci-demo`
- Public page: `/s/gastro-supply`

The first launch writes `.data/demo-db.json`.

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | No | Links inside emails. Defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Browser auth key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Server-only key. Never expose it to the browser. |
| `RESEND_API_KEY` | No | Sends email through Resend. |
| `EMAIL_FROM` | With Resend | Sender address verified in Resend. |

If any Supabase variable is set without the other two, the app refuses to start instead of silently writing to the demo file.

## Initialize the database

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`.
3. In Authentication, decide whether new users must confirm email. Local testing is easier with confirmation disabled.
4. Put the three Supabase values in `.env.local`.
5. Restart the app. New signups create an organization in Supabase. The Gastro Supply demo data is not copied there.

Product images in Supabase are uploaded to the public `product-images` bucket created by the schema. In demo mode they are stored under `.data/uploads`.

## Checks

```bash
npm run typecheck
npm run lint
npm test
```

## Integrations that still need credentials

- Supabase, for shared production data and authentication.
- Resend, for real email delivery. Without a key, messages stay in `.data/outbox/`.

PDF generation does not need an external account.

## Limitations and next steps

- Demo mode is a single JSON file with a process lock. Use Supabase for more than one server.
- Supabase order writes are sequential inserts, with a unique idempotency key as the retry guard.
- There is no legally valid invoice, fiscal receipt, or eFaktura integration. The PDF is an order confirmation.
- One user belongs to the organization created at signup. Staff invitations are not built yet.
- Public order submission is rate-limited per organization and IP. A shared edge rate limiter would be stronger in production.
- VAT is not calculated separately from the listed unit price.

The most useful next steps are a transactional Supabase order function, staff invites, stock levels, and an eFaktura integration that stays separate from the order confirmation.
