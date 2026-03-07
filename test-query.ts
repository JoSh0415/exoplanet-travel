import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const trunc = "month";
  const whereClause = Prisma.empty;
  try {
    const res = await prisma.$queryRaw(Prisma.sql`
      SELECT date_trunc(${trunc}, "bookingDate") AS period, COUNT("id")::bigint AS count
      FROM "Booking"
      ${whereClause}
      GROUP BY period
      ORDER BY period ASC
    `);
    console.log(res);
  } catch(e) {
    console.error(e);
  }
}
run();
