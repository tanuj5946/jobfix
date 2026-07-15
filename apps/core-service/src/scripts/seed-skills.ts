import { prisma } from '../config/database';
import { seedSkillCatalog } from './skill-catalog';

seedSkillCatalog()
  .then(result => console.log(`Skill catalog ready: ${result.count} new skills added.`))
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
