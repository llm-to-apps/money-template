import Image from 'next/image';
import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function SignedOutPage() {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="brand-mark">
          <Wallet size={22} />
        </div>
        <h1>You are signed out of Money</h1>
        <p>Continue with your OS7 account to return to Money.</p>
        <Link
          className="button auth-button"
          href="/api/auth/login?interactive=1"
          aria-label="Continue with OS7"
        >
          <Image
            className="auth-button-logo"
            src="/brand/os7-logo.svg"
            alt="OS7"
            width={62}
            height={32}
            priority
          />
        </Link>
      </section>
    </main>
  );
}
