# Fluffy's Bistro — Next.js redesign

A mobile-first restaurant and food-truck website using Next.js App Router, TypeScript and CSS.

## Pages
- `/` — homepage with hero, featured categories, find-us and catering calls to action
- `/menu` — complete menu with interactive category filters
- `/catering` — validated inquiry form that opens the visitor's email app with a prefilled message
- `/about` — brand story
- `/find-us` — location/schedule status and contact details

## Run locally
```bash
npm install
npm run dev
```
Visit http://localhost:3000.

## Production build
```bash
npm run build
npm start
```

## Important before launch
1. Replace illustrative Unsplash photos with **actual Fluffy's Bistro photos** (URLs in `lib/data.ts`).
2. Verify all menu items, phone number, and email with the business.
3. Add verified social profile URLs and a confirmed weekly schedule when available. No address or hours were invented.
4. The catering form uses `mailto:`; for reliable direct submission, connect it to an email API (e.g. Resend), add spam protection and server-side validation.
5. Replace placeholder branding with approved official logo/assets.
6. This project is a separate redesign; it does not modify fluffysbistro.com.

## Deploy
Push this directory to a GitHub repository and import the repository into Vercel as a Next.js project. Confirm the preview deployment before connecting the production domain.
