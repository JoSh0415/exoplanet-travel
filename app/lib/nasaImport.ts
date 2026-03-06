/**
 * Reusable NASA Exoplanet Archive TAP import logic.
 *
 * Used by both the seed script (`prisma/seed.ts`) and the admin
 * refresh endpoint (`/api/admin/refresh-exoplanets`).
 */

import type { PrismaClient } from "@prisma/client";
import axios from "axios";
import { parse } from "csv-parse/sync";
import { calculateGravity, determineVibe } from "./planetMath";

/* ── Raw row coming back from the TAP CSV ─────────────────────────── */

export interface NasaExoplanetRaw {
  pl_name: string;
  sy_dist: string;
  pl_eqt: string;
  pl_masse: string;
  pl_rade: string;
  disc_year: string;
}

/* ── Normalised planet ready for Prisma ────────────────────────────── */

export interface ProcessedPlanet {
  name: string;
  distance: number;
  temperature: number | null;
  gravity: number | null;
  vibe: string;
  discoveryYear: number | null;
}

/* ── Import result summary ─────────────────────────────────────────── */

export interface ImportResult {
  retrievedAt: Date;
  tapQuery: string;
  insertedCount: number;
  updatedCount: number;
  errorMessage: string | null;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

function toNumberOrNull(value: string): number | null {
  if (!value || value.trim() === "") return null;
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

export const DEFAULT_TAP_QUERY =
  "select pl_name,sy_dist,pl_eqt,pl_masse,pl_rade,disc_year from ps where default_flag=1 and sy_dist is not null and pl_rade is not null order by sy_dist asc";

/* ── Fetch + normalise ─────────────────────────────────────────────── */

export async function fetchAndNormalizePlanets(
  limit?: number,
  query: string = DEFAULT_TAP_QUERY
): Promise<ProcessedPlanet[]> {
  const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=csv`;

  const { data } = await axios.get(url);

  const records: NasaExoplanetRaw[] = parse(data, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const selected = limit ? records.slice(0, limit) : records;

  const validPlanets: ProcessedPlanet[] = [];

  for (const record of selected) {
    if (!record.pl_name || !record.sy_dist) continue;

    const mass = toNumberOrNull(record.pl_masse);
    const radius = toNumberOrNull(record.pl_rade);
    const temp = toNumberOrNull(record.pl_eqt);
    const distParsecs = parseFloat(record.sy_dist);

    if (isNaN(distParsecs)) continue; // Ignore if distance is irreparably broken

    validPlanets.push({
      name: record.pl_name,
      distance: parseFloat((distParsecs * 3.26156).toFixed(2)),
      temperature: temp,
      gravity: calculateGravity(mass, radius),
      vibe: determineVibe(temp, radius),
      discoveryYear: parseInt(record.disc_year) || null,
    });
  }

  return validPlanets;
}

/* ── Upsert planets + record import run ────────────────────────────── */

export async function importExoplanets(
  db: PrismaClient,
  options: { limit?: number; sourceName?: string } = {}
): Promise<ImportResult> {
  const tapQuery = DEFAULT_TAP_QUERY;
  const retrievedAt = new Date();
  const sourceName = options.sourceName ?? "NASA Exoplanet Archive";

  let insertedCount = 0;
  let updatedCount = 0;
  let errorMessage: string | null = null;
  const errors: string[] = [];

  try {
    const planets = await fetchAndNormalizePlanets(options.limit, tapQuery);

    for (const planet of planets) {
      try {
        const existing = await db.exoplanet.findUnique({
          where: { name: planet.name },
          select: { id: true },
        });

        if (existing) {
          await db.exoplanet.update({
            where: { name: planet.name },
            data: planet,
          });
          updatedCount++;
        } else {
          await db.exoplanet.create({ data: planet });
          insertedCount++;
        }
      } catch (rowErr) {
        errors.push(`Failed to import ${planet.name}: ${rowErr instanceof Error ? rowErr.message : String(rowErr)}`);
      }
    }
  } catch (err) {
    errorMessage =
      err instanceof Error ? err.message : "Unknown error during data fetching";
  }

  if (!errorMessage && errors.length > 0) {
    errorMessage = `Imported with ${errors.length} row errors. First error: ${errors[0]}`;
  }

  await db.dataImportRun.create({
    data: {
      sourceName,
      tapQuery,
      retrievedAt,
      insertedCount,
      updatedCount,
      errorMessage,
    },
  });

  return { retrievedAt, tapQuery, insertedCount, updatedCount, errorMessage };
}
