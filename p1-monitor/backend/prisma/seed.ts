import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(databaseUrl),
});

async function main() {
  console.log('Seeding database...');

  await prisma.toolCall.deleteMany();
  await prisma.diagnosis.deleteMany();
  await prisma.anomaly.deleteMany();
  await prisma.metric.deleteMany();
  await prisma.server.deleteMany();

  for (let i = 1; i <= 10; i++) {
    const server = await prisma.server.create({
      data: {
        id: `srv-${String(i).padStart(3, '0')}`,
        name: `Server ${i}`,
        roomId: i <= 5 ? 'room-A' : 'room-B',
        type: 'server',
        ip: `192.168.1.${100 + i}`,
        specs: {
          cpu: 'Intel Xeon E5-2680',
          memory: '128GB',
          disk: '4TB SSD',
        },
        status: 'online',
      },
    });

    console.log(`Created server ${server.id}`);
  }

  console.log('Seed data completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
