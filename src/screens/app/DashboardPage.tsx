import { AlertTriangle, ArrowRight, BarChart3, Box, Boxes, Clock3, FileWarning, PackagePlus, RefreshCw, Upload, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { analyticsService, inventoryService } from '@/src/services';
import type { AnalyticsSummary, Medicine } from '@/src/types/models';
import { resolveStockLevel } from '@/src/utils/stockLevel';

export function DashboardPage() {
  const [medicines, setMedicines] = useState<Medicine[] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const navigate = useNavigate();
  useEffect(() => { inventoryService.list().then(setMedicines); analyticsService.getSummary().then(setAnalytics); }, []);
  const stats = useMemo(() => {
    const values = medicines ?? [];
    return [
      { label: 'Total medicines', value: values.length, icon: Boxes, tone: 'lilac' },
      { label: 'High stock', value: values.filter((m) => resolveStockLevel(m.quantity, m.stockLevel) === 'HIGH_STOCK').length, icon: Box, tone: 'green' },
      { label: 'Medium stock', value: values.filter((m) => resolveStockLevel(m.quantity, m.stockLevel) === 'MEDIUM_STOCK').length, icon: Box, tone: 'yellow' },
      { label: 'Low stock', value: values.filter((m) => resolveStockLevel(m.quantity, m.stockLevel) === 'LOW_STOCK').length, icon: AlertTriangle, tone: 'coral' },
      { label: 'Out of stock', value: values.filter((m) => m.quantity === 0).length, icon: FileWarning, tone: 'navy' },
    ];
  }, [medicines]);
  const lowStock = (medicines ?? []).filter((m) => resolveStockLevel(m.quantity, m.stockLevel) === 'LOW_STOCK');

  return (
    <>
      <header className="page-header"><div><span className="eyebrow">Thursday, October 2</span><h1>Good morning, St. Martha Pharmacy</h1><p>Hereâ€™s what needs your attention today.</p></div><button className="button" onClick={() => navigate('/app/inventory?add=true')}><PackagePlus size={18} /> Add medicine</button></header>
      <div className="summary-grid">{stats.map(({ label, value, icon: Icon, tone }) => <article className="summary-card" key={label}><span className={`summary-icon tone-${tone}`}><Icon size={20} /></span><div><strong>{medicines ? value : 'â€”'}</strong><span>{label}</span></div></article>)}</div>

      <div className="dashboard-grid">
        <section className="panel attention-panel"><div className="panel-heading"><div><span className="eyebrow">Needs attention</span><h2>Priority work</h2></div><Link to="/app/inventory">View inventory <ArrowRight size={15} /></Link></div>
          <div className="attention-list">
            <Link to="/app/inventory?stock=LOW_STOCK"><span className="attention-icon coral"><AlertTriangle /></span><div><strong>{lowStock.length || 0} medicines are running low</strong><p>Restock items before they become unavailable.</p></div><ArrowRight /></Link>
            <Link to="/app/analytics"><span className="attention-icon yellow"><Users /></span><div><strong>3 stock accuracy reports</strong><p>Patients recently reported availability mismatches.</p></div><ArrowRight /></Link>
            <Link to="/app/inventory"><span className="attention-icon blue"><Clock3 /></span><div><strong>5 medicines need a fresh update</strong><p>Confirm stock for items not updated in 7 days.</p></div><ArrowRight /></Link>
            <Link to="/app/verification"><span className="attention-icon lilac"><FileWarning /></span><div><strong>Business Permit needs attention</strong><p>Upload a clearer copy for continued verification.</p></div><ArrowRight /></Link>
          </div>
        </section>

        <section className="panel quick-panel"><div className="panel-heading"><div><span className="eyebrow">Shortcuts</span><h2>Quick actions</h2></div></div><div className="quick-grid"><button onClick={() => navigate('/app/inventory?add=true')}><PackagePlus /><span>Add medicine<small>Create one item</small></span></button><button onClick={() => navigate('/app/inventory?restock=true')}><RefreshCw /><span>Restock medicine<small>Update quantity</small></span></button><button onClick={() => navigate('/app/inventory?csv=true')}><Upload /><span>Upload CSV<small>Preview before import</small></span></button><button onClick={() => navigate('/app/profile#hours')}><Clock3 /><span>Update hours<small>Public schedule</small></span></button></div></section>

        <section className="panel activity-panel-large"><div className="panel-heading"><div><span className="eyebrow">Recent inventory</span><h2>Latest activity</h2></div><Link to="/app/inventory">View all</Link></div>{medicines === null ? <div className="loading-list">{[1,2,3].map((item) => <span key={item} />)}</div> : medicines.length === 0 ? <EmptyState icon={Boxes} title="No medicines yet" description="Add your first medicine to start tracking availability." /> : <div className="inventory-activity">{medicines.slice(0, 4).map((medicine) => <article key={medicine.id}><span className="medicine-avatar">{medicine.genericName.slice(0, 2).toUpperCase()}</span><div><strong>{medicine.brandName} {medicine.dosageValue} {medicine.dosageUnit}</strong><p>{medicine.genericName} Â· Updated {new Date(medicine.lastUpdated).toLocaleDateString()}</p></div><span className="quantity">{medicine.quantity} units</span><StatusBadge status={resolveStockLevel(medicine.quantity, medicine.stockLevel)} /></article>)}</div>}</section>

        <section className="panel analytics-peek"><div className="panel-heading"><div><span className="eyebrow">Last 30 days</span><h2>Patient discovery</h2></div><BarChart3 /></div><div className="big-metric"><strong>{analytics?.searchAppearances.toLocaleString() ?? 'â€”'}</strong><span>Search appearances</span><small>â†‘ 12.4% from previous period</small></div><div className="mini-bars">{[38,54,47,72,64,88,78,92,70,83,96,88].map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}</div><div className="analytics-mini-row"><span><strong>{analytics?.profileViews ?? 'â€”'}</strong> Profile views</span><span><strong>{analytics?.directionsStarted ?? 'â€”'}</strong> Directions</span></div></section>
      </div>
    </>
  );
}


