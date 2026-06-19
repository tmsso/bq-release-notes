# 📋 BigQuery Release Notes Viewer

A lightweight **Flask web application** that fetches, parses, and displays the official [Google BigQuery Release Notes](https://cloud.google.com/bigquery/docs/release-notes) feed in a clean, searchable UI — with built-in **tweet-ready formatting** for each update.

---

## 🚀 Features

- **Live feed** – Fetches the BigQuery Atom/XML release notes feed directly from Google Cloud.
- **Structured parsing** – Breaks each release entry down by update type (e.g., *Feature*, *Fix*, *Changed*, *Deprecated*).
- **Stats dashboard** – Clickable summary cards showing totals for each update type; clicking filters the timeline.
- **Keyword search** – Real-time full-text search across update text, type, and date.
- **Type filters** – Filter pills to narrow the timeline by Features, Announcements, Issues, or Deprecations.
- **In-memory caching** – Responses are cached for 5 minutes to avoid hammering the upstream feed; falls back gracefully to stale data on errors.
- **🌗 Dark / Light mode** – Toggle switch in the header swaps the color scheme via CSS root variable overrides; preference is persisted in `localStorage`.
- **📋 Per-card Copy to Clipboard** – Each update card has a copy icon that copies the plain-text update to the clipboard with visual confirmation.
- **📥 Export to CSV** – Exports the currently visible (filtered + searched) notes to a UTF-8 CSV file (`bq-release-notes-YYYY-MM-DD.csv`) — compatible with Excel and Google Sheets.
- **Tweet generator** – Each update is pre-formatted as a ≤280-character tweet, ready to share. The sidebar composer lets you customise the draft and post directly to X.
- **Force refresh** – Pass `?refresh=true` to the API to bypass the cache on demand.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3 · Flask |
| Feed parsing | `urllib` · `xml.etree.ElementTree` · `re` |
| Frontend | HTML · Jinja2 templates · Vanilla JS · Vanilla CSS |

---

## ⚡ Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/tmsso/bq-release-notes.git
cd bq-release-notes

# 2. Create & activate a virtual environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate  # macOS / Linux

# 3. Install dependencies
pip install flask

# 4. Run the app
python app.py
```

Open your browser at **http://127.0.0.1:5000**

---

## 🔌 API

| Endpoint | Description |
|----------|-------------|
| `GET /` | Renders the main UI |
| `GET /api/releases` | Returns parsed release notes as JSON |
| `GET /api/releases?refresh=true` | Forces a live fetch, bypassing the cache |

### Example response

```json
{
  "success": true,
  "source": "network",
  "data": [
    {
      "date": "June 18, 2025",
      "link": "https://cloud.google.com/bigquery/docs/release-notes#june_18_2025",
      "updates": [
        {
          "type": "Feature",
          "text": "BigQuery now supports ...",
          "tweet_text": "BigQuery Update (June 18, 2025) - Feature: BigQuery now supports ... https://..."
        }
      ]
    }
  ]
}
```

---

## 📁 Project Structure

```
bq-release-notes/
├── app.py                  ← Flask server: routing, XML parsing, caching
├── templates/
│   └── index.html          ← Jinja2 HTML shell + UI structure
└── static/
    ├── css/style.css       ← Full UI styling (dark mode, glassmorphism, light mode overrides)
    └── js/app.js           ← All client logic: state, fetch, render, compose, export
```

---

## 🎓 Training Context

> This project was built as part of **Google's 5-day AI Agents: Intense Vibe Coding** training programme,
> specifically for the assignment **"Hands-on with Antigravity CLI"**.
>
> The goal of the assignment was to experience end-to-end AI-assisted development using the
> [Antigravity CLI](https://antigravity.dev) — from ideation and code generation through to
> Git repository management — entirely through natural-language prompts.

---

## 📄 License

This project is provided for educational purposes. Feel free to fork and extend it.
