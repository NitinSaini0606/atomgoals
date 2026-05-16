import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();
const password = 'password123';

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@atomgoals.com' },
    update: {
      name: 'AtomGoals Manager',
      passwordHash,
      role: UserRole.MANAGER,
      managerId: null,
      isActive: true
    },
    create: {
      employeeCode: 'MGR-001',
      name: 'AtomGoals Manager',
      email: 'manager@atomgoals.com',
      passwordHash,
      role: UserRole.MANAGER
    }
  });

  await prisma.user.upsert({
    where: { email: 'employee@atomgoals.com' },
    update: {
      name: 'AtomGoals Employee',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id,
      isActive: true
    },
    create: {
      employeeCode: 'EMP-001',
      name: 'AtomGoals Employee',
      email: 'employee@atomgoals.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id
    }
  });

  await prisma.user.upsert({
    where: { email: 'employee2@atomgoals.com' },
    update: {
      name: 'AtomGoals Employee Two',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id,
      isActive: true
    },
    create: {
      employeeCode: 'EMP-002',
      name: 'AtomGoals Employee Two',
      email: 'employee2@atomgoals.com',
      passwordHash,
      role: UserRole.EMPLOYEE,
      managerId: manager.id
    }
  });

  await prisma.user.upsert({
    where: { email: 'admin@atomgoals.com' },
    update: {
      name: 'AtomGoals Admin',
      passwordHash,
      role: UserRole.ADMIN,
      managerId: null,
      isActive: true
    },
    create: {
      employeeCode: 'ADM-001',
      name: 'AtomGoals Admin',
      email: 'admin@atomgoals.com',
      passwordHash,
      role: UserRole.ADMIN
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('Demo users seeded');
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
