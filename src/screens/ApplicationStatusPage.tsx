import { AlertTriangle, ArrowRight, Check, Clock3, FileCheck2, Home, LockKeyhole, RotateCcw, Sparkles, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '@/src/components/Brand';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { runtime } from '@/src/config/runtime';
import { getValidSession } from '@/src/services/apiClient';
import { pharmacyService } from '@/src/services/pharmacyService';
import type { ApplicationStatus, PharmacyApplication } from '@/src/types/models';

const milestones = ['Submitted', 'Documents received', 'Admin review', 'Decision'];
const statusCopy: Record<ApplicationStatus, { title: string; description: string }> = {
  DRAFT: { title: 'Finish your pharmacy application', description: 'Your draft is saved and editable. Complete all steps to enter the admin review queue.' },
  PENDING: { title: 'Application received', description: 'Your pharmacy details and documents are queued for an authorized admin review.' },
  UNDER_REVIEW: { title: 'Review in progress', description: 'An administrator is checking the submitted business information and credentials.' },
  NEEDS_CHANGES: { title: 'One item needs correction', description: 'Update the requested item below. The rest of the application stays intact.' },
  APPROVED: { title: 'Your pharmacy is approved', description: 'An authorized administrator approved the application and unlocked the operational workspace.' },
  REJECTED: { title: 'Application not approved', description: 'Review the decision details and contact support if you need clarification.' },
  SUSPENDED: { title: 'Pharmacy access is suspended', description: 'Operational access is unavailable while the account is reviewed.' },
};

function reviewProgress(status: ApplicationStatus) {
  if (status === 'DRAFT') return 0;
  if (status === 'PENDING') return 1;
  if (status === 'UNDER_REVIEW' || status === 'NEEDS_CHANGES') return 2;
  return 4;
}

export function ApplicationStatusPage() {
  const [application, setApplication] = useState<PharmacyApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadApplication = useCallback(async () => {
    setLoading(true);
    try {
      setLoadError('');
      await getValidSession();
      setApplication(await pharmacyService.getApplication());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Application status is unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await getValidSession();
        const nextApplication = await pharmacyService.getApplication();
        if (active) setApplication(nextApplication);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Application status is unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <main className="status-page">
        <header className="status-nav"><Brand /></header>
        <section className="status-loading"><span /><span /><span /></section>
      </main>
    );
  }

  if (!application) {
    const isAuthRequired = loadError.toLowerCase().includes('expired') ||
      loadError.toLowerCase().includes('sign in') ||
      loadError.includes('401') ||
      loadError.includes('UNAUTHORIZED');

    return (
      <main className="status-page">
        <header className="status-nav">
          <Brand />
          <Link to="/" className="back-link"><Home size={16} /> Website</Link>
        </header>
        <section className="status-workspace">
          <header className="status-hero">
            <h1>{isAuthRequired ? 'Sign in to view application status' : 'Application status unavailable'}</h1>
            <p>
              {isAuthRequired
                ? 'Sign in with the account connected to your pharmacy to check verification progress and submitted credentials.'
                : (loadError || 'Sign in to view the pharmacy application linked to your account.')}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <Link className="button" to="/login">Sign in <ArrowRight size={15} /></Link>
              <Link className="button button-secondary" to="/register">Create pharmacy account</Link>
            </div>
          </header>
        </section>
      </main>
    );
  }

  const status = application.status;
  const copy = statusCopy[status];
  const current = reviewProgress(status);
  const correction = application.requestedChanges?.[0] || 'Business Permit image: upload a clearer copy with every corner and the expiry date visible.';

  return (
    <main className={`status-page application-state-${status.toLowerCase()}`}>
      <header className="status-nav">
        <Brand />
        <Link to="/" className="back-link"><Home size={16} /> Website</Link>
      </header>
      <section className="status-workspace">
        <header className="status-hero">
          <div className="status-reference">
            <span>Application reference</span>
            <strong>{application.id || 'Draft (Not submitted)'}</strong>
            {runtime.useMockData && <small>Demo state</small>}
          </div>
          <StatusBadge status={status} />
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
          {status === 'APPROVED' && (
            <div className="approval-seal" aria-hidden="true">
              <Sparkles />
              <Check />
            </div>
          )}
        </header>
        <div className="status-content">
          <section className="timeline-panel" aria-label="Application progress">
            <div className="timeline compact">
              {milestones.map((item, index) => (
                <div key={item} className={index < current ? 'complete' : index === current ? 'active' : ''}>
                  <span>{index < current ? <Check /> : index + 1}</span>
                  <strong>{item}</strong>
                  <small>
                    {index === 0
                      ? (application.submittedAt || (status === 'DRAFT' ? 'Not submitted' : 'Pending'))
                      : index < current
                        ? 'Completed'
                        : index === current
                          ? 'In progress'
                          : 'Waiting'}
                  </small>
                </div>
              ))}
            </div>
          </section>
          <aside className="status-next-step">
            {status === 'DRAFT' && (
              <>
                <Clock3 />
                <div>
                  <strong>Application not submitted</strong>
                  <p>Return to registration to finish the remaining onboarding steps.</p>
                  <Link className="button button-small" to="/register">
                    Continue application <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            )}
            {status === 'PENDING' && (
              <>
                <Clock3 />
                <div>
                  <strong>Next: initial screening</strong>
                  <p>Updates will go to the account email. No action is needed unless an admin requests a correction.</p>
                </div>
              </>
            )}
            {status === 'UNDER_REVIEW' && (
              <>
                <Clock3 />
                <div>
                  <strong>Admin review is active</strong>
                  <p>Credential verification is separate from image quality checks and account authentication.</p>
                </div>
              </>
            )}
            {status === 'NEEDS_CHANGES' && (
              <>
                <AlertTriangle />
                <div>
                  <strong>Correction requested</strong>
                  <p>{correction}</p>
                  <Link className="button button-small" to="/register">
                    Correct requested item <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            )}
            {status === 'APPROVED' && (
              <>
                <FileCheck2 />
                <div>
                  <strong>Verification completed</strong>
                  <p>The operational workspace is now available for this pharmacy account.</p>
                  <Link className="button button-small" to="/app/dashboard">
                    Open Dashboard <ArrowRight size={15} />
                  </Link>
                </div>
              </>
            )}
            {status === 'REJECTED' && (
              <>
                <XCircle />
                <div>
                  <strong>Decision issued</strong>
                  <p>{application.reviewerMessage || 'The submitted credentials could not be validated. Contact support for the review details.'}</p>
                </div>
              </>
            )}
            {status === 'SUSPENDED' && (
              <>
                <LockKeyhole />
                <div>
                  <strong>Workspace locked</strong>
                  <p>Contact support for the account-specific review details.</p>
                </div>
              </>
            )}
          </aside>
        </div>
        <footer className="status-foot">
          <span><LockKeyhole size={16} /> Pharmacy verification is separate from account authentication.</span>
          <button type="button" onClick={() => void loadApplication()}>
            <RotateCcw size={15} /> Refresh status
          </button>
        </footer>
      </section>
    </main>
  );
}
