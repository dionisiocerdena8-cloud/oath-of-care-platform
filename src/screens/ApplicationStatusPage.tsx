import { AlertTriangle, ArrowRight, Check, Clock3, FileCheck2, Home, LockKeyhole, RotateCcw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { mockApplication } from '@/src/data/mockData';
import { runtime } from '@/src/config/runtime';
import type { ApplicationStatus } from '@/src/types/models';

const milestones = ['Application submitted', 'Documents received', 'Admin review', 'Approval'];
const statusCopy: Record<ApplicationStatus, { title: string; description: string }> = {
  DRAFT: { title: 'Complete your pharmacy application', description: 'Your progress is saved. Finish the remaining steps when you’re ready.' },
  PENDING: { title: 'Application submitted', description: 'Your details and documents are safely queued for review.' },
  UNDER_REVIEW: { title: 'Your pharmacy is under review', description: 'A reviewer is checking your store information and verification documents.' },
  NEEDS_CHANGES: { title: 'A document needs your attention', description: 'Update only the requested item and resubmit—there is no need to restart.' },
  APPROVED: { title: 'Your pharmacy is approved', description: 'Your operational pharmacy workspace is now available.' },
  REJECTED: { title: 'Application not approved', description: 'Review the decision and contact support if you need clarification.' },
  SUSPENDED: { title: 'Pharmacy access is suspended', description: 'Operational access is temporarily unavailable while the account is reviewed.' },
};

export function ApplicationStatusPage() {
  const status = (runtime.useMockData ? runtime.demoApplicationStatus : mockApplication.status) as ApplicationStatus;
  const copy = statusCopy[status];
  const reviewStep = status === 'PENDING' ? 1 : status === 'UNDER_REVIEW' || status === 'NEEDS_CHANGES' ? 2 : status === 'APPROVED' ? 4 : 2;
  return (
    <main className="status-page">
      <header className="status-nav"><Brand /><Link to="/" className="back-link"><Home size={16} /> Website</Link></header>
      <section className="status-card">
        <div className="status-card-head">
          <div><span className="eyebrow">Application {mockApplication.id}</span><h1>{copy.title}</h1><p>{copy.description}</p></div><StatusBadge status={status} />
        </div>
        <div className="timeline">{milestones.map((item, index) => <div key={item} className={index < reviewStep ? 'complete' : index === reviewStep ? 'active' : ''}><span>{index < reviewStep ? <Check /> : index + 1}</span><strong>{item}</strong><small>{index === 0 ? mockApplication.submittedAt : index < reviewStep ? 'Completed' : index === reviewStep ? 'In progress' : 'Waiting'}</small></div>)}</div>
        {status === 'UNDER_REVIEW' && <div className="status-message info"><Clock3 /><div><strong>Typical review: 2“3 business days</strong><p>We’ll notify the account email as soon as the status changes. Dashboard access remains locked during review.</p></div></div>}
        {status === 'NEEDS_CHANGES' && <div className="status-message warning"><AlertTriangle /><div><strong>Business Permit image is unreadable</strong><p>Please upload a clearer copy showing all corners and the expiration date.</p><Link className="button button-small" to="/register">Replace document <ArrowRight size={15} /></Link></div></div>}
        {status === 'APPROVED' && <div className="status-message success"><FileCheck2 /><div><strong>Verification completed</strong><p>Your pharmacy workspace is unlocked.</p><Link className="button button-small" to="/app/dashboard">Open dashboard <ArrowRight size={15} /></Link></div></div>}
        {status === 'REJECTED' && <div className="status-message danger"><XCircle /><div><strong>Decision issued</strong><p>The submitted license could not be validated. Contact support for next steps.</p></div></div>}
        <div className="status-foot"><span><LockKeyhole size={16} /> Pharmacy verification is separate from account authentication.</span><button onClick={() => window.location.reload()}><RotateCcw size={15} /> Refresh status</button></div>
      </section>
    </main>
  );
}

