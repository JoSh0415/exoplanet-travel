/**
 * Database Seeding Script
 * 
 * This script fetches real exoplanet data from the Caltech NASA Archive.
 * See Technical Report Appendix A for the full generation prompt.
 */

import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import { importExoplanets } from '../app/lib/nasaImport';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Seed');

    if (process.env.NODE_ENV != "production") {
        await prisma.booking.deleteMany();
        await prisma.user.deleteMany();
        await prisma.exoplanet.deleteMany();
        await prisma.dataImportRun.deleteMany();
    }

    const limit = Number(process.env.SEED_PLANET_LIMIT ?? 500);
    const result = await importExoplanets(prisma, {
        limit,
        sourceName: 'NASA Exoplanet Archive (seed)',
    });

    if (result.errorMessage) {
        console.warn('Import had errors:', result.errorMessage);
    }

    console.log(
        `Imported ${result.insertedCount} new, ${result.updatedCount} updated exoplanets.`
    );

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

    // Create an admin user for demo / testing
    await prisma.user.create({
        data: {
            email: 'admin@exoplanet.travel',
            name: 'Admin',
            role: 'ADMIN',
            passwordHash: hashSync('admin123', 10),
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