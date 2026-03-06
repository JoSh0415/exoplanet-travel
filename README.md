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
    `curl -s "http://localhost:3000/api/exoplanets?page=1&pageSize=20" | jq`

Search by name:
    `curl -s "http://localhost:3000/api/exoplanets?q=gliese" | jq`

Filter by vibe:
    `curl -s "http://localhost:3000/api/exoplanets?vibe=Molten%20Rock" | jq`

List bookings:
    `curl -s "http://localhost:3000/api/bookings?page=1&pageSize=10" | jq`

---


## ✅ Testing

This project includes:
- **Integration tests** (Jest + Supertest) that call the running API at `http://localhost:3000`
- **Unit tests** for pure logic (e.g. planet “vibe” classification / gravity calculation)

### Test database safety
To prevent accidentally modifying the development database, tests use a dedicated test DB URL.

In your `.env`, set:

    TEST_DATABASE_URL="postgresql://.../test_db?schema=test"

The test setup requires `TEST_DATABASE_URL` and will refuse to run destructive DB resets without it.

### Run integration tests (recommended)
1) Start the API using the **test database**:
    `npm run test:server`

2) In another terminal, run the tests:
    `npm test`

### Coverage
    npm run test:coverage

---

## 🔌 API Endpoints (Current)

### Exoplanets
- `GET /api/exoplanets`  
  Paginated list with filters: `page`, `pageSize`, `q`, `vibe`, `minDistance`, `maxDistance`, `sort`, `order`

- `GET /api/exoplanets/{id}`  
  Fetch a single exoplanet by id

### Bookings (Full CRUD)
- `POST /api/bookings`  
  Create a booking (JSON body: `planetId`, `travelClass`). The `userId` is taken from the authenticated session.

- `GET /api/bookings`  
  Paginated list; optional filter `userId`. Admins can see all bookings.

- `PATCH /api/bookings/{id}`  
  Partial update (supports `travelClass`, `status`)

- `DELETE /api/bookings/{id}`  
  Delete a booking (returns `204 No Content`)

### Auth
- `POST /api/auth/register`  
  Register a new user (JSON body: `email`, `password`, `name`). Sets session cookie.

- `POST /api/auth/login`  
  Log in with `email` and `password`. Sets session cookie.

- `POST /api/auth/logout`  
  Clear the session cookie.

- `GET /api/auth/me`  
  Get the currently authenticated user (or `null` if not logged in).

### Admin (requires ADMIN role)
- `POST /api/admin/refresh-exoplanets`  
  Trigger a fresh import from the NASA Exoplanet Archive.

- `GET /api/admin/import-runs`  
  Paginated list of data import run records.

### Analytics
- `GET /api/analytics/bookings-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|month`  
  Total bookings, breakdown by travel class, and bookings over time.

- `GET /api/analytics/top-destinations?limit=10`  
  Top booked exoplanets.

- `GET /api/analytics/vibes`  
  Exoplanet count per vibe category + booked-per-vibe.

### Analytics Dashboard (UI)
Navigate to **`/analytics`** (requires login) to view an interactive dashboard with:
- Total bookings count
- Bookings by travel class (bar chart)
- Top destinations (ranked list with vibe emoji)
- Vibe distribution (planet count + booking count per vibe)
- Bookings over time (daily/monthly bar chart with date range filters)

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
    `brew install pandoc`

2) Build the PDF:
    `pandoc docs/api.md -o docs/api.pdf`

---

## 🛰️ NASA / TAP Data Source
Exoplanet data is retrieved from the Exoplanet Archive TAP service using a SQL-like query and CSV output, then normalized and inserted into PostgreSQL via Prisma.

---

## 🔁 Development workflow
This repository uses feature branches (e.g. `data-integration`, `api-core`, `docs-api`) and merges into `main` for stable milestones.

---

## 🤖 GenAI usage
Some development tasks were assisted by GenAI (e.g. scaffolding and documentation). A small set of example chat logs is included in the report appendix (as required by the coursework brief).
