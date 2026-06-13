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

type MoneyDashboardPayload = MoneySnapshot & {
  serviceAvailable: boolean;
  user: {
    displayName: string | null;
    role: string;
  };
};

type AuthErrorPayload = {
  redirectTo?: string;
};

type MoneyUser = {
  displayName: string | null;
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

export function MoneyDashboard() {
  const [snapshot, setSnapshot] = useState<MoneySnapshot | null>(null);
  const [user, setUser] = useState<MoneyUser | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const [isEmbedded, setIsEmbedded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const defaultCategoryId = snapshot?.categories[0]?.id ?? '';

  useEffect(() => {
    setIsEmbedded(window.parent !== window);
    void loadSnapshot({ showLoading: true });

    const events = new EventSource('/api/events');

    events.addEventListener('money.updated', () => {
      void loadSnapshot();
    });

    return () => {
      events.close();
    };
  }, []);

  const categoryById = useMemo(
    () =>
      new Map(
        (snapshot?.categories ?? []).map((category) => [category.id, category])
      ),
    [snapshot?.categories]
  );

  async function loadSnapshot(options: { showLoading?: boolean } = {}) {
    if (options.showLoading) {
      setIsLoading(true);
    }

    try {
      const response = await fetch('/api/transactions', {
        cache: 'no-store'
      });

      if (response.status === 401) {
        const payload = (await response.json().catch(() => null)) as
          | AuthErrorPayload
          | null;
        window.location.replace(payload?.redirectTo ?? '/auth/login');
        return;
      }

      if (!response.ok) {
        setError('Could not load transactions.');
        return;
      }

      const nextSnapshot = (await response.json()) as MoneyDashboardPayload;
      startTransition(() => {
        setSnapshot({
          categories: nextSnapshot.categories,
          summary: nextSnapshot.summary,
          transactions: nextSnapshot.transactions
        });
        setServiceAvailable(nextSnapshot.serviceAvailable);
        setUser(nextSnapshot.user);
      });
    } catch {
      setError('Could not load transactions.');
    } finally {
      if (options.showLoading) {
        setIsLoading(false);
      }
    }
  }

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setError(null);

    if (!snapshot) {
      setError('Transactions are still loading.');
      return;
    }

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
      setSnapshot((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          summary: {
            balanceCents:
              current.summary.balanceCents +
              (type === 'INCOME'
                ? optimisticAmountCents
                : -optimisticAmountCents),
            expensesCents:
              current.summary.expensesCents +
              (type === 'EXPENSE' ? optimisticAmountCents : 0),
            incomeCents:
              current.summary.incomeCents +
              (type === 'INCOME' ? optimisticAmountCents : 0)
          },
          transactions: [optimisticTransaction, ...current.transactions].slice(
            0,
            12
          )
        };
      });
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

  if (isLoading) {
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
        </header>
        <section className="loading-panel">Loading money dashboard...</section>
      </main>
    );
  }

  if (!snapshot || !user) {
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
        </header>
        <section className="loading-panel">
          {error ?? 'Could not load money dashboard.'}
        </section>
      </main>
    );
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
            <span className="account-name">{user.displayName}</span>
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
            serviceAvailable ? 'service-status-ok' : 'service-status-muted'
          }`}
          title={
            serviceAvailable
              ? 'Platform available'
              : 'Platform unavailable'
          }
          aria-label={
            serviceAvailable ? 'Platform available' : 'Platform unavailable'
          }
        >
          {serviceAvailable ? (
            <CheckCircle2 size={16} />
          ) : (
            <CircleDashed size={16} />
          )}
        </span>
      </footer>
    </main>
  );
}
