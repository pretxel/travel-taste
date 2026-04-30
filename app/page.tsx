import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CodeEntry } from '@/components/auth/code-entry';
import { VIEWER_COOKIE } from '@/lib/constants';
import { verifyViewerJwt } from '@/lib/auth/viewer';

export default async function Home() {
  const c = (await cookies()).get(VIEWER_COOKIE)?.value;
  if (c) {
    try {
      await verifyViewerJwt(c);
      redirect('/feed');
    } catch {
      // fall through to landing
    }
  }
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Decorative postal corner */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 h-40 w-40 text-primary/15"
        viewBox="0 0 100 100"
        fill="none"
      >
        <path d="M0 0 L100 0 L100 100 Z" fill="currentColor" />
        <path
          d="M10 4 L90 4 M10 12 L90 12 M10 20 L90 20"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity="0.6"
        />
      </svg>

      <div className="mx-auto grid min-h-screen w-full max-w-2xl place-items-center px-6 py-16">
        <div className="w-full space-y-10">
          <header className="space-y-4 text-center">
            <p className="label-mono text-muted-foreground">No. 01 · Private Edition</p>
            <h1 className="display text-5xl leading-[0.9] sm:text-6xl">
              Travel
              <span className="display-italic text-primary"> &amp; </span>
              Taste
            </h1>
            <span className="hand-rule mx-auto block" aria-hidden />
            <p className="mx-auto max-w-md text-pretty text-lg leading-snug text-muted-foreground">
              A small letterbox of postcards from the road —{' '}
              <span className="display-italic text-foreground">kept for those who matter.</span>
            </p>
          </header>

          <div className="paper-card relative mx-auto max-w-md rounded-sm p-7 sm:p-8">
            <div className="absolute -top-3 left-6 bg-background px-2">
              <p className="label-mono text-primary">Boarding Pass</p>
            </div>
            <CodeEntry />
            <p className="mt-5 text-center label-mono text-muted-foreground">{today}</p>
          </div>

          <p className="text-center text-sm italic text-muted-foreground">
            If you weren’t given a code, this stop isn’t for you.
          </p>
        </div>
      </div>
    </div>
  );
}
