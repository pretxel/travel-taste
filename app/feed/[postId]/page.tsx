import { notFound } from 'next/navigation';
import { supabaseServiceRole } from '@/lib/supabase/server';
import { POSTS_BUCKET, SIGNED_URL_TTL_SEC } from '@/lib/constants';
import { PostDetail } from '@/components/feed/post-detail';

export default async function Page({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const sb = supabaseServiceRole();
  const { data, error } = await sb
    .from('posts')
    .select('id, storage_path, caption, width, height, taken_at, created_at')
    .eq('id', postId)
    .single();
  if (error || !data) notFound();

  const { data: s } = await sb.storage
    .from(POSTS_BUCKET)
    .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SEC);

  return (
    <PostDetail
      url={s?.signedUrl ?? ''}
      caption={data.caption}
      width={data.width ?? 0}
      height={data.height ?? 0}
      takenAt={data.taken_at}
      createdAt={data.created_at}
    />
  );
}
