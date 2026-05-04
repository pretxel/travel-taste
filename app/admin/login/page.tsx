import Link from 'next/link';
import { OwnerLogin } from '@/components/auth/owner-login';

export default function Page() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="postal-corner relative min-h-screen overflow-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-2xl place-items-center px-6 py-16">
        <div className="w-full space-y-10">
          <header className="space-y-3 text-center">
            <p className="label-mono text-muted-foreground">No. 02 · Service Entrance</p>
            <h1 className="display text-5xl leading-[0.92] sm:text-6xl">
              Postmaster
              <span className="display-italic text-primary">&apos;s</span> door
            </h1>
            <span className="hand-rule mx-auto block" aria-hidden />
            <p className="mx-auto max-w-md text-pretty text-base italic text-muted-foreground">
              Only the keeper of this letterbox passes here.
            </p>
          </header>

          <div className="paper-card relative mx-auto max-w-sm rounded-sm p-7 sm:p-8">
            <div className="absolute -top-3 left-6 bg-background px-2">
              <p className="label-mono text-primary">Sealed entry</p>
            </div>

            <div
              aria-hidden
              className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-primary/50"
            >
              <KeyhookIcon />
            </div>

            <OwnerLogin />

            <p className="mt-6 text-center label-mono text-muted-foreground">{today}</p>
          </div>

          <p className="text-center text-sm italic text-muted-foreground">
            Wandered in by mistake?{' '}
            <Link href="/" className="underline-offset-4 hover:underline">
              Return to the front desk.
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function KeyhookIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className="text-primary"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="11" r="2" fill="currentColor" />
      <path
        d="M16 13 L24 21 M21 18 L23 16 M23 20 L25 18"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
