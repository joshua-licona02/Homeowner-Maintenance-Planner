# HomeOps Planner

A homeowner maintenance and planning web app. Track appliances, recurring maintenance, warranties, paint colors, and renovation projects with budgets — all in the browser, no account or server needed.

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
| **Floor Plan** | Bird's-eye layout drawn to scale in feet, per floor: rooms, appliances, outlets, GFCIs, 240V outlets, switches, dimmers, lights, fans, and detectors. Drag to move, drag a corner to resize, or type exact dimensions |
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

Records are saved in the browser's `localStorage`; attachments (photos, PDFs) are saved in IndexedDB, up to 1 GB. Data stays on the device and browser where it was entered, so download a backup regularly (Settings › Backup, Import & Export).

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
