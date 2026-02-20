const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create super admin user
  const superAdminEmail = 'admin@misslaura.com';
  const superAdminPassword = 'Admin@123456';
  const hashedPassword = await bcrypt.hash(superAdminPassword, 12);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: superAdminEmail }
  });

  if (!existingAdmin) {
    // Create a system school for super admin
    const school = await prisma.school.create({
      data: {
        name: 'Miss Laura System',
        email: 'system@misslaura.com',
        plan: 'ENTERPRISE'
      }
    });

    await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        schoolId: school.id
      }
    });
    console.log('Created super admin user:');
    console.log('  Email: admin@misslaura.com');
    console.log('  Password: Admin@123456');
  } else {
    console.log('Super admin already exists');
  }

  // Create subscription plans
  const plans = [
    {
      name: 'free',
      displayName: 'Free Plan',
      description: 'Perfect for trying out Miss Laura',
      priceMonthly: 0,
      priceYearly: 0,
      maxTeachers: 1,
      maxWorksheets: 5,
      maxAiCalls: 50,
      hasTextbookAccess: false,
      hasMicrosoftForms: false,
      hasCustomThemes: false,
      isDefault: true,
      sortOrder: 1
    },
    {
      name: 'premium',
      displayName: 'Premium Plan',
      description: 'Great for individual teachers and small schools',
      priceMonthly: 499,
      priceYearly: 4990,
      maxTeachers: 5,
      maxWorksheets: 50,
      maxAiCalls: 500,
      hasTextbookAccess: true,
      hasMicrosoftForms: true,
      hasCustomThemes: true,
      isDefault: false,
      sortOrder: 2
    },
    {
      name: 'enterprise',
      displayName: 'Enterprise Plan',
      description: 'For larger schools with advanced needs',
      priceMonthly: 1499,
      priceYearly: 14990,
      maxTeachers: 50,
      maxWorksheets: 500,
      maxAiCalls: 5000,
      hasTextbookAccess: true,
      hasMicrosoftForms: true,
      hasCustomThemes: true,
      isDefault: false,
      sortOrder: 3
    }
  ];

  for (const plan of plans) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { name: plan.name }
    });

    if (!existing) {
      await prisma.subscriptionPlan.create({
        data: plan
      });
      console.log(`Created plan: ${plan.displayName}`);
    } else {
      console.log(`Plan already exists: ${plan.name}`);
    }
  }

  // Create boards
  const boards = [
    { name: 'CBSE' },
    { name: 'ICSE' },
    { name: 'State Board' },
    { name: 'IB' },
    { name: 'IGCSE' }
  ];

  for (const board of boards) {
    const existing = await prisma.board.findFirst({
      where: { name: board.name }
    });

    if (!existing) {
      await prisma.board.create({
        data: board
      });
      console.log(`Created board: ${board.name}`);
    } else {
      console.log(`Board already exists: ${board.name}`);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
