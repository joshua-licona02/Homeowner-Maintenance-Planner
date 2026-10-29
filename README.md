# HomeOps Planner

A homeowner maintenance and planning web app. Track appliances, recurring maintenance, warranties, paint colors, a to-scale floor plan with your electrical panel, and renovation projects with budgets. Sign in with Google to sync between your phone, iPad, and computer.

**Live:** https://homeops-licona.web.app (the old GitHub Pages address offers to move your data there).

## Run it

Open `index.html` in a browser, or serve the folder locally:

```bash
python -m http.server 5173
```

Then visit http://localhost:5173.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Overdue / due-soon tasks, expiring warranties, active projects, quick actions |
| **Locations** | Rooms and areas, each with its inventory, paint colors, tasks, and projects |
| **Floor Plan** | Bird's-eye layout drawn to scale in feet, per floor: rooms (rectangles, L-shapes, or any custom shape; walled or open-concept; color-coded), appliances, outlets, GFCIs, 240V outlets, switches, dimmers, lights, fans, and detectors. Filter to just outlets, switches, lights, etc. Pinch or ctrl-scroll to zoom, full-screen mode, adjustable symbol size |
| **Electrical Panel** | Main panels and subpanels in common sizes (60A–225A, 8–42 spaces) or custom, with brand/model. Label each breaker (amps, single/double-pole, GFCI/AFCI). Tap a breaker to light up every outlet, switch, and light on that circuit, or tap a room to see which breakers feed it. Print a panel directory for the door |
| **Inventory** | Unlimited items with brand, model, serial, purchase info, warranty, and photos/receipts |
| **Maintenance** | One-time or recurring tasks (every N days/weeks/months/years). Completing a task logs date, cost, and notes, then schedules the next one |
| **Warranties** | Active / expiring / expired, with a configurable heads-up window |
| **Paint Colors** | Color name, brand, code, finish, surface, and swatch per room |
| **Projects** | Status, timeline, budget, expenses, supply checklist, attachments |
| **Reminders** | Daily browser notification at your chosen time, plus a calendar (.ics) export so phone calendars remind you when the app is closed |
| **Reports** | Full home, inventory, maintenance, project, and warranty reports — print or save as PDF |
| **Household** | Multiple users with Owner / Editor / Viewer roles, task assignment, and a household file to share and merge with a partner or roommate |
| **Data** | JSON backup and restore, CSV / Excel export, Excel inventory import, light and dark themes |

## Where data lives

Records are saved in the browser's `localStorage` and, once you sign in (Settings › Sync Across Devices), in Firestore at `households/homeops/sections/*`, one document per part of the data so edits on different devices don't overwrite each other. Edits made offline sync when the device reconnects. App updates never touch your data.

Attachments (photos, PDFs) stay in the browser's IndexedDB on the device where they were added (up to 1 GB); they aren't synced.

## Hosting and sync setup

HomeOps is a second Hosting site (`homeops-licona`) in the budget app's Firebase project (`budget-web-app-84de1`) and shares its Google sign-in and Firestore. Access is controlled by the budget app's `firestore.rules`, which allows only the household's Google accounts to read or write `households/*`; edit and deploy rules from the budget app's folder, never from here (this folder's `firebase.json` deploys Hosting only).

- `js/cloud-config.js` (git-ignored) holds the Firebase web config; copy `js/cloud-config.example.js` to create it. Without it the app runs locally with no sign-in, which is how the GitHub Pages copy runs.
- Deploy: `firebase deploy --only hosting`
- Sign-in on Safari and iPhone/iPad home-screen apps goes through the site's own address, so it needs, once:
  1. Firebase console › Authentication › Settings › Authorized domains: add `homeops-licona.web.app`.
  2. Google Cloud console › APIs & Services › Credentials › the "Web client (auto created by Google Service)" OAuth client › Authorized redirect URIs: add `https://homeops-licona.web.app/__/auth/handler`.

## Code layout

No build step. Plain JavaScript modules in `js/` share a single `APP` namespace and load in numeric order:

- `00-core` data schema, example data, load/save, v1 migration
- `01-dom`, `02-utils`, `06-icons` helpers
- `03-ingest-xlsx`, `04-clean` spreadsheet import
- `05-model` derived view model (due status, budgets, warranties)
- `07-files` IndexedDB attachments
- `08-reminders` notifications and .ics export
- `09-exports`, `10-reports` CSV/Excel/backup/merge and printable reports
- `11-forms` add/edit sheets
- `12-views` screens
- `13-floorplan` floor plan, electrical panels, breaker-to-device mapping
- `99-controller` routing, events, saving
- `14-cloud` (ES module) Google sign-in, Firestore sync, moving data from the old address
