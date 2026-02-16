/**
 * Database Seeding Script
 * 
 * This script fetches real exoplanet data from the Caltech NASA Archive.
 * See Technical Report Appendix A for the full generation prompt.
 */

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { parse } from 'csv-parse/sync';

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

function calculateGravity(mass: number | null, radius: number | null): number | null {
    if (!mass || !radius) return null;
    const g = mass / Math.pow(radius, 2);
    return parseFloat(g.toFixed(2));
}

function determineVibe(tempKelvin: number | null, radius: number | null): string {
    if (!tempKelvin) return "Mysterious";

    const tempC = tempKelvin - 273.15;

    if (radius && radius > 6) {
        if (tempC > 1000) return "Hot Jupiter";
        return "Gas Giant";
    }

    if (tempC < -100) return "Ice World";
    if (tempC >= -50 && tempC <= 50) return "Habitable Paradise";
    if (tempC > 50 && tempC < 200) return "Sauna World";
    if (tempC >= 200 && tempC < 1000) return "Molten Rock";
    if (tempC >= 1000) return "Literal Hellscape";

    return "Barren Wasteland";
}

async function fetchAndNormalizePlanets(): Promise<ProcessedPlanet[]> {
    console.log('🚀 Fetching data from NASA...');
    
    const query = "select pl_name,sy_dist,pl_eqt,pl_masse,pl_rade,disc_year from ps where default_flag=1 and sy_dist is not null and pl_rade is not null order by sy_dist asc";
    const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(query)}&format=csv`;

    try {
        const { data } = await axios.get(url);
        
        const records: NasaExoplanetRaw[] = parse(data, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
        });

        const top50 = records.slice(0, 50);

        return top50.map((record) => {
            const mass = parseFloat(record.pl_masse) || null;
            const radius = parseFloat(record.pl_rade) || null;
            const temp = parseFloat(record.pl_eqt) || null;
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
        console.error("❌ Error fetching NASA data:", error);
        return [];
    }
}

async function main() {
    console.log('🌱 Starting Seed...');

    if (process.env.NODE_ENV === "production") {
        await prisma.booking.deleteMany();
        await prisma.user.deleteMany();
        await prisma.exoplanet.deleteMany();
    }

    const planetsData = await fetchAndNormalizePlanets();
    
    if (planetsData.length === 0) {
        console.warn("⚠️ No planets fetched. Check API connection.");
        return;
    }

    await prisma.exoplanet.createMany({
        data: planetsData,
        skipDuplicates: true, 
    });
    console.log(`🌌 Created ${planetsData.length} exoplanets.`);

    const user1 = await prisma.user.create({
        data: {
            email: 'star.lord@guardians.com',
            name: 'Peter Quill',
        },
    });

    const user2 = await prisma.user.create({
        data: {
            email: 'ripley@nostromo.corp',
            name: 'Ellen Ripley',
        },
    });
    console.log(`👤 Created users: ${user1.name} & ${user2.name}`);

    const proxima = await prisma.exoplanet.findFirst({ where: { name: { contains: 'LTT 1445 A b' } } });
    const trappist = await prisma.exoplanet.findFirst({ where: { name: { contains: 'Gliese 12 b' } } });

    if (proxima) {
        await prisma.booking.create({
            data: {
                userId: user1.id,
                planetId: proxima.id,
                travelClass: 'Economy (Cryo-Sleep)',
            },
        });
        console.log(`🎫 Booked trip for Peter to ${proxima.name}`);
    }

    if (trappist) {
        await prisma.booking.create({
            data: {
                userId: user2.id,
                planetId: trappist.id,
                travelClass: 'First Class (Warp Drive)',
            },
        });
        console.log(`🎫 Booked trip for Ripley to ${trappist.name}`);
    }

    console.log('✅ Seeding completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });