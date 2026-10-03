import { Building2, Camera, Check, Clock3, ExternalLink, LocateFixed, MapPin, Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { defaultHours } from '@/src/data/mockData';
import { BARANGAYS } from '@/src/constants/data';
import { runtime } from '@/src/config/runtime';
import { useToast } from '@/src/components/ui/Toast';

export function ProfilePage() {
  const [hours, setHours] = useState(defaultHours);
  const { showToast } = useToast();
  const submit = (event: FormEvent) => { event.preventDefault(); showToast('Pharmacy profile saved in the development adapter.'); };
  return (
    <><header className="page-header"><div><span className="eyebrow">Public store information</span><h1>Pharmacy profile</h1><p>Keep patient-facing details accurate and separate from sensitive verification records.</p></div><button className="button" form="profile-form"><Save size={17} /> Save changes</button></header>
      <form id="profile-form" onSubmit={submit} className="profile-layout">
        <div className="profile-main">
          <section className="panel form-section"><div className="section-title"><span><Building2 /></span><div><h2>Basic information</h2><p>Shown on the patient-facing pharmacy profile.</p></div></div><div className="store-photo-row"><div className="store-photo"><span>SM</span><button type="button" aria-label="Update store photo"><Camera size={16} /></button></div><div><strong>Store photo</strong><p>JPG or PNG · recommended 1200 × 800</p><button type="button" className="inline-link">Upload new photo</button></div></div><div className="form-grid"><label className="field-wide">Pharmacy name<input defaultValue="St. Martha Pharmacy" required /></label><label>Contact number<input defaultValue="+63 917 123 4567" required /></label><label>Barangay<select defaultValue="Poblacion">{BARANGAYS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-wide">Full address<textarea rows={3} defaultValue="123 Care Avenue, Poblacion, San Jose del Monte, Bulacan 3023" /></label></div></section>
          <section className="panel form-section"><div className="section-title"><span><MapPin /></span><div><h2>Location</h2><p>Used for patient directions and nearby searches.</p></div></div><div className="profile-map"><div className="map-grid" /><span className="map-marker"><b>+</b></span><div className="map-address"><MapPin /><span><strong>123 Care Avenue, Poblacion</strong><small>{runtime.hasMapsKey ? 'Interactive Google Map ready' : 'Preview mode · Web Maps key required'}</small></span></div></div><div className="coordinate-grid"><label>Latitude<input defaultValue="14.793300" /></label><label>Longitude<input defaultValue="121.075400" /></label><button type="button" className="button button-secondary"><LocateFixed size={16} /> Update location</button></div></section>
          <section className="panel form-section" id="hours"><div className="section-title"><span><Clock3 /></span><div><h2>Operating hours</h2><p>Set opening hours for each day of the week.</p></div></div><div className="hours-list compact">{hours.map((item,index) => <div className={item.isOpen ? 'hours-row' : 'hours-row closed'} key={item.day}><strong>{item.day}</strong><label className="switch-label"><input type="checkbox" checked={item.isOpen} onChange={(event) => setHours((current) => current.map((row,rowIndex) => rowIndex === index ? {...row,isOpen:event.target.checked}:row))} /><span />{item.isOpen ? 'Open' : 'Closed'}</label>{item.isOpen && <div className="hours-inputs"><input type="time" value={item.open} onChange={(event) => setHours((current) => current.map((row,rowIndex) => rowIndex === index ? {...row,open:event.target.value}:row))} /><span>to</span><input type="time" value={item.close} onChange={(event) => setHours((current) => current.map((row,rowIndex) => rowIndex === index ? {...row,close:event.target.value}:row))} /></div>}</div>)}</div></section>
        </div>
        <aside className="profile-preview panel"><span className="eyebrow">Public preview</span><div className="preview-photo"><span>Store photo</span></div><div className="preview-content"><span className="verified-line"><Check /> Verified pharmacy</span><h3>St. Martha Pharmacy</h3><p><MapPin /> 123 Care Avenue, Poblacion</p><p><Clock3 /> Open today · 8:00 AM“8:00 PM</p><div className="preview-medicine"><strong>Paracetamol 500 mg</strong><span>Low stock</span></div><button type="button" className="button button-secondary">View patient profile <ExternalLink size={15} /></button></div><small>Exact inventory quantities are never included in the patient preview.</small></aside>
      </form>
    </>
  );
}


