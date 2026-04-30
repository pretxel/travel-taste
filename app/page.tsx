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
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Travel Taste</h1>
          <p className="text-sm text-muted-foreground">Enter the code you were given.</p>
        </div>
        <CodeEntry />
      </div>
    </div>
  );
}
