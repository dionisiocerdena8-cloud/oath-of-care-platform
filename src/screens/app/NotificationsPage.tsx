import { Bell, CheckCheck, CircleAlert, FileCheck2, LifeBuoy, PackageMinus, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { notificationService } from '@/src/services/notificationService';
import type { PharmacyNotification } from '@/src/types/models';

const iconMap = { LOW_STOCK: PackageMinus, STOCK_ACCURACY: ShieldAlert, VERIFICATION: FileCheck2, APPLICATION: CircleAlert, SUPPORT: LifeBuoy };

export function NotificationsPage() {
  const [items, setItems] = useState<PharmacyNotification[] | null>(null);
  const [filter, setFilter] = useState<'all'|'unread'>('all');
  useEffect(() => { notificationService.list().then(setItems); }, []);
  const markRead = async (id: string) => { await notificationService.markRead(id); setItems((current) => current?.map((item) => item.id === id ? {...item,read:true}:item) ?? []); };
  const visible = (items ?? []).filter((item) => filter === 'all' || !item.read);
  return (
    <><header className="page-header"><div><span className="eyebrow">Activity center</span><h1>Notifications</h1><p>Stock, verification, application, and support updates in one place.</p></div><button className="button button-secondary" onClick={() => { (items ?? []).forEach((item) => !item.read && notificationService.markRead(item.id)); setItems((current) => current?.map((item) => ({...item,read:true})) ?? []); }}><CheckCheck size={17} /> Mark all read</button></header>
      <section className="panel notifications-panel"><div className="notification-tabs"><button className={filter==='all'?'active':''} onClick={() => setFilter('all')}>All <span>{items?.length ?? 0}</span></button><button className={filter==='unread'?'active':''} onClick={() => setFilter('unread')}>Unread <span>{items?.filter((item)=>!item.read).length ?? 0}</span></button></div>{items === null ? <div className="table-loading">Loading notifications…</div> : visible.length === 0 ? <EmptyState icon={Bell} title={filter === 'unread' ? 'You’re all caught up' : 'No notifications'} description={filter === 'unread' ? 'New alerts will appear here.' : 'Important pharmacy updates will appear here.'} /> : <div className="notification-list">{visible.map((item) => { const Icon = iconMap[item.type]; return <button className={!item.read ? 'unread' : ''} key={item.id} onClick={() => markRead(item.id)}><span className={'notification-icon type-' + item.type.toLowerCase()}><Icon /></span><div><span className="notification-type">{item.type.replaceAll('_',' ')}</span><strong>{item.title}</strong><p>{item.message}</p></div><time>{item.createdAt}</time>{!item.read && <i />}</button>; })}</div>}</section>
    </>
  );
}


