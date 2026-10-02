import { ArrowDown, ArrowUp, BarChart3, CheckCircle2, Eye, MapPinned, MousePointerClick, Search, ShieldAlert, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { analyticsService } from '@/src/services/analyticsService';
import type { AnalyticsSummary } from '@/src/types/models';

const chart = [28, 34, 31, 48, 44, 53, 58, 49, 68, 65, 72, 84, 76, 91];
const searches = [{ name: 'Paracetamol 500 mg', value: 642, change: 18 }, { name: 'Amoxicillin 500 mg', value: 398, change: 7 }, { name: 'Losartan 50 mg', value: 316, change: -3 }, { name: 'Cetirizine 10 mg', value: 282, change: 12 }, { name: 'Metformin 500 mg', value: 221, change: 4 }];

export function AnalyticsPage() {
  const [period, setPeriod] = useState('30');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  useEffect(() => { analyticsService.getSummary().then(setSummary); }, [period]);
  const metrics = [
    { label: 'Search appearances', value: summary?.searchAppearances, icon: Search, change: '+12.4%' },
    { label: 'Profile views', value: summary?.profileViews, icon: Eye, change: '+8.7%' },
    { label: 'Directions started', value: summary?.directionsStarted, icon: MapPinned, change: '+5.2%' },
    { label: 'Search-to-click rate', value: '33.2%', icon: MousePointerClick, change: '+2.1%' },
  ];
  return (
    <><header className="page-header"><div><span className="eyebrow">Performance & trust</span><h1>Analytics</h1><p>Understand patient discovery and the accuracy of your availability signals.</p></div><div className="period-tabs">{[['1','Today'],['7','7 days'],['30','30 days'],['all','All time']].map(([value,label]) => <button className={period === value ? 'active' : ''} onClick={() => setPeriod(value)} key={value}>{label}</button>)}</div></header>
      <div className="analytics-summary-grid">{metrics.map(({ label, value, icon: Icon, change }) => <article className="metric-panel" key={label}><div><span className="summary-icon tone-lilac"><Icon /></span><span className="metric-change positive"><ArrowUp /> {change}</span></div><strong>{typeof value === 'number' ? value.toLocaleString() : value ?? 'â€”'}</strong><p>{label}</p></article>)}</div>
      <div className="analytics-layout">
        <section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Discovery trend</span><h2>Search appearances</h2></div><span className="chart-total"><TrendingUp /> 2,480 total</span></div><div className="line-chart"><div className="chart-gridlines"><span /><span /><span /><span /></div><div className="bar-series">{chart.map((value,index) => <div key={index}><span style={{ height: value + '%' }} /><small>{index % 3 === 0 ? 'D' + (index+1) : ''}</small></div>)}</div></div></section>
        <section className="panel top-medicines"><div className="panel-heading"><div><span className="eyebrow">Demand</span><h2>Most searched medicines</h2></div><BarChart3 /></div>{searches.map((item,index) => <div className="rank-row" key={item.name}><span className="rank">{String(index+1).padStart(2,'0')}</span><div><strong>{item.name}</strong><span className="rank-bar"><i style={{ width: (item.value/searches[0].value)*100 + '%' }} /></span></div><b>{item.value}</b><small className={item.change >= 0 ? 'positive' : 'negative'}>{item.change >= 0 ? <ArrowUp /> : <ArrowDown />}{Math.abs(item.change)}%</small></div>)}</section>
        <section className="panel reliability-panel"><div className="panel-heading"><div><span className="eyebrow">Stock accuracy / reliability</span><h2>Patient feedback signals</h2></div><span className="score-ring">94<small>%</small></span></div><div className="reliability-metrics"><div><CheckCircle2 /><span><strong>{summary?.patientConfirmations ?? 'â€”'}</strong>Stock confirmations</span></div><div><ShieldAlert /><span><strong>{summary?.outOfStockReports ?? 'â€”'}</strong>Out-of-stock reports</span></div><div><Users /><span><strong>3</strong>Active reports to review</span></div></div><div className="report-list"><article><span className="medicine-avatar">PA</span><div><strong>Paracetamol 500 mg</strong><p>3 recent reports saying unavailable</p></div><button onClick={() => location.href='/app/inventory'}>Review inventory</button></article><article><span className="medicine-avatar">CE</span><div><strong>Cetirizine 10 mg</strong><p>2 reports Â· inventory already marked out</p></div><span className="resolved">Aligned</span></article></div><p className="policy-note">Patient reports are read-only here. Eligibility, abuse prevention, warnings, and deactivation must be enforced by the backend.</p></section>
      </div>
    </>
  );
}


