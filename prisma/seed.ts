import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    { name: 'Salary', color: '#0f8b6f' },
    { name: 'Groceries', color: '#d97706' },
    { name: 'Rent', color: '#5b5fc7' },
    { name: 'Transport', color: '#0ea5e9' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: category,
      create: category
    });
  }

  const count = await prisma.transaction.count();

  if (count === 0) {
    const salary = await prisma.category.findUniqueOrThrow({
      where: { name: 'Salary' }
    });
    const groceries = await prisma.category.findUniqueOrThrow({
      where: { name: 'Groceries' }
    });
    const rent = await prisma.category.findUniqueOrThrow({
      where: { name: 'Rent' }
    });

    await prisma.transaction.createMany({
      data: [
        {
          type: TransactionType.INCOME,
          amountCents: 420000,
          note: 'Monthly salary',
          occurredAt: new Date(),
          categoryId: salary.id
        },
        {
          type: TransactionType.EXPENSE,
          amountCents: 8750,
          note: 'Weekly groceries',
          occurredAt: new Date(),
          categoryId: groceries.id
        },
        {
          type: TransactionType.EXPENSE,
          amountCents: 135000,
          note: 'Apartment rent',
          occurredAt: new Date(),
          categoryId: rent.id
        }
      ]
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
