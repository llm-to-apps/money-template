import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { CheckCircle2, CircleDashed, Wallet } from 'lucide-react';
import { TransactionType } from '@prisma/client';

import { getCurrentUser, isManuallyLoggedOut } from './lib/auth';
import { prisma } from './lib/db';
import { broadcastAppEvent } from './lib/events';
import { checkProjectServiceHandshake } from './lib/s2s';
import { RealtimeRefresh } from './ui/realtime-refresh';

export const dynamic = 'force-dynamic';

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

async function addTransaction(formData: FormData) {
  'use server';

  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login');
  }

  const type = String(formData.get('type')) as TransactionType;
  const categoryId = String(formData.get('categoryId'));
  const amount = Number(formData.get('amount'));
  const note = String(formData.get('note') || '').trim();

  if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  await prisma.transaction.create({
    data: {
      type,
      categoryId,
      amountCents: Math.round(amount * 100),
      note: note || null,
      occurredAt: new Date()
    }
  });

  broadcastAppEvent({
    type: 'money.updated',
    payload: { action: 'transaction.created' }
  });
  revalidatePath('/');
}

export default async function Home() {
  const isEmbedded = isFrameRequest(await headers());
  const [user, manuallyLoggedOut] = await Promise.all([
    getCurrentUser(),
    isManuallyLoggedOut()
  ]);

  if (!user) {
    if (manuallyLoggedOut && !isEmbedded) {
      redirect('/auth/signed-out');
    }

    redirect('/auth/login');
  }

  const [categories, transactions, totals, serviceHandshake] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.transaction.findMany({
      include: { category: true },
      orderBy: { occurredAt: 'desc' },
      take: 12
    }),
    prisma.transaction.groupBy({
      by: ['type'],
      _sum: { amountCents: true }
    }),
    checkProjectServiceHandshake()
  ]);
  const income =
    totals.find((item) => item.type === TransactionType.INCOME)?._sum
      .amountCents ?? 0;
  const expenses =
    totals.find((item) => item.type === TransactionType.EXPENSE)?._sum
      .amountCents ?? 0;
  const balance = income - expenses;
  const displayName = user.name;

  return (
    <main className="page">
      <RealtimeRefresh />
      <header className="header">
        <div className="brand">
          <div className="brand-mark">
            <Wallet size={22} />
          </div>
          <div>
            <h1>Money</h1>
            <p>Track income, expenses, and monthly cash flow.</p>
          </div>
        </div>
        <div className="account">
          <div className="account-card">
            <span className="account-name">{displayName}</span>
            <span className={`account-role role-${user.role}`}>{user.role}</span>
          </div>
          {!isEmbedded ? (
            <form action="/api/auth/logout" method="post">
              <button className="ghost-button" type="submit">
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </header>

      <section className="grid">
        <div>
          <div className="cards">
            <div className="card">
              <span>Balance</span>
              <strong className={balance >= 0 ? 'positive' : 'negative'}>
                {formatMoney(balance)}
              </strong>
            </div>
            <div className="card">
              <span>Income</span>
              <strong className="positive">{formatMoney(income)}</strong>
            </div>
            <div className="card">
              <span>Expenses</span>
              <strong className="negative">{formatMoney(expenses)}</strong>
            </div>
          </div>

          <div className="panel">
            <h2>Recent transactions</h2>
            <div className="transactions">
              {transactions.length === 0 ? (
                <div className="empty">No transactions yet.</div>
              ) : (
                transactions.map((transaction) => (
                  <article className="transaction" key={transaction.id}>
                    <div>
                      <h3>{transaction.category.name}</h3>
                      <p>
                        {transaction.note || 'No note'} ·{' '}
                        {transaction.occurredAt.toLocaleDateString('en-US')}
                      </p>
                    </div>
                    <div
                      className={`amount ${
                        transaction.type === TransactionType.INCOME
                          ? 'positive'
                          : 'negative'
                      }`}
                    >
                      {transaction.type === TransactionType.INCOME ? '+' : '-'}
                      {formatMoney(transaction.amountCents)}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>

        <aside className="panel">
          <h2>Add transaction</h2>
          <form className="form" action={addTransaction}>
            <div className="two">
              <div className="field">
                <label htmlFor="type">Type</label>
                <select id="type" name="type" defaultValue={TransactionType.EXPENSE}>
                  <option value={TransactionType.EXPENSE}>Expense</option>
                  <option value={TransactionType.INCOME}>Income</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="amount">Amount</label>
                <input
                  id="amount"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  type="number"
                  placeholder="42.00"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="categoryId">Category</label>
              <select id="categoryId" name="categoryId" required>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="note">Note</label>
              <input id="note" name="note" placeholder="Coffee, invoice, rent" />
            </div>

            <button className="button" type="submit">
              Save transaction
            </button>
          </form>
        </aside>
      </section>
      <footer className="footer">
        <span
          className={`service-status ${
            serviceHandshake.ok ? 'service-status-ok' : 'service-status-muted'
          }`}
          title={
            serviceHandshake.ok
              ? 'Platform available'
              : 'Platform unavailable'
          }
          aria-label={
            serviceHandshake.ok ? 'Platform available' : 'Platform unavailable'
          }
        >
          {serviceHandshake.ok ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
        </span>
      </footer>
    </main>
  );
}

function isFrameRequest(headerStore: Headers) {
  return headerStore.get('sec-fetch-dest') === 'iframe';
}
