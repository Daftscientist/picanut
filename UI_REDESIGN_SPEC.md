# UI Redesign Spec — Three-Level Permission Model

## Levels

| Level | Who | Description |
|---|---|---|
| **Platform Manager** | Admin account (you) | Top-level access across all companies |
| **Company Manager** | Per-company owner account | Manages their organisation and sub-users |
| **Sub-user** | Day-to-day staff | Prints labels, works orders |

---

## Platform Manager

### Current things to show/do
- All user accounts across the platform (list, create, suspend, delete)
- Platform-wide print job history (all companies, all users)
- Platform settings (webhook secret, default label formats)
- Session management (revoke any session)

### Extensions worth adding
- **Company accounts** — group users under one organisation; create/suspend/delete companies
- **Usage dashboard** — total labels printed today/week/month across all companies, active agents, orders in queue
- **Impersonation** — "view as company" to debug issues without knowing their password
- **Audit log** — who logged in, what was printed, when, from which IP
- **Feature flags** — enable/disable features per company (e.g. WooCommerce integration on/off)
- **Per-company limits** — max users, max labels/day, storage quota
- **Billing markers** — track which company is on which plan (even if billing is handled externally)
- **Platform announcements** — push a notice that appears on all company dashboards

---

## Company Manager

### Current things to show/do
- Their own products, tags, variants
- Their own print jobs and order queue
- Their own print agent (token, printer selection, setup instructions)
- Their own WooCommerce webhook URL
- Create sub-users within their company

### Extensions worth adding
- **Sub-user management** — list sub-users, set roles (what they can see/do), reset passwords, deactivate
- **Role editor** — per sub-user: can they edit products? view orders only? print only?
- **Multiple print agents** — one per physical location/PC, each with its own token and assigned printer
- **Label templates** — create/manage custom label designs, set defaults per product category
- **Order routing rules** — e.g. "orders with SKU prefix `WH-` go to Warehouse printer, others go to Office printer"
- **Print queue dashboard** — see all in-progress and completed jobs across the whole team in real time
- **Activity feed** — who printed what, when, which order, which sub-user triggered it
- **WooCommerce SKU mapping** — manually map WooCommerce SKUs to products when they don't auto-match
- **Inventory alerts** — flag when a product has no active variants or is missing a barcode
- **Shift/batch mode** — bulk-select pending orders and send all to print in one action
- **Company profile** — name, logo (shown on their dashboard), timezone for timestamps

---

## Sub-user

### Current things to show/do
- View products and variants
- Print a label for a product/variant
- View pending WooCommerce orders and print them
- View their own recent print history

### Extensions worth adding
- **Print queue** — see what's been queued for them specifically vs. the whole company
- **Order notifications** — badge/alert when a new order arrives that needs printing
- **Reprint** — reprint a previous job from history without going through the product page again
- **Scan-to-print** — scan a barcode with the device camera, find the matching variant, queue a print
- **Print confirmation view** — after printing, tick off that the physical label was applied correctly (for audit)
- **Read-only mode** — some sub-users just need to see order status, not trigger prints
- **Handoff** — mark an order as "handed to courier" after printing, moving it out of the queue
- **Personal print history** — their own jobs only, not the whole company's
- **Printer status** — see whether the agent/printer is online before attempting to print (currently only visible in Settings)

---

## Cross-cutting UI requirements

- **Role-aware navigation** — sidebar items shown/hidden based on level; sub-users see a minimal UI
- **"You don't have permission" states** — graceful empty states instead of broken pages
- **Company context indicator** — company managers and sub-users always see which company they're in
- **Timezone-aware timestamps** — all dates shown in the company's configured timezone
- **Mobile-friendly print trigger** — sub-users are often on a warehouse floor on a phone
