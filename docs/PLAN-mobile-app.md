# Plan: Transform Web App to Mobile App (PWA + Notificações)

## Goal
Transform the Arautos Imobiliária React/Vite SPA into an installable Progressive Web App (PWA) configured for a single user. The main requirement is to support Web Push Notifications for:
1. New lead arrivals.
2. Upcoming follow-ups.

## Architecture & Strategy

Since this is a PWA, we will rely on standard Web Push API. 
- **iOS Support**: Web Push is supported on iOS 16.4+ **only** if the user adds the site to the Home Screen.
- **Android Support**: Fully supported via Chrome.
- **Backend**: We will use Supabase Edge Functions to dispatch the Web Push payloads, and `pg_cron` (Supabase Cron) for scheduled follow-ups.

## Implementation Tasks

### 1. PWA Setup (Frontend)
- [ ] Install `vite-plugin-pwa`.
- [ ] Configure `vite.config.ts` to generate the Web App Manifest (icons, theme color, standalone display).
- [ ] Add the required 192x192 and 512x512 icons to the `public` folder.
- [ ] Configure the Service Worker to handle incoming Push events (`push` event listener to show notifications).

### 2. Push Subscriptions (Database & Frontend)
- [ ] Create a `push_subscriptions` table in Supabase to store the user's browser `PushSubscription` object.
- [ ] Add a UI element (e.g., a bell icon in the Header or a banner) to ask the user to "Ativar Notificações".
- [ ] When activated, ask for `Notification.requestPermission()`, subscribe to the PushManager using the VAPID Public Key, and save the JSON subscription to the database.

### 3. VAPID Keys & Edge Function Setup
- [ ] Generate a VAPID key pair (public/private).
- [ ] Store the VAPID private key as a Supabase Secret.
- [ ] Create a new Supabase Edge Function: `webpush-notify`.
  - It will use a Deno web-push library.
  - It will accept a payload (title, body, url), query the `push_subscriptions` table, and send the notification to the user's devices.

### 4. Triggers (New Leads & Follow-ups)
- [ ] **New Leads**: Create a Supabase Database Webhook (Trigger) that calls the `webpush-notify` Edge Function whenever a new row is inserted into the `leads` table.
- [ ] **Follow-ups**: Enable `pg_cron` and `pg_net` in Supabase. Create a daily/hourly cron job that queries leads with `proximo_contato` approaching soon, and calls the `webpush-notify` Edge Function for them.

## Verification Plan
1. **PWA Installability**: Open the site on a mobile device (Safari/Chrome), add to Home Screen, and verify it opens without browser UI.
2. **Push Permission**: Grant notification permissions and check if the subscription is saved in Supabase.
3. **Trigger Test**: Manually insert a lead and verify the mobile device receives a push notification.

> [!IMPORTANT]
> To implement Web Push, we will need to generate VAPID keys. You will also need the Supabase CLI installed to deploy the Edge Function, or we can deploy it via the Supabase Dashboard if you prefer. For iOS, you **must** be on iOS 16.4+ and the app must be added to the Home Screen for notifications to work.

## User Review Required
Does this technical approach (Vite PWA + Supabase Edge Functions + pg_cron) sound good? Can I proceed with Step 1 (PWA configuration)?
