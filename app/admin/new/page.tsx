import { NewPostForm } from '@/components/admin/new-post-form';

export default function Page() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">New post</h2>
      <NewPostForm />
    </div>
  );
}
