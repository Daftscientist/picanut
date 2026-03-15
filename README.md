# LabelFlow

A self-hosted label printing PWA for Brother QL-820NWB printers. Manages products, variants, and WooCommerce orders, renders labels server-side, and sends raster bytes directly to the printer.

## Stack

- **Backend** — Python Sanic, asyncpg, Alembic
- **Frontend** — React 18, Vite, React Router
- **Database** — PostgreSQL 16
- **Label rendering** — Pillow + python-barcode + brother\_ql
- **Printing** — Network mode via local print agent (recommended) or WebUSB

---

## Server Deployment (VPS + Tailscale)

The app binds only to the Tailscale IP and is proxied to the internet via Nginx Proxy Manager. It is never exposed directly on the public network interface.

### Prerequisites

- Docker + Docker Compose on the VPS
- Tailscale installed and authenticated on the VPS
- Nginx Proxy Manager (or similar) configured to proxy your domain → `100.101.66.103:8000`

### First-time setup

```bash
git clone https://github.com/Daftscientist/picanut.git
cd picanut
cp .env.example .env
# Edit .env — set strong values for SECRET_KEY and WOO_WEBHOOK_SECRET
nano .env
./deploy.sh
```

The app will be available at `http://100.101.66.103:8000` on your Tailscale network, and via your proxied domain publicly.

**Default login:** `admin` / `admin` — change this immediately in Settings → User Accounts.

### Updating

Any time you pull new code, run:

```bash
./deploy.sh
```

This pulls the latest code, rebuilds the Docker image (including the React frontend), and restarts the containers. The database volume is preserved.

### Environment variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | Secret key for session token signing — use a long random string |
| `WOO_WEBHOOK_SECRET` | HMAC secret for WooCommerce webhook validation |
| `DATABASE_URL` | Set automatically in Docker Compose — no need to change |

### Nginx Proxy Manager

Create a proxy host pointing to `100.101.66.103:8000`. Enable SSL via Let's Encrypt. No special headers required.

---

## Print Agent — Windows Setup (Network Mode)

The print agent is a small Python script that runs on the same Windows machine as your browser. It bridges LabelFlow (on the VPS) to your Brother QL printer over your local network via TCP port 9100.

**Why?** Browsers cannot open raw TCP connections, so direct network printing isn't possible without a local helper.
**P-touch Editor is completely unaffected** — the agent uses the printer's network port, not USB. Both can run simultaneously.

### Requirements

- Python 3.8+ — [python.org/downloads](https://www.python.org/downloads/) *(tick "Add Python to PATH" during install)*
- Printer connected to the same Wi-Fi / LAN as the Windows machine
- Printer's IP address — find it on the LCD: `Menu → WLAN → TCP/IP → IP Address`

### Install dependencies

```
pip install websockets
```

### Get the agent script

Download `print_agent.py` from **LabelFlow → Settings → Printer → Network → Download print_agent.py**, or copy `local-agent/print_agent.py` from this repo. Save it somewhere permanent, e.g. `C:\Tools\LabelFlow\print_agent.py`.

### Quick test

```
python print_agent.py
```

In LabelFlow Settings, switch to **Network** mode, enter your printer IP, click **Check**, then **Test Print**. Once confirmed working, set it up as a persistent background service below.

---

### Option A — Windows Service with NSSM (recommended)

NSSM turns the agent into a proper Windows Service. It starts at boot, runs when the screen is locked or no user is logged in, and restarts automatically if it crashes.

**Step 1 — Download NSSM**

Download from [nssm.cc/download](https://nssm.cc/download). Extract the zip and copy `nssm.exe` from the `win64\` folder to a permanent location, e.g. `C:\Tools\nssm.exe`.

**Step 2 — Find your Python executable path**

```
where python
```

Example: `C:\Users\YourName\AppData\Local\Programs\Python\Python312\python.exe`

**Step 3 — Install the service**

Open **Command Prompt as Administrator** and run:

```
C:\Tools\nssm.exe install LabelFlowAgent
```

Fill in the NSSM GUI that opens:

| Field | Value |
|---|---|
| **Path** | Your Python path from Step 2 |
| **Startup directory** | Folder containing `print_agent.py`, e.g. `C:\Tools\LabelFlow` |
| **Arguments** | `print_agent.py` |

Click **Install service**.

**Step 4 — Start the service**

```
C:\Tools\nssm.exe start LabelFlowAgent
```

**Step 5 — Verify it's running**

```
C:\Tools\nssm.exe status LabelFlowAgent
```

Should print `SERVICE_RUNNING`. The agent now starts automatically with Windows.

**Useful management commands**

```
C:\Tools\nssm.exe stop    LabelFlowAgent
C:\Tools\nssm.exe restart LabelFlowAgent
C:\Tools\nssm.exe remove  LabelFlowAgent confirm
C:\Tools\nssm.exe edit    LabelFlowAgent
```

**Enable logging** — in `nssm edit LabelFlowAgent`, go to the **I/O** tab and set both Stdout and Stderr to `C:\Tools\LabelFlow\agent.log`.

---

### Option B — Task Scheduler (no extra software)

Use this if you prefer not to install NSSM. The agent runs when the current user logs in and also when the screen is locked (as long as the user session is active).

1. Open **Task Scheduler** → **Create Task**
2. **General** tab:
   - Name: `LabelFlow Print Agent`
   - Tick: *Run whether user is logged on or not*
3. **Triggers** tab → New → **At startup**
4. **Actions** tab → New:
   - Action: *Start a program*
   - Program: `pythonw.exe` *(runs without a visible console window)*
   - Arguments: `C:\Tools\LabelFlow\print_agent.py`
   - Start in: `C:\Tools\LabelFlow`
5. **Conditions** tab: untick *Start the task only if the computer is on AC power*
6. Click OK and enter your Windows password when prompted

> For a true background service that runs before any user logs in and restarts on crash, use **Option A — NSSM**.

---

## Label Types

| # | Name | Contents |
|---|---|---|
| 1 | Shelf label | Product name · weight · price (large) · barcode |
| 2 | Info label | Brand at top · bold title · multi-line body text |
| 3 | Product info | Brand · name · description · ingredients · nutrition table (per 100g) · price + weight · barcode |
| 4 | Title label | Large centred name · price · weight · barcode |

All labels: 62mm continuous tape, 300 DPI, monochrome.

---

## WooCommerce Integration

1. In LabelFlow → Settings, copy the **Webhook URL**
2. In WordPress → WooCommerce → Settings → Advanced → Webhooks → Add webhook:
   - Topic: `Order created`
   - Delivery URL: *(paste the copied URL)*
   - Secret: *(must match `WOO_WEBHOOK_SECRET` in your `.env`)*
3. New orders appear on the Dashboard automatically. Unmatched SKUs are flagged in the UI.