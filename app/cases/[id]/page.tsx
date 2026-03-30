import { notFound } from 'next/navigation';
import { CaseDetailView } from '@/components/case-detail-view';

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const resolved = await params;
  const caseId = Number(resolved.id);
  if (!Number.isFinite(caseId)) notFound();
  return <CaseDetailView caseId={caseId} />;
}
