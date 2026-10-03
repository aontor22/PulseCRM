import { prisma } from './lib/prisma.js';

function errorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: unknown }).code || '');
  }
  return '';
}

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('Database connection OK.');
} catch (error) {
  const code = errorCode(error);
  console.error('Database connection FAILED.');
  if (code === 'P1000') {
    console.error('P1000: DATABASE_URL username/password is invalid. Update apps/api/.env.');
  } else if (code === 'P1010') {
    console.error('P1010: the configured database user does not have access to this database.');
  } else {
    console.error(error);
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
