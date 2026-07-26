---

### Copilot Prompt
The Ops Dashboard loads successfully, but it always shows:

- Pending PackGuard = 0
- Pending Trust Recovery = 0
- Verified Today = 0
- Dispatch Blocked = 0
The backend starts successfully and the seed completes, but no work items appear.

Please inspect the complete PackGuard/Trust Recovery workflow and fix the root cause.

### Check the following:

1. Verify the endpoint used by `OpsDashboardPage.jsx`.
2. Verify `/api/ops/dashboard` and `/api/ops/orders`.
3. Verify that `seed.py` creates demo orders matching the dashboard filters.
4. Ensure the seeded operator account (`ops@buyready.in`) has role `"operator"` or `"manager"`.
5. If the dashboard filters for `status == "packed"` or `packguard_status == "pending"`, ensure the seed creates orders in those states.
6. Ensure Trust Recovery demo orders exist with `return_status="requested"`.

### The dashboard should never be empty after seeding.
Create realistic demo data such as:

- 5 Pending PackGuard orders
- 3 AI Verified orders
- 2 Dispatch Blocked orders
- 3 Pending Trust Recovery cases
- 4 Completed today
These must come from the backend database, not hardcoded frontend values.

Also verify that `/api/ops/dashboard` returns the correct counts and `/api/ops/orders` returns the actual orders shown in the UI.

Do not change the frontend design. Fix the backend workflow and seed data so the dashboard is populated automatically after running `seed.py`.

---

### I also recommend one UX improvement
Instead of showing:

> **No items are currently pending for this workflow**
show a dashboard like:

- 📦 **Order #BR1023** – Awaiting PackGuard Verification
- 📦 **Order #BR1024** – AI Verification Failed
- 🔄 **Return #TR201** – Awaiting Trust Recovery Review
That makes your demo much more convincing because reviewers immediately see actionable work instead of an empty state.
