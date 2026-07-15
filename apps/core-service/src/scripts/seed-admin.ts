import { prisma } from '../config/database';
import { hashPassword } from '../utils/password';
import { seedSkillCatalog } from './skill-catalog';

const email = process.env.ADMIN_EMAIL ?? 'admin@smartfresher.local';
const password = process.env.ADMIN_PASSWORD ?? 'Admin@12345';
const name = process.env.ADMIN_NAME ?? 'SmartFresher Admin';

async function main() {
  await seedSkillCatalog();
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: 'admin' },
    create: { name, email, passwordHash, role: 'admin' },
  });
  console.log(`Admin account is ready: ${email}`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
