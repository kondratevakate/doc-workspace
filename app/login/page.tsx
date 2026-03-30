import { AuthPage } from '@/components/auth-page';

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const resolved = await searchParams;
  return <AuthPage nextPath={resolved.next || '/today'} />;
}
