# Exoplanet Travel Agency API Documentation (PDF)

Version: 0.1.0

This document describes the REST API for browsing exoplanet destinations and managing travel bookings.

----------------------------------------------------------------

## Base URL

Local:
    http://localhost:3000

Deployed (optional):
    https://YOUR-DEPLOYED-URL-HERE

----------------------------------------------------------------

## Quick start (local)

1) Install dependencies:
    npm install

2) Run migrations + seed:
    npx prisma migrate dev
    npx prisma db seed

3) Start the server:
    npm run dev

4) Verify the API is running:
    curl -s "http://localhost:3000/api/exoplanets?page=1&pageSize=1"

----------------------------------------------------------------

## Conventions

### Data format
- Requests and responses are JSON unless otherwise stated.
- Set request header: Content-Type: application/json

### Pagination
List endpoints support:
- page (1-indexed)
- pageSize (max 100)

### Error format
All error responses follow this structure:

    {
      "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid query parameters",
        "details": {}
      }
    }

Common status codes:
- 200 OK: Successful GET or POST
- 201 Created: Successful resource creation
- 204 No Content: Successful DELETE
- 207 Multi-Status: Partial success (e.g. import with errors)
- 400 Bad Request: Validation / malformed JSON
- 401 Unauthorized: Authentication required (no valid session)
- 403 Forbidden: Insufficient permissions (e.g. non-admin)
- 404 Not Found: Resource does not exist
- 409 Conflict: Resource already exists (e.g. duplicate email)

\newpage

# GET /api/exoplanets

Purpose: List exoplanets (catalogue page) with pagination, search, and filters.

## Query parameters
- page (integer, default 1): Page number (1-indexed)
- pageSize (integer, default 20, max 100): Items per page
- q (string, optional): Case-insensitive substring search in planet name (1–100 characters)
- vibe (string, optional): Filter by derived category (e.g., "Molten Rock", "Mysterious") (1–60 characters)
- minDistance (number, optional): Minimum distance in light years (inclusive)
- maxDistance (number, optional): Maximum distance in light years (inclusive)
- sort (distance | discoveryYear | name, default distance)
- order (asc | desc, default asc)

## Example requests

Basic (page 1, 20 items):
    curl -s "http://localhost:3000/api/exoplanets?page=1&pageSize=20" | jq

Search by name:
    curl -s "http://localhost:3000/api/exoplanets?q=gliese" | jq

Filter by vibe:
    curl -s "http://localhost:3000/api/exoplanets?vibe=Molten%20Rock" | jq

Filter by distance range:
    curl -s "http://localhost:3000/api/exoplanets?minDistance=0&maxDistance=25" | jq

Validation error example:
    curl -i "http://localhost:3000/api/exoplanets?page=-1"

## Success response (200)
Returns a paginated list:

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

## Error responses
- 400: Invalid query parameters (e.g. page < 1)

\newpage

# GET /api/exoplanets/{id}

Purpose: Fetch full details for a single exoplanet.

## Path parameters
- id (string): Exoplanet id (Prisma cuid)

## Example request

    curl -s "http://localhost:3000/api/exoplanets/cmlp9k8qn0000dskuetg0pq62" | jq

Tip: get a valid id from the list endpoint:

    curl -s "http://localhost:3000/api/exoplanets?pageSize=1" | jq -r ".items[0].id"

## Success response (200)
Returns a single exoplanet object:

    {
      "id": "cmlp9k8qn0000dskuetg0pq62",
      "name": "HD 219134 b",
      "distance": 21.3,
      "temperature": 782,
      "gravity": 1.91,
      "vibe": "Molten Rock",
      "discoveryYear": 2015
    }

## Error responses
- 400: Invalid id format
- 404: Exoplanet not found

\newpage

# GET /api/bookings

Purpose: List bookings for the authenticated user.

**Authentication:** Requires a valid `exo-session` cookie.

- **Regular users** see only their own bookings.
- **Admins** see all bookings across users.

## Query parameters
- page (integer, default 1)
- pageSize (integer, default 20, max 100)

## Example requests

List my bookings (uses session cookie for auth):
    curl -s -b cookies.txt "http://localhost:3000/api/bookings?page=1&pageSize=10" | jq

## Success response (200)
Returns a paginated list of bookings including user and planet summary info:

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

## Error responses
- 400: Invalid query parameters
- 401: Authentication required (no valid session cookie)

\newpage

# POST /api/bookings

Purpose: Create a booking for the authenticated user to travel to an exoplanet.

**Authentication:** Requires a valid `exo-session` cookie. The `userId` is derived from the session — do not include it in the request body.

## Request body fields
- planetId (string): Exoplanet id (CUID format, min 10 characters)
- travelClass (string): Travel class label, e.g. "Economy (Cryo-Sleep)" (1–60 characters)

## Example request

    curl -s -X POST "http://localhost:3000/api/bookings" \
      -H "Content-Type: application/json" \
      -b cookies.txt \
      -d '{"planetId":"cmlp9k8qn0007dskuhej1ifkh","travelClass":"Economy (Cryo-Sleep)"}' | jq

## Success response (201)
Returns the created booking:

    {
      "id": "cmlp9k90d00dzdskuje80hqav",
      "userId": "cmlp9k8ut00dwdskud6g70sxc",
      "planetId": "cmlp9k8qn0007dskuhej1ifkh",
      "travelClass": "Economy (Cryo-Sleep)",
      "status": "CONFIRMED",
      "bookingDate": "2026-02-16T14:52:20.000Z"
    }

## Error responses
- 400: Invalid JSON or validation error
- 401: Authentication required (no valid session cookie)
- 404: Exoplanet not found

\newpage

# GET /api/bookings/{id}

Purpose: Retrieve a single booking by its ID, including user and planet details.

**Authentication:** Requires a valid `exo-session` cookie. Only the **booking owner** or an **ADMIN** can view a booking.

## Path parameters
- id (string): Booking id

## Example request

    curl -s -b cookies.txt "http://localhost:3000/api/bookings/cmlp9k90d00dzdskuje80hqav" | jq

## Success response (200)
Returns the booking with related data:

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

## Error responses
- 400: Invalid booking id
- 401: Authentication required (no valid session cookie)
- 403: Forbidden — you can only view your own bookings
- 404: Booking not found

\newpage

# PATCH /api/bookings/{id}

Purpose: Partially update a booking (e.g., change travel class).

**Authentication:** Requires a valid `exo-session` cookie. Only the **booking owner** or an **ADMIN** can update a booking.

## Path parameters
- id (string): Booking id

## Request body
Provide at least one field:
- travelClass (string, 1–60 characters)
- status (string, 1–30 characters)

**Note:** Non-admin users may only set `status` to `"CANCELLED"`. Setting any other status value as a non-admin returns 403 Forbidden.

## Example request

    curl -s -X PATCH "http://localhost:3000/api/bookings/cmlp9k90d00dzdskuje80hqav" \
      -H "Content-Type: application/json" \
      -b cookies.txt \
      -d '{"travelClass":"First Class (Warp Drive)"}' | jq

## Success response (200)
Returns the updated booking:

    {
      "id": "cmlp9k90d00dzdskuje80hqav",
      "userId": "cmlp9k8ut00dwdskud6g70sxc",
      "planetId": "cmlp9k8qn0007dskuhej1ifkh",
      "travelClass": "First Class (Warp Drive)",
      "status": "CONFIRMED",
      "bookingDate": "2026-02-16T14:52:20.000Z"
    }

## Error responses
- 400: Invalid id or invalid payload
- 401: Authentication required (no valid session cookie)
- 403: Forbidden — you can only modify your own bookings
- 404: Booking not found

\newpage

# DELETE /api/bookings/{id}

Purpose: Delete a booking.

**Authentication:** Requires a valid `exo-session` cookie. Only the **booking owner** or an **ADMIN** can delete a booking.

## Path parameters
- id (string): Booking id

## Example request

    curl -i -X DELETE "http://localhost:3000/api/bookings/cmlp9k90d00dzdskuje80hqav" \
      -b cookies.txt

## Success response (204)
No response body.

## Error responses
- 400: Invalid id
- 401: Authentication required (no valid session cookie)
- 403: Forbidden — you can only delete your own bookings
- 404: Booking not found

\newpage

# POST /api/auth/register

Purpose: Register a new user account.

Sets an httpOnly `exo-session` cookie upon success.

## Request body fields
- email (string): User email (stored as lowercase)
- password (string): Password (8–100 characters)
- name (string): Display name (1–100 characters)

## Example request

    curl -s -X POST "http://localhost:3000/api/auth/register" \
      -H "Content-Type: application/json" \
      -c cookies.txt \
      -d '{"email":"jane@example.com","password":"securePass123","name":"Jane Doe"}' | jq

## Success response (201)
Returns the created user (password is never returned):

    {
      "id": "cmlp9k8ut00dwdskud6g70sxc",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "role": "USER"
    }

## Error responses
- 400: Validation error (e.g. missing fields, password too short)
- 409: Email already exists
- 429: Too many registration attempts (rate limited)

\newpage

# POST /api/auth/login

Purpose: Authenticate with email and password.

Sets an httpOnly `exo-session` cookie upon success.

## Request body fields
- email (string): User email
- password (string): User password

## Example request

    curl -s -X POST "http://localhost:3000/api/auth/login" \
      -H "Content-Type: application/json" \
      -c cookies.txt \
      -d '{"email":"jane@example.com","password":"securePass123"}' | jq

## Success response (200)
Returns the authenticated user:

    {
      "id": "cmlp9k8ut00dwdskud6g70sxc",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "role": "USER"
    }

## Error responses
- 400: Validation error (e.g. missing fields)
- 401: Invalid email or password
- 429: Too many login attempts (rate limited)

\newpage

# GET /api/auth/me

Purpose: Get the currently authenticated user from the session cookie.

No authentication is strictly required — returns `{ "user": null }` if no valid session is present.

## Example request

    curl -s -b cookies.txt "http://localhost:3000/api/auth/me" | jq

## Success response (200)
Returns the session user or null:

    {
      "user": {
        "id": "cmlp9k8ut00dwdskud6g70sxc",
        "email": "jane@example.com",
        "name": "Jane Doe",
        "role": "USER"
      }
    }

If unauthenticated:

    {
      "user": null
    }

\newpage

# POST /api/auth/logout

Purpose: Clear the session cookie and log out.

## Example request

    curl -s -X POST "http://localhost:3000/api/auth/logout" -b cookies.txt | jq

## Success response (200)

    {
      "success": true
    }

\newpage

# POST /api/admin/refresh-exoplanets

Purpose: Trigger a fresh import of exoplanets from the NASA Exoplanet Archive TAP service.

**Authentication:** Requires a valid `exo-session` cookie with **ADMIN** role.

The import upserts planets (inserts new, updates existing) and records a `DataImportRun`.

## Example request

    curl -s -X POST "http://localhost:3000/api/admin/refresh-exoplanets" \
      -b cookies.txt | jq

## Success response (200)

    {
      "message": "Import completed successfully",
      "retrievedAt": "2026-03-06T10:00:00.000Z",
      "tapQuery": "SELECT ...",
      "insertedCount": 15,
      "updatedCount": 485,
      "errorMessage": null
    }

## Partial success response (207)
Returned when the import completed but some planets failed:

    {
      "message": "Import completed with errors",
      "retrievedAt": "2026-03-06T10:00:00.000Z",
      "tapQuery": "SELECT ...",
      "insertedCount": 10,
      "updatedCount": 480,
      "errorMessage": "Failed to parse row 42: missing required field"
    }

## Error responses
- 401: Authentication required
- 403: Forbidden — requires ADMIN role

\newpage

# GET /api/admin/import-runs

Purpose: List data import run records (paginated).

**Authentication:** Requires a valid `exo-session` cookie with **ADMIN** role.

## Query parameters
- page (integer, default 1)
- pageSize (integer, default 20, max 100)

## Example request

    curl -s -b cookies.txt "http://localhost:3000/api/admin/import-runs?page=1&pageSize=10" | jq

## Success response (200)

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

## Error responses
- 400: Invalid query parameters
- 401: Authentication required
- 403: Forbidden — requires ADMIN role

\newpage

# GET /api/analytics/vibes

Purpose: Get the distribution of exoplanets across vibe categories, plus vibes ranked by booking popularity.

## Query parameters
None.

## Example request

    curl -s "http://localhost:3000/api/analytics/vibes" | jq

## Success response (200)
Returns two arrays — planet counts per vibe and booking counts per vibe:

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

\newpage

# GET /api/analytics/top-destinations

Purpose: Get the most popular exoplanet destinations ranked by total booking count.

## Query parameters
- limit (integer, default 10, min 1, max 100): Maximum number of destinations to return

## Example requests

Top 10 (default):
    curl -s "http://localhost:3000/api/analytics/top-destinations" | jq

Top 5:
    curl -s "http://localhost:3000/api/analytics/top-destinations?limit=5" | jq

## Success response (200)
Returns an array of destinations ordered by booking count (descending):

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

## Error responses
- 400: Invalid limit parameter

\newpage

# GET /api/analytics/bookings-summary

Purpose: Get aggregated booking statistics — total count, breakdown by travel class, and a time-series breakdown by day or month.

## Query parameters
- from (string, optional): Start date filter (YYYY-MM-DD, inclusive)
- to (string, optional): End date filter (YYYY-MM-DD, inclusive)
- groupBy (day | month, default day): Time granularity for the byPeriod array

## Example requests

Full summary (all time, daily):
    curl -s "http://localhost:3000/api/analytics/bookings-summary" | jq

Monthly summary for 2025:
    curl -s "http://localhost:3000/api/analytics/bookings-summary?from=2025-01-01&to=2025-12-31&groupBy=month" | jq

## Success response (200)
Returns total bookings, travel-class breakdown, and time-series data:

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

Note: When groupBy=day, period values use YYYY-MM-DD format. When groupBy=month, period values use YYYY-MM format.

## Error responses
- 400: Invalid date format or invalid groupBy value

\newpage

# GET /api/health

Purpose: Liveness / readiness probe — checks database connectivity and reports uptime.

No authentication required.

## Example request

    curl -s "http://localhost:3000/api/health" | jq

## Success response (200)

    {
      "status": "ok",
      "timestamp": "2026-03-06T10:00:00.000Z",
      "database": "connected",
      "uptime": 3642.12
    }

## Degraded response (503)
Returned when the database is unreachable:

    {
      "status": "degraded",
      "timestamp": "2026-03-06T10:00:00.000Z",
      "database": "disconnected",
      "uptime": 3642.12
    }
