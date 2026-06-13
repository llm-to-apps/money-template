'use client';

import { FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import { CheckCircle2, CircleDashed, Wallet } from 'lucide-react';

type TransactionType = 'INCOME' | 'EXPENSE';

export type MoneySnapshot = {
  categories: Array<{
    color: string;
    createdAt: Date | string;
    id: string;
    name: string;
    updatedAt: Date | string;
  }>;
  summary: {
    balanceCents: number;
    expensesCents: number;
    incomeCents: number;
  };
  transactions: Array<{
    amountCents: number;
    category: {
      color: string;
      createdAt: Date | string;
      id: string;
      name: string;
      updatedAt: Date | string;
    };
    categoryId: string;
    createdAt: Date | string;
    id: string;
    note: string | null;
    occurredAt: Date | string;
    type: TransactionType;
    updatedAt: Date | string;
  }>;
};

type MoneyDashboardProps = {
  displayName: string | null;
  initialServiceAvailable: boolean;
  initialSnapshot: MoneySnapshot;
  isEmbedded: boolean;
  role: string;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function formatDate(value: Date | string) {
  return new Date(value).toLocaleDateString('en-US');
}

export function MoneyDashboard({
  displayName,
  initialServiceAvailable,
  initialSnapshot,
  isEmbedded,
  role
}: MoneyDashboardProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaultCategoryId = snapshot.categories[0]?.id ?? '';

  useEffect(() => {
    const events = new EventSource('/api/events');

    events.addEventListener('money.updated', () => {
      void loadSnapshot();
    });

    return () => {
      events.close();
    };
  }, []);

  const categoryById = useMemo(
    () => new Map(snapshot.categories.map((category) => [category.id, category])),
    [snapshot.categories]
  );

  async function loadSnapshot() {
    const response = await fetch('/api/transactions', {
      cache: 'no-store'
    });

    if (!response.ok) {
      return;
    }

    const nextSnapshot = (await response.json()) as MoneySnapshot;
    startTransition(() => {
      setSnapshot(nextSnapshot);
    });
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const type = String(formData.get('type')) as TransactionType;
    const categoryId = String(formData.get('categoryId') ?? '');
    const amount = Number(formData.get('amount'));
    const note = String(formData.get('note') || '').trim();
    const category = categoryById.get(categoryId);

    if (!category || !Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid transaction.');
      return;
    }

    const now = new Date().toISOString();
    const optimisticAmountCents = Math.round(amount * 100);
    const optimisticTransaction = {
      amountCents: optimisticAmountCents,
      category,
      categoryId,
      createdAt: now,
      id: `optimistic-${crypto.randomUUID()}`,
      note: note || null,
      occurredAt: now,
      type,
      updatedAt: now
    };

    startTransition(() => {
      setSnapshot((current) => ({
        ...current,
        summary: {
          balanceCents:
            current.summary.balanceCents +
            (type === 'INCOME' ? optimisticAmountCents : -optimisticAmountCents),
          expensesCents:
            current.summary.expensesCents +
            (type === 'EXPENSE' ? optimisticAmountCents : 0),
          incomeCents:
            current.summary.incomeCents +
            (type === 'INCOME' ? optimisticAmountCents : 0)
        },
        transactions: [optimisticTransaction, ...current.transactions].slice(0, 12)
      }));
    });
    form.reset();

    setIsSaving(true);
    try {
      const response = await fetch('/api/transactions', {
        body: JSON.stringify({
          amount,
          categoryId,
          note,
          type
        }),
        headers: {
          'content-type': 'application/json'
        },
        method: 'POST'
      });

      if (!response.ok) {
        setError('Could not save transaction.');
        await loadSnapshot();
        return;
      }

      const nextSnapshot = (await response.json()) as MoneySnapshot;
      startTransition(() => {
        setSnapshot(nextSnapshot);
      });
    } catch {
      setError('Could not save transaction.');
      await loadSnapshot();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="page">
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
            <span className={`account-role role-${role}`}>{role}</span>
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
              <strong
                className={
                  snapshot.summary.balanceCents >= 0 ? 'positive' : 'negative'
                }
              >
                {formatMoney(snapshot.summary.balanceCents)}
              </strong>
            </div>
            <div className="card">
              <span>Income</span>
              <strong className="positive">
                {formatMoney(snapshot.summary.incomeCents)}
              </strong>
            </div>
            <div className="card">
              <span>Expenses</span>
              <strong className="negative">
                {formatMoney(snapshot.summary.expensesCents)}
              </strong>
            </div>
          </div>

          <div className="panel">
            <h2>Recent transactions</h2>
            <div className="transactions">
              {snapshot.transactions.length === 0 ? (
                <div className="empty">No transactions yet.</div>
              ) : (
                snapshot.transactions.map((transaction) => (
                  <article className="transaction" key={transaction.id}>
                    <div>
                      <h3>{transaction.category.name}</h3>
                      <p>
                        {transaction.note || 'No note'} ·{' '}
                        {formatDate(transaction.occurredAt)}
                      </p>
                    </div>
                    <div
                      className={`amount ${
                        transaction.type === 'INCOME' ? 'positive' : 'negative'
                      }`}
                    >
                      {transaction.type === 'INCOME' ? '+' : '-'}
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
          <form
            action="/api/transactions"
            className="form"
            method="post"
            onSubmit={addTransaction}
          >
            <div className="two">
              <div className="field">
                <label htmlFor="type">Type</label>
                <select id="type" name="type" defaultValue="EXPENSE">
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
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
              <select
                id="categoryId"
                name="categoryId"
                required
                defaultValue={defaultCategoryId}
              >
                {snapshot.categories.map((category) => (
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

            {error ? <p className="form-error">{error}</p> : null}

            <button className="button" disabled={isPending || isSaving} type="submit">
              Save transaction
            </button>
          </form>
        </aside>
      </section>
      <footer className="footer">
        <span
          className={`service-status ${
            initialServiceAvailable ? 'service-status-ok' : 'service-status-muted'
          }`}
          title={
            initialServiceAvailable
              ? 'Platform available'
              : 'Platform unavailable'
          }
          aria-label={
            initialServiceAvailable ? 'Platform available' : 'Platform unavailable'
          }
        >
          {initialServiceAvailable ? (
            <CheckCircle2 size={16} />
          ) : (
            <CircleDashed size={16} />
          )}
        </span>
      </footer>
    </main>
  );
}
