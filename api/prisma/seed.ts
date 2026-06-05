import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Seed Users
  const users = [
    {
      email: 'employee@wps.local',
      password: 'Employee@123',
      firstName: 'John',
      lastName: 'Smith',
      role: Role.EMPLOYEE,
      accountNo: 'EMP001',
      iban: 'AE070331234567890123456',
      swift: 'EBILAEAD',
      bankName: 'Emirates NBD',
      department: 'Sales',
    },
    {
      email: 'manager@wps.local',
      password: 'Manager@123',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: Role.MANAGER,
      accountNo: 'MGR001',
      iban: 'AE070331234567890123457',
      swift: 'EBILAEAD',
      bankName: 'Emirates NBD',
      department: 'Sales Management',
    },
    {
      email: 'finance@wps.local',
      password: 'Finance@123',
      firstName: 'Michael',
      lastName: 'Brown',
      role: Role.FINANCE,
      accountNo: 'FIN001',
      iban: 'AE070331234567890123458',
      swift: 'EBILAEAD',
      bankName: 'ADCB',
      department: 'Finance',
    },
    {
      email: 'admin@wps.local',
      password: 'Admin@123',
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
      accountNo: 'ADM001',
      iban: 'AE070331234567890123459',
      swift: 'EBILAEAD',
      bankName: 'FAB',
      department: 'IT',
    },
    {
      email: 'alice.wong@wps.local',
      password: 'Alice@123',
      firstName: 'Alice',
      lastName: 'Wong',
      role: Role.EMPLOYEE,
      accountNo: 'EMP002',
      iban: 'AE070331234567890123460',
      swift: 'ADCBAEAD',
      bankName: 'ADCB',
      department: 'Marketing',
    },
    // Additional finance members
    {
      email: 'finance2@wps.local',
      password: 'Finance2@123',
      firstName: 'Aisha',
      lastName: 'Al Mansoori',
      role: Role.FINANCE,
      accountNo: 'FIN002',
      iban: 'AE070331234567890123461',
      swift: 'EBILAEAD',
      bankName: 'Emirates NBD',
      department: 'Finance',
    },
    {
      email: 'finance3@wps.local',
      password: 'Finance3@123',
      firstName: 'Omar',
      lastName: 'Hassan',
      role: Role.FINANCE,
      accountNo: 'FIN003',
      iban: 'AE070331234567890123462',
      swift: 'ADCBAEAD',
      bankName: 'ADCB',
      department: 'Finance',
    },
    {
      email: 'finance4@wps.local',
      password: 'Finance4@123',
      firstName: 'Priya',
      lastName: 'Sharma',
      role: Role.FINANCE,
      accountNo: 'FIN004',
      iban: 'AE070331234567890123463',
      swift: 'FABEAEAD',
      bankName: 'FAB',
      department: 'Finance',
    },
    {
      email: 'finance5@wps.local',
      password: 'Finance5@123',
      firstName: 'David',
      lastName: 'Chen',
      role: Role.FINANCE,
      accountNo: 'FIN005',
      iban: 'AE070331234567890123464',
      swift: 'BOMLAEADXXX',
      bankName: 'Mashreq',
      department: 'Finance',
    },
    // Bill head — finance supervisor with full unrestricted access
    {
      email: 'billhead@wps.local',
      password: 'BillHead@123',
      firstName: 'William',
      lastName: 'Richardson',
      role: Role.BILL_HEAD,
      accountNo: 'BH001',
      iban: 'AE070331234567890123465',
      swift: 'EBILAEAD',
      bankName: 'Emirates NBD',
      department: 'Finance',
    },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        accountNo: userData.accountNo,
        iban: userData.iban,
        swift: userData.swift,
        bankName: userData.bankName,
        department: userData.department,
      },
    });
    console.log(`Created user: ${userData.email}`);
  }

  // Seed Exchange Rates (AED base: 1 AED = X foreign currency)
  // Rates: how many AED = 1 unit of foreign currency
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rates = [
    { baseCurrency: 'AED', targetCurrency: 'USD', rate: 0.2723 },  // 1 AED = 0.2723 USD
    { baseCurrency: 'USD', targetCurrency: 'AED', rate: 3.6725 },  // 1 USD = 3.6725 AED
    { baseCurrency: 'EUR', targetCurrency: 'AED', rate: 4.31 },    // 1 EUR = 4.31 AED (matches Excel)
    { baseCurrency: 'AED', targetCurrency: 'EUR', rate: 0.2320 },  // 1 AED = 0.2320 EUR
    { baseCurrency: 'TRY', targetCurrency: 'AED', rate: 0.1065 },  // 1 TRY = 0.1065 AED
    { baseCurrency: 'AED', targetCurrency: 'TRY', rate: 9.39 },
    { baseCurrency: 'CNY', targetCurrency: 'AED', rate: 0.5045 },  // 1 CNY = 0.5045 AED
    { baseCurrency: 'AED', targetCurrency: 'CNY', rate: 1.9822 },
  ];

  for (const rate of rates) {
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_targetCurrency_effectiveDate: {
          baseCurrency: rate.baseCurrency,
          targetCurrency: rate.targetCurrency,
          effectiveDate: today,
        },
      },
      update: { rate: rate.rate },
      create: {
        baseCurrency: rate.baseCurrency,
        targetCurrency: rate.targetCurrency,
        rate: rate.rate,
        effectiveDate: today,
      },
    });
  }
  console.log('Exchange rates seeded');

  // Seed a sample claim for demonstration
  const employee = await prisma.user.findUnique({ where: { email: 'employee@wps.local' } });
  if (employee) {
    const existingClaim = await prisma.claim.findFirst({ where: { userId: employee.id } });
    if (!existingClaim) {
      const claim = await prisma.claim.create({
        data: {
          claimNumber: 'WPS-2026-001',
          userId: employee.id,
          eventName: 'Client Visit - Abu Dhabi',
          purpose: 'Sales meeting with key account client',
          department: 'Sales',
          status: 'DRAFT',
          items: {
            create: [
              {
                lineOrder: 1,
                expenseDate: new Date('2026-06-01'),
                categoryCode: 'A',
                categoryName: 'A: Travel Expenses',
                plCostTypeNr: '4412213',
                plCostTypeName: 'Flight costs',
                pillarName: 'WPS',
                description: 'Return flight DXB-AUH',
                country: 'UAE',
                currency: 'AED',
                originalAmount: 450.00,
                exchangeRateUsed: 1,
                aedAmount: 450.00,
                eurAmount: 104.41,
                receiptNumber: 'RCP-001',
              },
              {
                lineOrder: 2,
                expenseDate: new Date('2026-06-01'),
                categoryCode: 'A',
                categoryName: 'A: Travel Expenses',
                plCostTypeNr: '4412217',
                plCostTypeName: 'Hotels',
                pillarName: 'WPS',
                description: 'Hotel stay - 1 night',
                country: 'UAE',
                currency: 'USD',
                originalAmount: 150.00,
                exchangeRateUsed: 3.6725,
                aedAmount: 550.88,
                eurAmount: 127.82,
                receiptNumber: 'RCP-002',
              },
              {
                lineOrder: 3,
                expenseDate: new Date('2026-06-01'),
                categoryCode: 'C',
                categoryName: 'C: Meals & Entertainment - Clients',
                plCostTypeNr: '4412218',
                plCostTypeName: 'FNB Food and beverage',
                pillarName: 'WPS',
                description: 'Client lunch - 4 attendees',
                country: 'UAE',
                currency: 'AED',
                originalAmount: 320.00,
                exchangeRateUsed: 1,
                aedAmount: 320.00,
                eurAmount: 74.25,
                receiptNumber: 'RCP-003',
              },
            ],
          },
        },
      });

      await prisma.claim.update({
        where: { id: claim.id },
        data: {
          totalAed: 1320.88,
          totalEur: 306.48,
        },
      });

      console.log(`Created sample claim: ${claim.claimNumber}`);
    }
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
