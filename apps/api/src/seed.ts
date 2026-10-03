import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash('Demo12345!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { name: 'Demo Admin', passwordHash },
    create: { email: 'admin@example.com', name: 'Demo Admin', passwordHash }
  });
  const teammate = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: { name: 'Sales Teammate', passwordHash },
    create: { email: 'sales@example.com', name: 'Sales Teammate', passwordHash }
  });

  let org = await prisma.organization.findUnique({ where: { slug: 'acme-growth-lab' } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: 'Acme Growth Lab', slug: 'acme-growth-lab', inviteCode: 'ACME2026' } });
  }

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { role: 'OWNER' },
    create: { userId: admin.id, organizationId: org.id, role: 'OWNER' }
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: teammate.id, organizationId: org.id } },
    update: { role: 'MEMBER' },
    create: { userId: teammate.id, organizationId: org.id, role: 'MEMBER' }
  });

  if ((await prisma.lead.count({ where: { organizationId: org.id } })) === 0) {
    const leads = await Promise.all([
      prisma.lead.create({ data: { name: 'Nadia Rahman', company: 'Northstar Retail', email: 'nadia@example.com', source: 'Referral', status: 'QUALIFIED', value: 12500, organizationId: org.id, createdById: admin.id, ownerId: admin.id } }),
      prisma.lead.create({ data: { name: 'Arif Hossain', company: 'Pixel Forge', email: 'arif@example.com', source: 'Website', status: 'PROPOSAL', value: 22000, organizationId: org.id, createdById: admin.id, ownerId: teammate.id } }),
      prisma.lead.create({ data: { name: 'Maya Chen', company: 'Brightdesk', email: 'maya@example.com', source: 'LinkedIn', status: 'NEW', value: 6800, organizationId: org.id, createdById: admin.id, ownerId: teammate.id } }),
      prisma.lead.create({ data: { name: 'Samiul Karim', company: 'Atlas Commerce', email: 'samiul@example.com', source: 'Conference', status: 'WON', value: 34000, organizationId: org.id, createdById: admin.id, ownerId: admin.id } })
    ]);

    await prisma.task.createMany({
      data: [
        { title: 'Send pricing proposal', priority: 'HIGH', status: 'IN_PROGRESS', dueDate: new Date(Date.now() + 2 * 86400000), organizationId: org.id, createdById: admin.id, assigneeId: teammate.id, leadId: leads[1].id },
        { title: 'Discovery call with Northstar', priority: 'MEDIUM', status: 'TODO', dueDate: new Date(Date.now() + 86400000), organizationId: org.id, createdById: admin.id, assigneeId: admin.id, leadId: leads[0].id },
        { title: 'Prepare onboarding notes', priority: 'LOW', status: 'DONE', organizationId: org.id, createdById: admin.id, assigneeId: admin.id, leadId: leads[3].id }
      ]
    });
  }

  console.log('Seed complete. Demo login: admin@example.com / Demo12345!');
}

main().finally(async () => prisma.$disconnect());
