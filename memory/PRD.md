# BuyReady — Myntra HackerRamp MVP (PRD)

## Original Problem Statement
Full-stack Myntra-style ecommerce web app featuring **BuyReady — The Pre-Purchase Decision Layer**: helps first-time Bharat shoppers (especially women) buy with confidence by combining Fit, Delivery, Trust, and Value into one decision moment. Mobile-first, pixel-close to Myntra (#FF3E6C red-pink, white base, Assistant/Inter fonts).

## User Choices
- AI summaries & return-reduction: rule-based (LLM upgrade optional later)
- Products: ethnic-heavy balanced mix (kurtas, sarees, lehengas, dresses, tops, jeans, footwear, men, beauty)
- Frontend: React JS/JSX (not TS), shadcn template + Tailwind + Framer Motion
- Phased delivery, ambitious first pass (Phases 1–5 delivered in iteration 1)

## Architecture
- **Frontend:** React (CRA/craco), Tailwind, Framer Motion, lucide-react, sonner, React Router, Context (Auth + Shop)
- **Backend:** FastAPI (`/app/backend/server.py`), rule engine for fit/delivery/trust/value, `seed.py` for data
- **DB:** MongoDB — users (embedded addresses/fit_profiles/cart/wishlist), products, reviews, orders, notifications
- **Auth:** JWT (Bearer, localStorage/sessionStorage per Remember Me), bcrypt, demo login endpoint

## User Personas
Bharat women shoppers with fit anxiety, event-driven delivery deadlines, seller trust gaps, return regret.

## Implemented (June 2026 — iteration 1) ✅
- Auth: login/signup/forgot-password/remember-me/demo-login; 10 seeded users (Demo@123)
- Skippable fit profile onboarding (height/weight/shape/fit/language)
- Home: banner carousel, categories, trending, recommended
- Listing: 60 seeded products, category chips, search, sort
- PDP: images, price/MRP/discount, colors, sizes with recommended-size highlight
- BuyReady core: Step 1 fit profile (switch/create sheet) → Step 2 address (change/add sheet) → Step 3 purpose + event date → Step 4 delivery prediction (free/express/same-day, confidence, safety buffer, alternatives) → Step 5 hero card (unlock animation, 4 confidence bars, verdict, 3 CTAs)
- Why Recommended bottom sheet: Fit/Delivery/Trust/Worth Buying tabs + SpeechSynthesis voice EN/HI/TE
- Better Choice For You: compares 3 similar products + BuyReady Pick badge with reasons
- Reviews: photo + regional reviews, rule-based AI summary (positive/negative/complaints)
- Wishlist (toggle, move-to-bag), Bag (qty, coupons BUYREADY10/MYNTRA20/FIRST50, BuyReady summary)
- Checkout (address/delivery/payment COD-UPI-Card mock) → Order Success
- Tracking: 5-stage timeline, animated SVG live map with courier marker, "Simulate Next Step" demo button
- AI Order Monitor: weather/traffic/warehouse/courier checks, delay simulation (~40% deterministic), resolve options (express upgrade / nearby stock / accept)
- Notifications center (order lifecycle events, mark-all-read)
- Post-delivery fit feedback (perfect/loose/tight → exchange suggestion)
- AI Return Reduction: styling tips / size exchange / fabric care / fit expert before allowing return
- Profile: orders, addresses, fit profiles, settings tabs, logout
- Trust strip footer, mobile sticky Add-to-Bag, responsive 360px→desktop

## Testing
Iteration 1: 33/33 backend pytest pass, all frontend E2E flows verified (report: /app/test_reports/iteration_1.json; regression suite: /app/backend/tests/backend_test.py).

## Backlog / Next Tasks
- P1: Diversify seed product images (some Unsplash URLs repeat across products)
- P1: shadcn Calendar for event date (currently native date input)
- P2: Real LLM (Emergent Universal Key) for AI summaries & return-reduction advice
- P2: Kids/Home/Studio nav categories (currently route to all products)
- P2: Saved payments management, UI language switching (voice already EN/HI/TE)
- P2: Split server.py into routers if it grows further

## Credentials
See /app/memory/test_credentials.md — priya@buyready.in / Demo@123 or one-click Demo Login.
