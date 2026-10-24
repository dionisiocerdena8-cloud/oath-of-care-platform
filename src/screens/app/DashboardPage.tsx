import {
  AlertTriangle, ArrowRight, BarChart3, Boxes, CheckCircle2, Clock3,
  FileWarning, PackageCheck, PackagePlus, RefreshCw, Search, ShieldCheck, Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { StockStatus } from '@/src/components/ui/StockStatus';
import { analyticsService, inventoryService } from '@/src/services';
import { pharmacyService } from '@/src/services/pharmacyService';
import { verificationService } from '@/src/services/verificationService';
import type { AnalyticsDataset, Medicine, PharmacyIdentity, StockLevel, VerificationDocument } from '@/src/types/models';

const statusMeta: { status: StockLevel; label: string; className: string }[] = [
  { status: 'HIGH_STOCK', label: 'High stock', className: 'high' },
  { status: 'MEDIUM_STOCK', label: 'Medium stock', className: 'medium' },
  { status: 'LOW_STOCK', label: 'Low stock', className: 'low' },
  { status: 'OUT_OF_STOCK', label: 'Out of stock', className: 'out' },
];

export function DashboardPage() {
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsDataset | null>(null);
  const [documents, setDocuments] = useState<VerificationDocument[] | null>(null);
  const [identity, setIdentity] = useState<PharmacyIdentity | null>(null);
  const [now] = useState(() => Date.now());
  const navigate = useNavigate();

  useEffect(() => {
    inventoryService.list().then(setMedicines);
    analyticsService.getSummary().then(setAnalytics);
    verificationService.listDocuments().then(setDocuments);
    pharmacyService.getIdentity().then(setIdentity);
  }, []);

  const today = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(now));
  const counts = useMemo(() => Object.fromEntries(statusMeta.map(({ status }) => [status, (medicines ?? []).filter((item) => item.stockStatus === status).length])) as Record<StockLevel, number>, [medicines]);
  const total = medicines?.length ?? 0;
  const stale = useMemo(() => (medicines ?? []).filter((item) => now - new Date(item.lastUpdated).getTime() > 7 * 24 * 60 * 60 * 1000), [medicines, now]);
  const needsDocuments = (documents ?? []).filter((item) => item.status === 'NEEDS_UPDATE');
  const chartPoints = analytics?.points.slice(-12) ?? [];
  const chartMax = Math.max(...chartPoints.map((point) => point.searchAppearances), 1);

  return (
    <>
      <header className="page-header dashboard-heading">
        <div><span className="eyebrow">{today}</span><h1>Your pharmacy, at a glance.</h1><p>Prioritize availability updates, compliance work, and patient discovery.</p></div>
        <button className="button" onClick={() => navigate('/app/inventory?add=true')}><PackagePlus size={18} /> Add medicine</button>
      </header>

      <section className="dashboard-command" aria-label="Pharmacy overview">
        <div className="command-copy">
          <span className="verified-kicker"><ShieldCheck size={15} /> Verified pharmacy workspace</span>
          <h2>Good morning{identity?.pharmacyName ? `, ${identity.pharmacyName}` : ''}.</h2>
          <p>Keep today’s medicine signals accurate before patients start searching nearby.</p>
          <div className="command-actions"><Link className="button" to="/app/inventory">Manage medicines <ArrowRight size={17} /></Link><Link to="/app/profile">View public profile</Link></div>
        </div>
        <div className="command-metrics">
          <article><Search /><span><strong>{analytics?.summary.searchAppearances.toLocaleString() ?? '—'}</strong>Search appearances</span></article>
          <article><BarChart3 /><span><strong>{analytics?.summary.profileViews.toLocaleString() ?? '—'}</strong>Profile views</span></article>
          <article><CheckCircle2 /><span><strong>{analytics?.summary.patientConfirmations.toLocaleString() ?? '—'}</strong>Confirmations</span></article>
        </div>
      </section>

      <section className="availability-overview panel">
        <div className="availability-heading"><div><span className="eyebrow">Live inventory signal</span><h2>Medicine availability</h2></div><div className="availability-total"><strong>{medicines ? total : '—'}</strong><span>listed medicines</span></div></div>
        <div className="availability-track" aria-label="Availability distribution">
          {statusMeta.map(({ status, className }) => counts[status] > 0 && <span key={status} className={className} style={{ width: `${counts[status] / Math.max(total, 1) * 100}%` }} />)}
        </div>
        <div className="availability-legend">{statusMeta.map(({ status }) => <Link to={`/app/inventory?stock=${status}`} key={status}><StockStatus status={status} /><strong>{medicines ? counts[status] : '—'}</strong></Link>)}</div>
      </section>

      <div className="dashboard-grid premium-dashboard-grid">
        <section className="panel attention-panel"><div className="panel-heading"><div><span className="eyebrow">Needs attention</span><h2>Priority work</h2></div><Link to="/app/inventory">View inventory <ArrowRight size={15} /></Link></div>
          <div className="attention-list">
            <Link to="/app/inventory?stock=LOW_STOCK"><span className="attention-icon coral"><AlertTriangle /></span><div><strong>{counts.LOW_STOCK} {counts.LOW_STOCK === 1 ? 'medicine is' : 'medicines are'} running low</strong><p>Confirm availability before patients search.</p></div><ArrowRight /></Link>
            <Link to="/app/inventory?stock=OUT_OF_STOCK"><span className="attention-icon yellow"><PackageCheck /></span><div><strong>{counts.OUT_OF_STOCK} {counts.OUT_OF_STOCK === 1 ? 'medicine is' : 'medicines are'} unavailable</strong><p>Review these listings when supply changes.</p></div><ArrowRight /></Link>
            <Link to="/app/inventory?sort=updated"><span className="attention-icon blue"><Clock3 /></span><div><strong>{stale.length} {stale.length === 1 ? 'medicine needs' : 'medicines need'} a fresh update</strong><p>These signals are more than seven days old.</p></div><ArrowRight /></Link>
            <Link to="/app/verification"><span className="attention-icon lilac"><FileWarning /></span><div><strong>{needsDocuments.length} document{needsDocuments.length === 1 ? '' : 's'} need correction</strong><p>Review the administrator’s note before replacing files.</p></div><ArrowRight /></Link>
          </div>
        </section>

        <section className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">Shortcuts</span><h2>Quick actions</h2></div></div><div className="quick-grid"><button onClick={() => navigate('/app/inventory?add=true')}><PackagePlus /><span>Add medicine<small>Create one listing</small></span></button><button onClick={() => navigate('/app/inventory')}><RefreshCw /><span>Update availability<small>Change status</small></span></button><button onClick={() => navigate('/app/inventory?csv=true')}><Upload /><span>Import CSV<small>Validate before import</small></span></button><button onClick={() => navigate('/app/profile#hours')}><Clock3 /><span>Update hours<small>Public schedule</small></span></button></div></section>

        <section className="panel activity-panel-large"><div className="panel-heading"><div><span className="eyebrow">Recent inventory</span><h2>Latest activity</h2></div><Link to="/app/inventory">View all</Link></div>{medicines === null ? <div className="loading-list">{[1,2,3].map((item) => <span key={item} />)}</div> : medicines.length === 0 ? <EmptyState icon={Boxes} title="No medicines yet" description="Add your first medicine to start tracking availability." /> : <div className="inventory-activity">{medicines.slice(0, 4).map((medicine) => <article key={medicine.id}><span className="medicine-avatar">{medicine.genericName.slice(0, 2).toUpperCase()}</span><div><strong>{medicine.brandName} {medicine.dosageValue} {medicine.dosageUnit}</strong><p>{medicine.genericName} · Updated {new Date(medicine.lastUpdated).toLocaleDateString()}</p></div><StatusBadge status={medicine.stockStatus} /></article>)}</div>}</section>

        <section className="panel analytics-peek"><div className="panel-heading"><div><span className="eyebrow">Last 30 days</span><h2>Patient discovery</h2></div><BarChart3 /></div><div className="big-metric"><strong>{analytics?.summary.searchAppearances.toLocaleString() ?? '—'}</strong><span>Search appearances</span><small>Asia/Manila reporting</small></div><div className="mini-bars">{chartPoints.map((point) => <span key={point.date} style={{ height: `${Math.max(8, point.searchAppearances / chartMax * 100)}%` }} />)}</div><div className="analytics-mini-row"><span><strong>{analytics?.summary.profileViews ?? '—'}</strong> Profile views</span><span><strong>{analytics?.summary.patientConfirmations ?? '—'}</strong> Confirmations</span></div><Link className="analytics-peek-link" to="/app/analytics">Open analytics <ArrowRight size={14} /></Link></section>
      </div>
    </>
  );
}
