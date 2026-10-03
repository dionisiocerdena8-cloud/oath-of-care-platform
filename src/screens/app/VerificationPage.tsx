import { CheckCircle2, Eye, FileKey2, LockKeyhole, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { useToast } from '@/src/components/ui/Toast';
import { verificationService } from '@/src/services/verificationService';
import type { VerificationDocument } from '@/src/types/models';

export function VerificationPage() {
  const [documents, setDocuments] = useState<VerificationDocument[] | null>(null);
  const { showToast } = useToast();
  useEffect(() => { verificationService.listDocuments().then(setDocuments); }, []);
  return (
    <><header className="page-header"><div><span className="eyebrow">Private compliance records</span><h1>Verification</h1><p>Review document status and respond to administrator requests.</p></div><div className="verification-summary"><ShieldCheck /><span><strong>Verification active</strong><small>2 documents require review</small></span></div></header>
      <div className="privacy-banner"><LockKeyhole /><div><strong>Sensitive documents stay private</strong><p>Production files must use private Supabase Storage buckets, ownership policies, and time-limited signed URLs.</p></div></div>
      <section className="panel verification-panel"><div className="panel-heading"><div><span className="eyebrow">Submitted records</span><h2>Verification documents</h2></div></div>{documents === null ? <div className="table-loading">Loading verification documents…</div> : documents.length === 0 ? <EmptyState icon={FileKey2} title="No documents uploaded" description="Verification documents will appear here after onboarding." /> : <div className="document-cards">{documents.map((doc) => <article key={doc.id}><div className="document-card-head"><span className="doc-large-icon"><FileKey2 /></span><div><strong>{doc.label}</strong><p>{doc.fileName}</p></div><StatusBadge status={doc.status} /></div><dl><div><dt>Uploaded</dt><dd>{doc.uploadedAt}</dd></div><div><dt>Access</dt><dd><LockKeyhole size={13} /> Private</dd></div></dl>{doc.adminMessage && <div className="admin-message"><strong>Reviewer note</strong><p>{doc.adminMessage}</p></div>}<div className="document-card-actions"><button onClick={() => showToast('Secure preview requires the private storage integration.', 'info')}><Eye /> Preview</button><button onClick={() => showToast('Choose a replacement file during backend integration.', 'info')}><RefreshCw /> Replace</button></div></article>)}</div>}</section>
      <section className="panel verification-history"><div className="panel-heading"><div><span className="eyebrow">Review activity</span><h2>Verification history</h2></div></div><div className="history-row"><span><CheckCircle2 /></span><div><strong>FDA License verified</strong><p>Reviewed by the verification team</p></div><time>Aug 20, 2026</time></div><div className="history-row"><span><UploadCloud /></span><div><strong>PRC ID replacement uploaded</strong><p>Awaiting administrator review</p></div><time>Oct 1, 2026</time></div></section>
    </>
  );
}


