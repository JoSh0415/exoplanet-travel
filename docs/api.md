---
title: "Exoplanet Travel Agency — API Reference"
subtitle: "COMP3011 Web Services and Web Data"
author: "Student ID: 201622115"
date: "Version 0.1.0"
geometry: margin=1in
fontsize: 11pt
colorlinks: true
linkcolor: blue
urlcolor: blue
toc: true
toc-depth: 2
header-includes:
  - \usepackage{fancyhdr}
  - \pagestyle{fancy}
  - \fancyhead[L]{Exoplanet Travel Agency API}
  - \fancyhead[R]{\thepage}
  - \fancyfoot{}
  - \usepackage{parskip}
---

\newpage

# Overview

This document describes the REST API for the Exoplanet Travel Agency — a web
service for browsing exoplanet destinations and booking interstellar travel.

**Base URL (deployed):**

```text
https://exoplanet-travel.vercel.app
```

**Base URL (local development):**

```text
http://localhost:3000
```

All example requests in this document use the deployed URL. Replace with
`http://localhost:3000` when testing locally.

## Conventions

- All requests and responses use `application/json`.
- Set `Content-Type: application/json` for POST/PATCH requests.
- Paginated endpoints accept `page` (1-indexed, default 1) and `pageSize`
  (1–100, default 20).
- Error responses use a consistent shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "details": {}
  }
}
```

## Authentication

Protected endpoints require a session cookie named `exo-session` (httpOnly JWT).
Obtain it by calling `POST /api/auth/login` or `POST /api/auth/register` — the
cookie is set automatically in the response.

Use `curl -c cookies.txt` to save the cookie and `curl -b cookies.txt` to send
it on subsequent requests.

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200  | Success |
| 201  | Resource created |
| 204  | Deleted (no body) |
| 207  | Partial success (import with errors) |
| 400  | Validation / malformed request |
| 401  | Authentication required |
| 403  | Insufficient permissions |
| 404  | Resource not found |
| 409  | Conflict (e.g. duplicate email) |
| 429  | Rate limited |

\newpage

# Health

## GET /api/health

Liveness / readiness probe. Returns service status and database connectivity.

**Auth:** None.

### Example Request

```bash
curl -s "https://exoplanet-travel.vercel.app/api/health" | jq
```

### Success Response (200)

```json
{
  "status": "ok",
  "timestamp": "2026-03-06T10:00:00.000Z",
  "database": "connected",
  "uptime": 3642.12
}
```

### Degraded Response (503)

Returned when the database is unreachable:

```json
{
  "status": "degraded",
  "timestamp": "2026-03-06T10:00:00.000Z",
  "database": "disconnected",
  "uptime": 3642.12
}
```

\newpage

# Exoplanets

## GET /api/exoplanets

Returns a paginated, filterable catalogue of exoplanets.

**Auth:** None.

### Query Parameters

| Parameter     | Type    | Default    | Description |
|---------------|---------|------------|-------------|
| `page`        | integer | 1          | Page number (1-indexed) |
| `pageSize`    | integer | 20         | Items per page (max 100) |
| `q`           | string  | —          | Case-insensitive name search (1–100 chars) |
| `vibe`        | string  | —          | Filter by category, e.g. `Molten Rock` (1–60 chars) |
| `minDistance`  | number  | —          | Min distance in light-years (inclusive) |
| `maxDistance`  | number  | —          | Max distance in light-years (inclusive) |
| `sort`        | string  | `distance` | Sort field: `distance`, `discoveryYear`, `name` |
| `order`       | string  | `asc`      | Sort order: `asc` or `desc` |

### Example Requests

Basic catalogue page:

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/exoplanets\
?page=1&pageSize=20" | jq
```

Search by name:

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/exoplanets?q=gliese" \
  | jq
```

Filter by vibe:

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/exoplanets\
?vibe=Molten%20Rock" | jq
```

Filter by distance range:

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/exoplanets\
?minDistance=0&maxDistance=25" | jq
```

### Success Response (200)

```json
{
  "items": [
    {
      "id": "cmlp9k8qn0003dskufekwmztt",
      "name": "HD 219134 c",
      "distance": 21.3,
      "temperature": 782,
      "gravity": 1.91,
      "vibe": "Molten Rock",
      "discoveryYear": 2015
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 500,
  "totalPages": 25
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid query parameters (e.g. `page < 1`) |

\newpage

## GET /api/exoplanets/{id}

Returns full details for a single exoplanet.

**Auth:** None.

### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `id`      | string | Exoplanet ID (CUID format) |

### Example Request

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/exoplanets/\
cmlp9k8qn0000dskuetg0pq62" | jq
```

**Tip:** get a valid ID from the list endpoint:

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/exoplanets?pageSize=1" \
  | jq -r ".items[0].id"
```

### Success Response (200)

```json
{
  "id": "cmlp9k8qn0000dskuetg0pq62",
  "name": "HD 219134 b",
  "distance": 21.3,
  "temperature": 782,
  "gravity": 1.91,
  "vibe": "Molten Rock",
  "discoveryYear": 2015
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid ID format |
| 404    | Exoplanet not found |

\newpage

# Bookings

## POST /api/bookings

Creates a booking for the authenticated user.

**Auth:** Session cookie required. The `userId` is derived from the session.

### Request Body

| Field         | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `planetId`    | string | Yes      | Exoplanet ID (CUID) |
| `travelClass` | string | Yes      | Travel class label (1–60 chars) |

### Example Request

```bash
curl -s -X POST \
  "https://exoplanet-travel.vercel.app/api/bookings" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "planetId": "cmlp9k8qn0007dskuhej1ifkh",
    "travelClass": "Economy (Cryo-Sleep)"
  }' | jq
```

### Success Response (201)

```json
{
  "id": "cmlp9k90d00dzdskuje80hqav",
  "userId": "cmlp9k8ut00dwdskud6g70sxc",
  "planetId": "cmlp9k8qn0007dskuhej1ifkh",
  "travelClass": "Economy (Cryo-Sleep)",
  "status": "CONFIRMED",
  "bookingDate": "2026-02-16T14:52:20.000Z"
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid JSON or validation error |
| 401    | Authentication required |
| 404    | Exoplanet not found |

\newpage

## GET /api/bookings

Returns a paginated list of bookings. Regular users see only their own
bookings; admins see all bookings.

**Auth:** Session cookie required.

### Query Parameters

| Parameter  | Type    | Default | Description |
|------------|---------|---------|-------------|
| `page`     | integer | 1       | Page number (1-indexed) |
| `pageSize` | integer | 20      | Items per page (max 100) |

### Example Request

```bash
curl -s -b cookies.txt \
  "https://exoplanet-travel.vercel.app/api/bookings\
?page=1&pageSize=10" | jq
```

### Success Response (200)

```json
{
  "items": [
    {
      "id": "cmlp9k90d00dzdskuje80hqav",
      "bookingDate": "2026-02-16T14:52:20.000Z",
      "travelClass": "Economy (Cryo-Sleep)",
      "status": "CONFIRMED",
      "user": {
        "id": "cmlp9k8ut00dwdskud6g70sxc",
        "name": "Peter Quill",
        "email": "star.lord@guardians.com"
      },
      "planet": {
        "id": "cmlp9k8qn0007dskuhej1ifkh",
        "name": "HD 219134 c",
        "distance": 21.3,
        "vibe": "Molten Rock",
        "discoveryYear": 2015
      }
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 1,
  "totalPages": 1
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid query parameters |
| 401    | Authentication required |

\newpage

## GET /api/bookings/{id}

Returns a single booking with nested user and planet details.

**Auth:** Session cookie required. Only the booking owner or an admin can view
a booking.

### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `id`      | string | Booking ID (CUID) |

### Example Request

```bash
curl -s -b cookies.txt \
  "https://exoplanet-travel.vercel.app/api/bookings/\
cmlp9k90d00dzdskuje80hqav" | jq
```

### Success Response (200)

```json
{
  "id": "cmlp9k90d00dzdskuje80hqav",
  "userId": "cmlp9k8ut00dwdskud6g70sxc",
  "planetId": "cmlp9k8qn0007dskuhej1ifkh",
  "travelClass": "Economy (Cryo-Sleep)",
  "status": "CONFIRMED",
  "bookingDate": "2026-02-16T14:52:20.000Z",
  "user": {
    "id": "cmlp9k8ut00dwdskud6g70sxc",
    "name": "Jane Doe",
    "email": "jane@example.com"
  },
  "planet": {
    "id": "cmlp9k8qn0007dskuhej1ifkh",
    "name": "Kepler-442 b",
    "distance": 100.0,
    "vibe": "Habitable Paradise",
    "discoveryYear": 2015
  }
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid ID format |
| 401    | Authentication required |
| 403    | Not the booking owner or admin |
| 404    | Booking not found |

\newpage

## PATCH /api/bookings/{id}

Partially updates a booking (e.g. change travel class or cancel).

**Auth:** Session cookie required. Only the booking owner or an admin can update
a booking. Non-admin users may only set `status` to `"CANCELLED"` — any other
value returns 403.

### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `id`      | string | Booking ID (CUID) |

### Request Body

Provide at least one field:

| Field         | Type   | Description |
|---------------|--------|-------------|
| `travelClass` | string | Updated travel class (1–60 chars) |
| `status`      | string | `CONFIRMED` or `CANCELLED` |

### Example Request

```bash
curl -s -X PATCH \
  "https://exoplanet-travel.vercel.app/api/bookings/\
cmlp9k90d00dzdskuje80hqav" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"travelClass": "First Class (Warp Drive)"}' | jq
```

### Success Response (200)

```json
{
  "id": "cmlp9k90d00dzdskuje80hqav",
  "userId": "cmlp9k8ut00dwdskud6g70sxc",
  "planetId": "cmlp9k8qn0007dskuhej1ifkh",
  "travelClass": "First Class (Warp Drive)",
  "status": "CONFIRMED",
  "bookingDate": "2026-02-16T14:52:20.000Z"
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid ID or invalid payload |
| 401    | Authentication required |
| 403    | Not the owner/admin, or non-admin setting non-CANCELLED status |
| 404    | Booking not found |

\newpage

## DELETE /api/bookings/{id}

Deletes a booking permanently.

**Auth:** Session cookie required. Only the booking owner or an admin can delete
a booking.

### Path Parameters

| Parameter | Type   | Description |
|-----------|--------|-------------|
| `id`      | string | Booking ID (CUID) |

### Example Request

```bash
curl -i -X DELETE \
  "https://exoplanet-travel.vercel.app/api/bookings/\
cmlp9k90d00dzdskuje80hqav" \
  -b cookies.txt
```

### Success Response (204)

No response body.

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid ID format |
| 401    | Authentication required |
| 403    | Not the booking owner or admin |
| 404    | Booking not found |

\newpage

# Authentication

## POST /api/auth/register

Registers a new user account and sets the session cookie.

**Auth:** None (rate-limited by IP).

### Request Body

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `email`    | string | Yes      | User email (stored lowercase) |
| `password` | string | Yes      | Password (8–100 chars) |
| `name`     | string | Yes      | Display name (1–100 chars) |

### Example Request

```bash
curl -s -X POST \
  "https://exoplanet-travel.vercel.app/api/auth/register" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "jane@example.com",
    "password": "securePass123",
    "name": "Jane Doe"
  }' | jq
```

### Success Response (201)

```json
{
  "id": "cmlp9k8ut00dwdskud6g70sxc",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "role": "USER"
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Validation error (missing fields, password too short) |
| 409    | Email already registered |
| 429    | Too many registration attempts |

\newpage

## POST /api/auth/login

Authenticates a user and sets the `exo-session` cookie.

**Auth:** None (rate-limited by IP).

### Request Body

| Field      | Type   | Required | Description |
|------------|--------|----------|-------------|
| `email`    | string | Yes      | User email |
| `password` | string | Yes      | User password |

### Example Request

```bash
curl -s -X POST \
  "https://exoplanet-travel.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "jane@example.com",
    "password": "securePass123"
  }' | jq
```

### Success Response (200)

```json
{
  "id": "cmlp9k8ut00dwdskud6g70sxc",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "role": "USER"
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Validation error (missing fields) |
| 401    | Invalid email or password |
| 429    | Too many login attempts |

\newpage

## GET /api/auth/me

Returns the currently authenticated user, or `null` if no valid session exists.

**Auth:** None required — always returns 200.

### Example Request

```bash
curl -s -b cookies.txt \
  "https://exoplanet-travel.vercel.app/api/auth/me" | jq
```

### Success Response (200) — Authenticated

```json
{
  "user": {
    "id": "cmlp9k8ut00dwdskud6g70sxc",
    "email": "jane@example.com",
    "name": "Jane Doe",
    "role": "USER"
  }
}
```

### Success Response (200) — Unauthenticated

```json
{
  "user": null
}
```

## POST /api/auth/logout

Clears the session cookie.

**Auth:** None required.

### Example Request

```bash
curl -s -X POST \
  "https://exoplanet-travel.vercel.app/api/auth/logout" \
  -b cookies.txt | jq
```

### Success Response (200)

```json
{
  "success": true
}
```

\newpage

# Admin

All admin endpoints require a valid session cookie with the `ADMIN` role.

## POST /api/admin/refresh-exoplanets

Triggers a fresh import from the NASA Exoplanet Archive TAP service. Upserts
planets (inserts new, updates existing) and records a `DataImportRun`.

**Auth:** Session cookie with ADMIN role.

### Example Request

```bash
curl -s -X POST \
  "https://exoplanet-travel.vercel.app/api/admin/\
refresh-exoplanets" \
  -b cookies.txt | jq
```

### Success Response (200)

```json
{
  "message": "Import completed successfully",
  "retrievedAt": "2026-03-06T10:00:00.000Z",
  "tapQuery": "SELECT ...",
  "insertedCount": 15,
  "updatedCount": 485,
  "errorMessage": null
}
```

### Partial Success Response (207)

Returned when the import completed but some rows failed to parse:

```json
{
  "message": "Import completed with errors",
  "retrievedAt": "2026-03-06T10:00:00.000Z",
  "tapQuery": "SELECT ...",
  "insertedCount": 10,
  "updatedCount": 480,
  "errorMessage": "Failed to parse row 42: missing required field"
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 401    | Authentication required |
| 403    | Requires ADMIN role |

\newpage

## GET /api/admin/import-runs

Returns a paginated list of data import run records.

**Auth:** Session cookie with ADMIN role.

### Query Parameters

| Parameter  | Type    | Default | Description |
|------------|---------|---------|-------------|
| `page`     | integer | 1       | Page number (1-indexed) |
| `pageSize` | integer | 20      | Items per page (max 100) |

### Example Request

```bash
curl -s -b cookies.txt \
  "https://exoplanet-travel.vercel.app/api/admin/\
import-runs?page=1&pageSize=10" | jq
```

### Success Response (200)

```json
{
  "items": [
    {
      "id": "cm...",
      "sourceName": "NASA Exoplanet Archive",
      "tapQuery": "SELECT ...",
      "retrievedAt": "2026-03-06T10:00:00.000Z",
      "insertedCount": 15,
      "updatedCount": 485,
      "errorMessage": null,
      "createdAt": "2026-03-06T10:00:12.000Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 3,
  "totalPages": 1
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid query parameters |
| 401    | Authentication required |
| 403    | Requires ADMIN role |

\newpage

# Analytics

## GET /api/analytics/vibes

Returns exoplanet counts per vibe category and vibes ranked by booking
popularity.

**Auth:** None.

### Example Request

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/analytics/vibes" \
  | jq
```

### Success Response (200)

```json
{
  "vibes": [
    { "vibe": "Habitable Paradise", "count": 42 },
    { "vibe": "Molten Rock", "count": 38 },
    { "vibe": "Mysterious", "count": 25 }
  ],
  "topBooked": [
    { "vibe": "Habitable Paradise", "bookings": 120 },
    { "vibe": "Mysterious", "bookings": 78 }
  ]
}
```

## GET /api/analytics/top-destinations

Returns the most popular exoplanets ranked by booking count.

**Auth:** None.

### Query Parameters

| Parameter | Type    | Default | Description |
|-----------|---------|---------|-------------|
| `limit`   | integer | 10      | Max results (1–100) |

### Example Requests

Top 10 (default):

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/analytics/\
top-destinations" | jq
```

Top 5:

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/analytics/\
top-destinations?limit=5" | jq
```

### Success Response (200)

```json
{
  "destinations": [
    {
      "planetId": "cmlp9k8qn0003dskufekwmztt",
      "name": "HD 219134 c",
      "distance": 21.3,
      "vibe": "Molten Rock",
      "bookings": 45
    },
    {
      "planetId": "cmlp9k8qn0007dskuhej1ifkh",
      "name": "Proxima Centauri b",
      "distance": 4.24,
      "vibe": "Habitable Paradise",
      "bookings": 32
    }
  ]
}
```

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid `limit` parameter |

\newpage

## GET /api/analytics/bookings-summary

Returns aggregated booking statistics: total count, breakdown by travel class,
and a time-series grouped by day or month.

**Auth:** None.

### Query Parameters

| Parameter | Type   | Default | Description |
|-----------|--------|---------|-------------|
| `from`    | string | —       | Start date `YYYY-MM-DD` (inclusive) |
| `to`      | string | —       | End date `YYYY-MM-DD` (inclusive) |
| `groupBy` | string | `day`   | Granularity: `day` or `month` |

### Example Requests

Full summary (all time, daily granularity):

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/analytics/\
bookings-summary" | jq
```

Monthly summary for 2025:

```bash
curl -s \
  "https://exoplanet-travel.vercel.app/api/analytics/\
bookings-summary?from=2025-01-01&to=2025-12-31&groupBy=month" \
  | jq
```

### Success Response (200)

```json
{
  "totalBookings": 256,
  "byTravelClass": [
    { "travelClass": "Economy (Cryo-Sleep)", "count": 180 },
    { "travelClass": "First Class (Warp Drive)", "count": 76 }
  ],
  "byPeriod": [
    { "period": "2025-01", "count": 120 },
    { "period": "2025-02", "count": 136 }
  ]
}
```

When `groupBy=day`, period values use `YYYY-MM-DD` format.
When `groupBy=month`, period values use `YYYY-MM` format.

### Error Responses

| Status | Cause |
|--------|-------|
| 400    | Invalid date format or `groupBy` value |
