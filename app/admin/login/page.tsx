import { OwnerLogin } from '@/components/auth/owner-login';

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Owner sign in</h1>
        </div>
        <OwnerLogin />
      </div>
    </div>
  );
}
