/**
 * Database Seeding Script
 * 
 * This script fetches real exoplanet data from the Caltech NASA Archive.
 * See Technical Report Appendix A for the full generation prompt.
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { parse } from 'csv-parse/sync';
import { hashSync } from 'bcryptjs';
import { calculateGravity, determineVibe } from '../app/lib/planetMath';

const prisma = new PrismaClient();

interface NasaExoplanetRaw {
    pl_name: string;
    sy_dist: string;
    pl_eqt: string;
    pl_masse: string;
    pl_rade: string;
    disc_year: string;
}

interface ProcessedPlanet {
    name: string;
    distance: number;
    temperature: number | null;
    gravity: number | null;
    vibe: string;
    discoveryYear: number | null;
}

function toNumberOrNull(value: string) {
    if (!value || value.trim() === '') return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

async function fetchAndNormalizePlanets(): Promise<ProcessedPlanet[]> {    
    const query = "select pl_name,sy_dist,pl_eqt,pl_masse,pl_rade,disc_year from ps where default_flag=1 and sy_dist is not null and pl_rade is not null order by sy_dist asc";
    const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=csv`;

    try {
        const { data } = await axios.get(url);
        
        const records: NasaExoplanetRaw[] = parse(data, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });
        
        const limit = Number(process.env.SEED_PLANET_LIMIT ?? 500);
        const selected = records.slice(0, limit);

        return selected.map((record) => {
            const mass = toNumberOrNull(record.pl_masse);
            const radius = toNumberOrNull(record.pl_rade);
            const temp = toNumberOrNull(record.pl_eqt);
            const distParsecs = parseFloat(record.sy_dist);

            return {
                name: record.pl_name,
                distance: parseFloat((distParsecs * 3.26156).toFixed(2)),
                temperature: temp,
                gravity: calculateGravity(mass, radius),
                vibe: determineVibe(temp, radius),
                discoveryYear: parseInt(record.disc_year) || null,
            };
        });

    } catch (error) {
        console.error("Error fetching data:", error);
        return [];
    }
}

async function main() {
    console.log('Starting Seed');

    if (process.env.NODE_ENV != "production") {
        await prisma.booking.deleteMany();
        await prisma.user.deleteMany();
        await prisma.exoplanet.deleteMany();
    }

    const planetsData = await fetchAndNormalizePlanets();
    
    if (planetsData.length === 0) {
        console.warn("No planets fetched.");
        return;
    }

    await prisma.exoplanet.createMany({
        data: planetsData,
        skipDuplicates: true, 
    });

    const user1 = await prisma.user.create({
        data: {
            email: 'star.lord@guardians.com',
            name: 'Peter Quill',
            passwordHash: hashSync('password123', 10),
        },
    });

    const user2 = await prisma.user.create({
        data: {
            email: 'ripley@nostromo.corp',
            name: 'Ellen Ripley',
            passwordHash: hashSync('password123', 10),
        },
    });

    const hellscape = await prisma.exoplanet.findFirst({ where: { vibe: { contains: 'Literal Hellscape' } } });
    const paradise = await prisma.exoplanet.findFirst({ where: { vibe: { contains: 'Habitable Paradise' } } });

    if (hellscape) {
        await prisma.booking.create({
            data: {
                userId: user1.id,
                planetId: hellscape.id,
                travelClass: 'Economy (Cryo-Sleep)',
            },
        });
    }

    if (paradise) {
        await prisma.booking.create({
            data: {
                userId: user2.id,
                planetId: paradise.id,
                travelClass: 'First Class (Warp Drive)',
            },
        });
    }

    console.log('Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });