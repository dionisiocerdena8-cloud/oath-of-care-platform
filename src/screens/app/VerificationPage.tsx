import { Eye, FileKey2, LockKeyhole, RefreshCw, ShieldCheck, UploadCloud } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { useToast } from '@/src/components/ui/Toast';
import { verificationService } from '@/src/services/verificationService';
import type { VerificationDocument } from '@/src/types/models';

export function VerificationPage() {
  const [documents, setDocuments] = useState<VerificationDocument[] | null>(null);
  const [uploadType, setUploadType] = useState<VerificationDocument['type']>('FDA_LICENSE');
  const { showToast } = useToast();
  useEffect(() => { verificationService.listDocuments().then(setDocuments); }, []);
  const pending = documents?.filter((item) => item.status !== 'VERIFIED').length;
  const upload = async (type: VerificationDocument['type'], file?: File) => {
    if (!file) return;
    try { await verificationService.upload(type, file); setDocuments(await verificationService.listDocuments()); showToast('Document uploaded for review.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Document upload failed.', 'error'); }
  };
  const preview = async (id: string) => {
    try { const result = await verificationService.preview(id); window.open(result.url, '_blank', 'noopener,noreferrer'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Secure preview failed.', 'error'); }
  };

  return (
    <>
      <header className="page-header">
        <div><span className="eyebrow">Private compliance records</span><h1>Verification</h1><p>Review document status and respond to administrator requests.</p></div>
        <div className="header-actions">
          <span className="verification-state"><ShieldCheck size={17} /> {pending === undefined ? 'Checking records' : pending ? `${pending} need attention` : 'Records current'}</span>
          <select aria-label="Document type" value={uploadType} onChange={(event) => setUploadType(event.target.value as VerificationDocument['type'])}><option value="FDA_LICENSE">FDA License</option><option value="BUSINESS_PERMIT">Business Permit</option><option value="PHARMACIST_PRC_ID">Pharmacist PRC ID</option></select>
          <label className="button"><UploadCloud size={17} /> Upload document<input hidden type="file" accept=".pdf,image/png,image/jpeg" onChange={(event) => void upload(uploadType, event.target.files?.[0])} /></label>
        </div>
      </header>

      <div className="privacy-banner"><LockKeyhole /><div><strong>Sensitive documents stay private</strong><p>Production files require private storage, ownership policies, and time-limited signed links.</p></div></div>

      <section className="panel verification-panel">
        <div className="panel-heading"><div><span className="eyebrow">Submitted records</span><h2>Verification documents</h2></div></div>
        {documents === null ? <div className="table-loading">Loading verification documents…</div> : documents.length === 0 ? (
          <EmptyState icon={FileKey2} title="No documents uploaded" description="Verification documents will appear here after onboarding." />
        ) : (
          <div className="document-list" role="list">
            <div className="document-list-head" aria-hidden="true"><span>Document</span><span>Status</span><span>Uploaded</span><span>Expiry</span><span>Actions</span></div>
            {documents.map((doc) => (
              <article key={doc.id} className="document-row" role="listitem">
                <div className="document-identity"><span className="doc-large-icon"><FileKey2 /></span><span><strong>{doc.label}</strong><small>{doc.fileName}</small></span></div>
                <StatusBadge status={doc.status} />
                <span className="document-date"><small>Uploaded</small>{doc.uploadedAt}</span>
                <span className="document-date"><small>Expiry</small>{doc.expiresAt || 'Not provided'}</span>
                <div className="document-row-actions">
                  <button onClick={() => void preview(doc.id)}><Eye /> Preview</button>
                  <label className="inline-link"><RefreshCw /> {doc.status === 'NEEDS_UPDATE' ? 'Resubmit' : 'Replace'}<input hidden type="file" accept=".pdf,image/png,image/jpeg" onChange={(event) => void upload(doc.type, event.target.files?.[0])} /></label>
                </div>
                {doc.adminMessage && <div className="document-review-note"><strong>Reviewer note</strong><p>{doc.adminMessage}</p></div>}
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
