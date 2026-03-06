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
- 200 OK: Successful GET
- 201 Created: Successful POST
- 204 No Content: Successful DELETE
- 400 Bad Request: Validation / malformed JSON
- 404 Not Found: Resource does not exist

\newpage

# GET /api/exoplanets

Purpose: List exoplanets (catalogue page) with pagination, search, and filters.

## Query parameters
- page (integer, default 1): Page number (1-indexed)
- pageSize (integer, default 20, max 100): Items per page
- q (string, optional): Case-insensitive substring search in planet name
- vibe (string, optional): Filter by derived category (e.g., "Molten Rock", "Mysterious")
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
- planetId (string): Exoplanet id
- travelClass (string): Travel class label (e.g. "Economy (Cryo-Sleep)")

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
      "bookingDate": "2026-02-16T14:52:20.000Z"
    }

## Error responses
- 400: Invalid JSON or validation error
- 401: Authentication required (no valid session cookie)
- 404: Exoplanet not found

\newpage

# PATCH /api/bookings/{id}

Purpose: Partially update a booking (e.g., change travel class).

**Authentication:** Requires a valid `exo-session` cookie. Only the **booking owner** or an **ADMIN** can update a booking.

## Path parameters
- id (string): Booking id

## Request body
Provide at least one field:
- travelClass (string)

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
- limit (integer, default 10, max 100): Maximum number of destinations to return

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
