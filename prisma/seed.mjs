import {
  CategoryScope,
  PrismaClient,
  RecordStatus,
  TransactionType
} from '@prisma/client';

const prisma = new PrismaClient();

const wallets = [
  {
    name: 'BD card',
    comment: 'Daily spending card',
    color: '#059669',
    currency: 'USD',
    initialBalanceCents: 120000
  },
  {
    name: 'Cash',
    comment: 'Pocket cash',
    color: '#2563eb',
    currency: 'USD',
    initialBalanceCents: 25000
  },
  {
    name: 'Savings',
    comment: 'Emergency fund',
    color: '#7c3aed',
    currency: 'USD',
    initialBalanceCents: 850000
  }
];

const categoryPaths = [
  ['Salary', { color: '#059669', scope: CategoryScope.INCOME }],
  ['Freelance', { color: '#14b8a6', scope: CategoryScope.INCOME }],
  ['Home / Rent', { color: '#5b5fc7', scope: CategoryScope.EXPENSE }],
  ['Home / Groceries', { color: '#d97706', scope: CategoryScope.EXPENSE }],
  ['Home / Utilities', { color: '#0891b2', scope: CategoryScope.EXPENSE }],
  ['Car / Fuel', { color: '#0ea5e9', scope: CategoryScope.EXPENSE }],
  ['Car / Repair', { color: '#b91c1c', scope: CategoryScope.EXPENSE }],
  ['Food / Coffee', { color: '#9333ea', scope: CategoryScope.EXPENSE }],
  ['Food / Restaurants', { color: '#db2777', scope: CategoryScope.EXPENSE }],
  ['Health / Pharmacy', { color: '#dc2626', scope: CategoryScope.EXPENSE }],
  ['Leisure / Streaming', { color: '#4f46e5', scope: CategoryScope.EXPENSE }],
  ['Leisure / Travel', { color: '#ea580c', scope: CategoryScope.EXPENSE }]
];

async function upsertCategoryPath(path, data = {}) {
  const parts = path
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  let parentId = null;
  let category = null;

  for (const [index, name] of parts.entries()) {
    const existing = await prisma.category.findFirst({
      where: { name, parentId }
    });
    const isLeaf = index === parts.length - 1;

    category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            color: isLeaf ? data.color ?? existing.color : existing.color,
            scope: isLeaf ? data.scope ?? existing.scope : CategoryScope.BOTH,
            status: RecordStatus.ACTIVE
          }
        })
      : await prisma.category.create({
          data: {
            name,
            parentId,
            color: isLeaf ? data.color ?? '#059669' : '#64748b',
            scope: isLeaf ? data.scope ?? CategoryScope.BOTH : CategoryScope.BOTH
          }
        });
    parentId = category.id;
  }

  return category;
}

function monthDate(monthOffset, day) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthOffset, day, 12);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function cents(amount) {
  return Math.round(amount * 100);
}

function monthlyAmount(base, monthOffset, variance = 0) {
  const wave = [0, 1, -1, 2, -2, 1][monthOffset % 6] ?? 0;
  return cents(base + wave * variance);
}

async function main() {
  const walletByName = new Map();
  const categoryByPath = new Map();
  const legacyWallet = await prisma.wallet.findUnique({
    where: { id: 'local-default-wallet' }
  });
  const bdCardSeed = wallets[0];

  if (legacyWallet && legacyWallet.name !== bdCardSeed.name) {
    const existingBdCard = await prisma.wallet.findUnique({
      where: { name: bdCardSeed.name }
    });

    if (!existingBdCard) {
      await prisma.wallet.update({
        where: { id: legacyWallet.id },
        data: {
          name: bdCardSeed.name,
          comment: bdCardSeed.comment,
          color: bdCardSeed.color,
          currency: bdCardSeed.currency,
          initialBalanceCents: bdCardSeed.initialBalanceCents,
          status: RecordStatus.ACTIVE
        }
      });
    }
  }

  for (const wallet of wallets) {
    const savedWallet = await prisma.wallet.upsert({
      where: { name: wallet.name },
      update: {
        comment: wallet.comment,
        color: wallet.color,
        currency: wallet.currency,
        initialBalanceCents: wallet.initialBalanceCents,
        status: RecordStatus.ACTIVE
      },
      create: wallet
    });
    walletByName.set(wallet.name, savedWallet);
  }

  for (const [path, data] of categoryPaths) {
    categoryByPath.set(path, await upsertCategoryPath(path, data));
  }

  const count = await prisma.transaction.count();

  if (count > 0) {
    return;
  }

  const bdCard = walletByName.get('BD card');
  const cash = walletByName.get('Cash');
  const savings = walletByName.get('Savings');
  const transactions = [];

  for (let monthOffset = 5; monthOffset >= 0; monthOffset -= 1) {
    const salaryDate = monthDate(monthOffset, 2);
    const isCurrentMonth = monthOffset === 0;

    transactions.push(
      {
        type: TransactionType.INCOME,
        amountCents: monthlyAmount(4200, monthOffset, 120),
        note: 'Monthly salary',
        occurredAt: salaryDate,
        categoryId: categoryByPath.get('Salary').id,
        walletId: bdCard.id
      },
      {
        type: TransactionType.EXPENSE,
        amountCents: monthlyAmount(1350, monthOffset, 35),
        note: 'Apartment rent',
        occurredAt: monthDate(monthOffset, 1),
        categoryId: categoryByPath.get('Home / Rent').id,
        walletId: bdCard.id
      },
      {
        type: TransactionType.EXPENSE,
        amountCents: monthlyAmount(145, monthOffset, 12),
        note: 'Electricity, water, internet',
        occurredAt: monthDate(monthOffset, 6),
        categoryId: categoryByPath.get('Home / Utilities').id,
        walletId: bdCard.id
      },
      {
        type: TransactionType.EXPENSE,
        amountCents: monthlyAmount(82, monthOffset, 9),
        note: 'Gas station',
        occurredAt: monthDate(monthOffset, 8),
        categoryId: categoryByPath.get('Car / Fuel').id,
        walletId: bdCard.id
      },
      {
        type: TransactionType.EXPENSE,
        amountCents: cents(15.99),
        note: 'Streaming subscriptions',
        occurredAt: monthDate(monthOffset, 12),
        categoryId: categoryByPath.get('Leisure / Streaming').id,
        walletId: bdCard.id
      }
    );

    for (const [index, day] of [5, 12, 19, 26].entries()) {
      if (isCurrentMonth && day > new Date().getDate()) {
        continue;
      }

      transactions.push({
        type: TransactionType.EXPENSE,
        amountCents: cents(72 + ((monthOffset + index) % 4) * 8),
        note: 'Weekly groceries',
        occurredAt: monthDate(monthOffset, day),
        categoryId: categoryByPath.get('Home / Groceries').id,
        walletId: bdCard.id
      });
    }

    for (const [index, day] of [7, 14, 21].entries()) {
      if (isCurrentMonth && day > new Date().getDate()) {
        continue;
      }

      transactions.push({
        type: TransactionType.EXPENSE,
        amountCents: cents(4.5 + ((monthOffset + index) % 3) * 1.25),
        note: 'Coffee',
        occurredAt: monthDate(monthOffset, day),
        categoryId: categoryByPath.get('Food / Coffee').id,
        walletId: cash.id
      });
    }

    if (monthOffset % 2 === 0) {
      transactions.push({
        type: TransactionType.INCOME,
        amountCents: monthlyAmount(650, monthOffset, 80),
        note: 'Freelance project',
        occurredAt: monthDate(monthOffset, 16),
        categoryId: categoryByPath.get('Freelance').id,
        walletId: bdCard.id
      });
    }

    if (monthOffset === 4 || monthOffset === 1) {
      transactions.push({
        type: TransactionType.EXPENSE,
        amountCents: monthOffset === 4 ? cents(340) : cents(180),
        note: monthOffset === 4 ? 'Brake service' : 'Oil service',
        occurredAt: monthDate(monthOffset, 18),
        categoryId: categoryByPath.get('Car / Repair').id,
        walletId: bdCard.id
      });
    }

    if (monthOffset === 3) {
      transactions.push({
        type: TransactionType.EXPENSE,
        amountCents: cents(720),
        note: 'Weekend trip',
        occurredAt: monthDate(monthOffset, 22),
        categoryId: categoryByPath.get('Leisure / Travel').id,
        walletId: bdCard.id
      });
    }

    if (monthOffset === 2 || monthOffset === 0) {
      transactions.push({
        type: TransactionType.EXPENSE,
        amountCents: monthOffset === 2 ? cents(96) : cents(42),
        note: monthOffset === 2 ? 'Dinner with friends' : 'Lunch meeting',
        occurredAt: monthDate(monthOffset, 20),
        categoryId: categoryByPath.get('Food / Restaurants').id,
        walletId: bdCard.id
      });
    }

    if (monthOffset === 1) {
      transactions.push({
        type: TransactionType.EXPENSE,
        amountCents: cents(38),
        note: 'Pharmacy',
        occurredAt: monthDate(monthOffset, 24),
        categoryId: categoryByPath.get('Health / Pharmacy').id,
        walletId: cash.id
      });
    }

    if (monthOffset % 2 === 1) {
      transactions.push({
        type: TransactionType.INCOME,
        amountCents: monthlyAmount(120, monthOffset, 25),
        note: 'Savings interest',
        occurredAt: addDays(salaryDate, 1),
        categoryId: categoryByPath.get('Freelance').id,
        walletId: savings.id
      });
    }
  }

  const now = new Date();
  await prisma.transaction.createMany({
    data: transactions.filter((transaction) => transaction.occurredAt <= now)
  });
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
