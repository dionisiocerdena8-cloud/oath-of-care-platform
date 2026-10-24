/* eslint-disable @next/next/no-img-element */
import { Building2, Camera, Check, Clock3, ExternalLink, LocateFixed, MapPin, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { defaultHours } from '@/src/data/mockData';
import { BARANGAYS } from '@/src/constants/data';
import { runtime } from '@/src/config/runtime';
import { useToast } from '@/src/components/ui/Toast';
import { pharmacyService } from '@/src/services/pharmacyService';
import type { PharmacyProfile } from '@/src/types/models';

const emptyProfile: PharmacyProfile = { id: '', pharmacyName: '', contactEmail: '', contactPhone: '', fullAddress: '', barangay: '', latitude: null, longitude: null, conciseAddress: '', version: 0, hours: structuredClone(defaultHours) };

export function ProfilePage() {
  const [profile, setProfile] = useState<PharmacyProfile | null>(runtime.useMockData ? { ...emptyProfile, pharmacyName: 'St. Martha Pharmacy', contactPhone: '+63 917 123 4567', fullAddress: '123 Care Avenue, Poblacion, San Jose del Monte, Bulacan 3023', barangay: 'Poblacion', latitude: 14.7933, longitude: 121.0754 } : null);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const { showToast } = useToast();
  useEffect(() => { if (!runtime.useMockData) pharmacyService.getProfile().then(async (value) => { setProfile(value || emptyProfile); if (value?.logoPath) { try { setPhotoUrl((await pharmacyService.getProfilePhoto()).url); } catch { /* optional image */ } } }).catch((error) => showToast(error instanceof Error ? error.message : 'Unable to load the pharmacy profile.', 'error')); }, [showToast]);
  const change = <K extends keyof PharmacyProfile>(key: K, value: PharmacyProfile[K]) => setProfile((current) => ({ ...(current || emptyProfile), [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!profile) return;
    setSaving(true);
    try { const result = await pharmacyService.saveProfile(profile); if (result.profile) setProfile(result.profile); showToast('Pharmacy profile saved.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to save the pharmacy profile.', 'error'); }
    finally { setSaving(false); }
  };
  const uploadPhoto = async (file?: File) => {
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) return showToast('Choose a JPG, PNG, or WebP image up to 10 MB.', 'error');
    try { const result = await pharmacyService.uploadProfilePhoto(file); setPhotoUrl(result.url); change('logoPath', result.logoPath); showToast('Pharmacy image uploaded.'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Image upload failed.', 'error'); }
  };
  if (!profile) return <div className="table-loading">Loading pharmacy profile…</div>;
  return <>
    <header className="page-header"><div><span className="eyebrow">Public store information</span><h1>Pharmacy profile</h1><p>Keep patient-facing details accurate and separate from sensitive verification records.</p></div><button className="button" form="profile-form" disabled={saving}><Save size={17} /> {saving ? 'Saving…' : 'Save changes'}</button></header>
    <form id="profile-form" onSubmit={submit} className="profile-layout">
      <div className="profile-main">
        <section className="panel form-section"><div className="section-title"><span><Building2 /></span><div><h2>Basic information</h2><p>Shown on the patient-facing pharmacy profile.</p></div></div><div className="store-photo-row"><div className="store-photo">{photoUrl ? <img src={photoUrl} alt="Pharmacy storefront" /> : <span>{profile.pharmacyName.slice(0,2).toUpperCase() || 'OC'}</span>}</div><div><strong>Store photo</strong><p>JPG, PNG, or WebP · up to 10 MB</p><label className="inline-link"><Camera size={15} /> Upload new photo<input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPhoto(event.target.files?.[0])} /></label></div></div><div className="form-grid">
          <label className="field-wide">Pharmacy name<input value={profile.pharmacyName} onChange={(event) => change('pharmacyName', event.target.value)} required /></label>
          <label>Contact number<input value={profile.contactPhone || ''} onChange={(event) => change('contactPhone', event.target.value)} required /></label>
          <label>Contact email<input type="email" value={profile.contactEmail || ''} onChange={(event) => change('contactEmail', event.target.value)} /></label>
          <label>Barangay<select value={profile.barangay || ''} onChange={(event) => change('barangay', event.target.value)}><option value="">Select barangay</option>{BARANGAYS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field-wide">Full address<textarea rows={3} value={profile.fullAddress || ''} onChange={(event) => change('fullAddress', event.target.value)} /></label>
        </div></section>
        <section className="panel form-section"><div className="section-title"><span><MapPin /></span><div><h2>Location</h2><p>Used for patient directions and nearby searches.</p></div></div><div className={`profile-map ${runtime.hasMapsKey ? '' : 'map-unavailable'}`}><div className="map-grid" />{runtime.hasMapsKey && <span className="map-marker"><b>+</b></span>}<div className="map-address"><MapPin /><span><strong>{profile.conciseAddress || profile.fullAddress || 'No public address saved'}</strong><small>{runtime.hasMapsKey ? 'Google Maps connection ready' : 'Configure VITE_GOOGLE_MAPS_WEB_KEY before confirming a new pin'}</small></span></div></div><div className="coordinate-grid">
          <label>Latitude<input type="number" step="0.000001" min="-90" max="90" value={profile.latitude ?? ''} onChange={(event) => change('latitude', event.target.value ? Number(event.target.value) : null)} /></label>
          <label>Longitude<input type="number" step="0.000001" min="-180" max="180" value={profile.longitude ?? ''} onChange={(event) => change('longitude', event.target.value ? Number(event.target.value) : null)} /></label>
          <button type="button" className="button button-secondary" disabled={!runtime.hasMapsKey}><LocateFixed size={16} /> Update location</button>
        </div></section>
        <section className="panel form-section" id="hours"><div className="section-title"><span><Clock3 /></span><div><h2>Operating hours</h2><p>Set opening hours for each day of the week.</p></div></div><div className="hours-list compact">{profile.hours.map((item,index) => <div className={item.isOpen ? 'hours-row' : 'hours-row closed'} key={item.day}><strong>{item.day}</strong><label className="switch-label"><input type="checkbox" checked={item.isOpen} onChange={(event) => change('hours', profile.hours.map((row,rowIndex) => rowIndex === index ? {...row,isOpen:event.target.checked}:row))} /><span />{item.isOpen ? 'Open' : 'Closed'}</label>{item.isOpen && <div className="hours-inputs"><input type="time" value={item.open || ''} onChange={(event) => change('hours', profile.hours.map((row,rowIndex) => rowIndex === index ? {...row,open:event.target.value}:row))} /><span>to</span><input type="time" value={item.close || ''} onChange={(event) => change('hours', profile.hours.map((row,rowIndex) => rowIndex === index ? {...row,close:event.target.value}:row))} /></div>}</div>)}</div></section>
      </div>
      <aside className="profile-preview panel"><span className="eyebrow">Public preview</span><div className="preview-photo">{photoUrl ? <img src={photoUrl} alt="Pharmacy preview" /> : <span>Store photo</span>}</div><div className="preview-content"><span className="verified-line"><Check /> Verified pharmacy</span><h3>{profile.pharmacyName || 'Your pharmacy'}</h3><p><MapPin /> {profile.conciseAddress || profile.fullAddress || 'Address not set'}</p><p><Clock3 /> Hours saved for {profile.hours.filter((hour) => hour.isOpen).length} days</p><div className="preview-medicine"><strong>Live medicine availability appears from saved inventory.</strong></div><button type="button" className="button button-secondary" disabled>Patient profile link <ExternalLink size={15} /></button></div><small>Exact inventory statuses are shown without quantities.</small></aside>
    </form>
  </>;
}
