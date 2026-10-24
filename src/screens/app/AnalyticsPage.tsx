import { BarChart3, CalendarDays, CheckCircle2, Eye, Search, ShieldAlert } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { runtime } from '@/src/config/runtime';
import { analyticsService, type AnalyticsRange } from '@/src/services/analyticsService';
import type { AnalyticsDataset } from '@/src/types/models';

type Preset = 'today' | '7' | '30' | 'custom';
const endDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
const subtractDays = (days: number) => {
  const date = new Date(`${endDate}T12:00:00+08:00`);
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
};
const presetRange = (preset: Exclude<Preset, 'custom'>): AnalyticsRange => ({ start: preset === 'today' ? endDate : subtractDays(Number(preset) - 1), end: endDate });

export function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>('30');
  const [range, setRange] = useState<AnalyticsRange>(presetRange('30'));
  const [draft, setDraft] = useState<AnalyticsRange>(range);
  const [customOpen, setCustomOpen] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<AnalyticsDataset | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    analyticsService.getSummary(range).then(setData).catch(() => setLoadError(true));
  }, [range]);

  const choosePreset = (value: Exclude<Preset, 'custom'>) => { setData(null); setLoadError(false); setPreset(value); setRange(presetRange(value)); setCustomOpen(false); setError(''); };
  const applyCustom = () => {
    if (!draft.start || !draft.end) return setError('Choose both a start and end date.');
    if (draft.end < draft.start) return setError('End date cannot be earlier than the start date.');
    setData(null); setLoadError(false); setPreset('custom'); setRange(draft); setCustomOpen(false); setError('');
  };
  const max = Math.max(...(data?.points.map((point) => point.searchAppearances) ?? [1]));
  const label = useMemo(() => new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', timeZone: 'Asia/Manila' }), []);
  const summary = data?.summary;

  return (
    <>
      <header className="page-header analytics-header"><div><span className="eyebrow">Patient discovery · Asia/Manila</span><h1>Analytics</h1><p>See how supported patient activity changes across one synchronized date range.</p></div><div className="analytics-filter-wrap"><div className="period-tabs" aria-label="Analytics date range">{([['today','Today'],['7','7 days'],['30','30 days']] as const).map(([value,name]) => <button className={preset === value ? 'active' : ''} onClick={() => choosePreset(value)} key={value}>{name}</button>)}<button className={preset === 'custom' ? 'active' : ''} onClick={() => setCustomOpen((value) => !value)}><CalendarDays size={15} /> Custom</button></div>{customOpen && <section className="date-popover" role="dialog" aria-label="Custom analytics range"><header><strong>Custom date range</strong><small>Philippine local dates</small></header><div><label>Start date<input type="date" max={draft.end || endDate} value={draft.start} onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))} /></label><label>End date<input type="date" min={draft.start} max={endDate} value={draft.end} onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))} /></label></div>{error && <p className="date-error">{error}</p>}<footer><button onClick={() => choosePreset('30')}>Reset to 30 days</button><span><button onClick={() => { setCustomOpen(false); setError(''); }}>Cancel</button><button className="button button-small" onClick={applyCustom}>Apply</button></span></footer></section>}</div></header>
      <div className="analytics-context"><span>{range.start} to {range.end}</span>{runtime.useMockData && <strong>Development data</strong>}</div>
      {loadError ? <section className="panel analytics-state"><ShieldAlert /><h2>Analytics could not be loaded</h2><p>Try the selected range again when the data service is available.</p></section> : !data ? <section className="analytics-loading" aria-label="Loading analytics"><i /><i /><i /></section> : data.points.length === 0 ? <section className="panel analytics-state"><BarChart3 /><h2>No activity in this range</h2><p>Choose another date range to inspect supported activity.</p></section> : <>
        <div className="analytics-summary-grid three-up">
          <article className="metric-panel"><span className="summary-icon tone-yellow"><Search /></span><strong>{summary?.searchAppearances.toLocaleString()}</strong><p>Search appearances</p></article>
          <article className="metric-panel"><span className="summary-icon tone-green"><Eye /></span><strong>{summary?.profileViews.toLocaleString()}</strong><p>Profile views</p></article>
          <article className="metric-panel"><span className="summary-icon tone-coral"><CheckCircle2 /></span><strong>{summary?.patientConfirmations.toLocaleString()}</strong><p>Availability confirmations</p></article>
        </div>
        <div className="analytics-layout redesigned-analytics">
          <section className="panel chart-panel"><div className="panel-heading"><div><span className="eyebrow">Selected range</span><h2>Search appearances</h2></div><span className="chart-total">{data.points.length} local days</span></div><div className="line-chart"><div className="chart-gridlines"><span /><span /><span /><span /></div><div className="bar-series">{data.points.map((point,index) => <div key={point.date}><span style={{ height: `${Math.max(6, point.searchAppearances / max * 100)}%` }} data-tooltip={`${point.searchAppearances} appearances`} tabIndex={0} aria-label={`${point.date}: ${point.searchAppearances} search appearances`} /><small>{index === 0 || index === data.points.length - 1 ? label.format(new Date(`${point.date}T12:00:00+08:00`)) : ''}</small></div>)}</div></div></section>
          <section className="panel analytics-breakdown"><div className="panel-heading"><div><span className="eyebrow">Availability quality</span><h2>Feedback signals</h2></div><ShieldAlert /></div><div className="feedback-number"><strong>{summary?.outOfStockReports}</strong><span>Out-of-stock reports</span></div><p>Use patient feedback as a review signal. Your pharmacy remains responsible for confirming the current availability state.</p><Link to="/app/inventory">Review medicine availability</Link></section>
        </div>
      </>}
    </>
  );
}
