import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database (users + metric templates only — real data comes from API sync)...');

  // Users
  const adminHash = await bcrypt.hash('admin12345', 10);
  const userHash = await bcrypt.hash('user12345', 10);
  await prisma.user.upsert({ where: { email: 'admin@the-gaffer.local' }, create: { email: 'admin@the-gaffer.local', name: 'Admin', password: adminHash, role: 'ADMIN' }, update: {} });
  await prisma.user.upsert({ where: { email: 'user@the-gaffer.local' }, create: { email: 'user@the-gaffer.local', name: 'Demo User', password: userHash, role: 'USER' }, update: {} });

  // Custom metric templates
  await prisma.customMetric.upsert({ where: { id: 1 }, create: { id: 1, name: 'Attacking Strength', scope: 'team', formula: '(goals_for_per_match * 3) + (total_shots * 0.1) + (expected_goals * 2)', description: 'Measures offensive output' }, update: {} });
  await prisma.customMetric.upsert({ where: { id: 2 }, create: { id: 2, name: 'Striker Score', scope: 'player', formula: '(goals * 4) + assists + (shots_on * 0.5)', description: 'Rates striker contribution' }, update: {} });

  console.log('Seed complete.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
