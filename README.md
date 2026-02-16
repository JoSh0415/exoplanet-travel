# 🪐 Exoplanet Travel Bureau
**Module:** COMP3011 Web Services and Web Data  
**Student ID:** 201622115

A data-driven web API and dashboard for booking interstellar travel, powered by NASA's Exoplanet Archive TAP service.

---

## 🚀 Overview
This project provides:
- A **REST API** for browsing a catalogue of exoplanet destinations.
- Full **CRUD booking management** (create/list/update/delete bookings).
- A reproducible **data integration pipeline** that seeds the database from the NASA Exoplanet Archive (TAP sync).

---

## 🛠️ Tech Stack
- **Framework:** Next.js (App Router)
- **Backend:** Next.js Route Handlers (`/app/api/*`)
- **Database:** PostgreSQL via Prisma ORM
- **API Style:** REST (JSON)
- **Data Source:** Caltech/NASA Exoplanet Archive TAP service (`/TAP/sync`)

---

## 📦 Setup (Local)

### 1) Install dependencies
    npm install

### 2) Configure environment variables
Create a `.env` file (or set env vars in your environment):

    DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB"

### 3) Run database migrations
    npx prisma migrate dev

### 4) Seed the database
This project seeds exoplanets from the NASA TAP endpoint and inserts some sample users + bookings.

    npx prisma db seed

### 5) Start the dev server
    npm run dev

Base URL (local):
    http://localhost:3000

---

## 🧪 Quick API sanity checks

List exoplanets (paged):
    curl -s "http://localhost:3000/api/exoplanets?page=1&pageSize=20" | jq

Search by name:
    curl -s "http://localhost:3000/api/exoplanets?q=gliese" | jq

Filter by vibe:
    curl -s "http://localhost:3000/api/exoplanets?vibe=Molten%20Rock" | jq

List bookings:
    curl -s "http://localhost:3000/api/bookings?page=1&pageSize=10" | jq

---

## 🔌 API Endpoints (Current)

### Exoplanets
- `GET /api/exoplanets`  
  Paginated list with filters: `page`, `pageSize`, `q`, `vibe`, `minDistance`, `maxDistance`, `sort`, `order`

- `GET /api/exoplanets/{id}`  
  Fetch a single exoplanet by id

### Bookings (Full CRUD)
- `POST /api/bookings`  
  Create a booking (JSON body: `userId`, `planetId`, `travelClass`)

- `GET /api/bookings`  
  Paginated list; optional filter `userId`

- `PATCH /api/bookings/{id}`  
  Partial update (currently supports `travelClass`)

- `DELETE /api/bookings/{id}`  
  Delete a booking (returns `204 No Content`)

---

## 📚 API Documentation

### Required PDF (submission artifact)
- **PDF:** `docs/api.pdf`

### Source files
- **PDF source (Markdown):** `docs/api.md`  
- **OpenAPI spec:** `docs/openapi.yaml`

---

## 🧾 Generating the API PDF (recommended)

This project uses Pandoc for reliable page breaks in the PDF.

1) Install Pandoc:
    brew install pandoc

2) Build the PDF:
    pandoc docs/api.md -o docs/api.pdf

---

## 🛰️ NASA / TAP Data Source
Exoplanet data is retrieved from the Exoplanet Archive TAP service using a SQL-like query and CSV output, then normalized and inserted into PostgreSQL via Prisma.

---

## 🔁 Development workflow
This repository uses feature branches (e.g. `data-integration`, `api-core`, `docs-api`) and merges into `main` for stable milestones.

---

## 🤖 GenAI usage
Some development tasks were assisted by GenAI (e.g. scaffolding and documentation). A small set of example chat logs is included in the report appendix (as required by the coursework brief).
