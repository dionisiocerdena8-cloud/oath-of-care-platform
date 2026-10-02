import { ArrowLeft, ArrowRight, Check, Clock3, Copy, FileCheck2, LocateFixed, MapPin, UploadCloud } from 'lucide-react';
import { ChangeEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BARANGAYS } from '@/src/constants/data';
import { defaultHours } from '@/src/data/mockData';
import { runtime } from '@/src/config/runtime';
import { pharmacyService } from '@/src/services/pharmacyService';
import { useToast } from '@/src/components/ui/Toast';

const steps = ['Account', 'Pharmacy details', 'Location', 'Hours', 'Documents', 'Review'];
type UploadState = { name: string; size: string };

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({ email: '', password: '', pharmacyName: '', contact: '', address: '', barangay: '', latitude: '14.7933', longitude: '121.0754' });
  const [hours, setHours] = useState(defaultHours);
  const [documents, setDocuments] = useState<Record<string, UploadState>>({});
  const { showToast } = useToast();
  const navigate = useNavigate();
  const progress = ((step + 1) / steps.length) * 100;

  const setField = (key: string, value: string) => setData((current) => ({ ...current, [key]: value }));
  const canContinue = useMemo(() => {
    if (step === 0) return data.email.includes('@') && data.password.length >= 8;
    if (step === 1) return Boolean(data.pharmacyName && data.contact && data.address && data.barangay);
    if (step === 2) return Boolean(data.address && data.latitude && data.longitude);
    if (step === 4) return ['fda', 'permit', 'prc'].every((key) => documents[key]);
    return true;
  }, [data, documents, step]);

  const next = () => {
    if (!canContinue) return showToast('Complete the required information before continuing.', 'error');
    setStep((value) => Math.min(value + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const chooseFile = (key: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return showToast('Choose a file smaller than 10 MB.', 'error');
    setDocuments((current) => ({ ...current, [key]: { name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB` } }));
    showToast(`${file.name} is ready to upload.`);
  };
  const submit = async () => {
    try { await pharmacyService.submitApplication(); showToast('Application submitted for review.'); navigate('/application-status'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Submission failed.', 'error'); }
  };

  return (
    <div className="register-card">
      <header className="register-heading"><div><span className="eyebrow">Pharmacy onboarding</span><h2>{steps[step]}</h2><p>Step {step + 1} of {steps.length}</p></div><span className="step-count">{String(step + 1).padStart(2, '0')}<small>/ {String(steps.length).padStart(2, '0')}</small></span></header>
      <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      <ol className="stepper">{steps.map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''}><span>{index < step ? <Check size={13} /> : index + 1}</span><small>{label}</small></li>)}</ol>

      <div className="registration-body">
        {step === 0 && <AccountStep data={data} setField={setField} />}
        {step === 1 && <DetailsStep data={data} setField={setField} />}
        {step === 2 && <LocationStep data={data} setField={setField} />}
        {step === 3 && <HoursStep hours={hours} setHours={setHours} />}
        {step === 4 && <DocumentsStep documents={documents} chooseFile={chooseFile} remove={(key) => setDocuments((current) => { const nextDocs = { ...current }; delete nextDocs[key]; return nextDocs; })} />}
        {step === 5 && <ReviewStep data={data} hours={hours} documents={documents} />}
      </div>
      <footer className="register-footer"><button className="button button-secondary" onClick={() => step === 0 ? navigate('/login') : setStep((value) => value - 1)}><ArrowLeft size={17} /> {step === 0 ? 'Sign in' : 'Back'}</button>{step < steps.length - 1 ? <button className="button" onClick={next}>Continue <ArrowRight size={17} /></button> : <button className="button" onClick={submit}>Submit application <FileCheck2 size={17} /></button>}</footer>
    </div>
  );
}

function AccountStep({ data, setField }: { data: Record<string, string>; setField: (key: string, value: string) => void }) {
  return <div className="step-panel"><div className="step-intro"><h3>Create the account owner</h3><p>This account authenticates the owner. It does not bypass pharmacy verification.</p></div><div className="provider-stack horizontal"><button type="button"><span className="provider-letter google-letter">G</span> Google</button><button type="button"><span className="provider-letter facebook-letter">f</span> Facebook</button></div><div className="divider"><span>or use email</span></div><div className="form-grid"><label>Email address<input type="email" value={data.email} onChange={(event) => setField('email', event.target.value)} placeholder="owner@pharmacy.com" required /></label><label>Password<input type="password" value={data.password} onChange={(event) => setField('password', event.target.value)} placeholder="At least 8 characters" minLength={8} required /></label></div><p className="info-note">OAuth verifies the account only. Store details and documents still go through administrator review.</p></div>;
}

function DetailsStep({ data, setField }: { data: Record<string, string>; setField: (key: string, value: string) => void }) {
  return <div className="step-panel"><div className="step-intro"><h3>Tell us about the pharmacy</h3><p>Use the same legal name and address shown in your documents.</p></div><div className="photo-upload"><span><UploadCloud /></span><div><strong>Storefront photo</strong><p>JPG or PNG, up to 10 MB</p></div><label className="button button-secondary button-small">Choose image<input type="file" accept="image/png,image/jpeg" hidden /></label></div><div className="form-grid"><label className="field-wide">Pharmacy name<input value={data.pharmacyName} onChange={(event) => setField('pharmacyName', event.target.value)} placeholder="St. Martha Pharmacy" /></label><label>Contact number<input value={data.contact} onChange={(event) => setField('contact', event.target.value.replace(/[^0-9+ -]/g, ''))} placeholder="+63 917 123 4567" /></label><label>Barangay<select value={data.barangay} onChange={(event) => setField('barangay', event.target.value)}><option value="">Select barangay</option>{BARANGAYS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-wide">Full address<textarea rows={3} value={data.address} onChange={(event) => setField('address', event.target.value)} placeholder="Street, barangay, municipality, province, postal code" /></label></div></div>;
}

function LocationStep({ data, setField }: { data: Record<string, string>; setField: (key: string, value: string) => void }) {
  return <div className="step-panel"><div className="step-intro"><h3>Confirm the exact location</h3><p>Patients use this pin for directions. A separate Google Maps Web key is required for the live map.</p></div><div className="map-layout"><div className="map-controls"><label>Search address<div className="input-with-icon"><MapPin size={17} /><input value={data.address} onChange={(event) => setField('address', event.target.value)} placeholder="Search address" /></div></label><button className="button button-secondary" type="button"><LocateFixed size={17} /> Use current map center</button><div className="coordinate-grid"><label>Latitude<input value={data.latitude} onChange={(event) => setField('latitude', event.target.value)} /></label><label>Longitude<input value={data.longitude} onChange={(event) => setField('longitude', event.target.value)} /></label></div></div><div className="map-placeholder"><div className="map-grid" /><span className="map-marker"><b>+</b></span><span className="map-label">{runtime.hasMapsKey ? 'Map integration ready' : 'Google Maps Web key required'}<small>Pin preview Â· drag support activates with Maps</small></span></div></div><p className="info-note">The Android Maps key is not reused. Coordinates are stored separately from the formatted address.</p></div>;
}

function HoursStep({ hours, setHours }: { hours: typeof defaultHours; setHours: React.Dispatch<React.SetStateAction<typeof defaultHours>> }) {
  const update = (index: number, patch: Partial<(typeof hours)[number]>) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const copyWeekdays = () => setHours((current) => current.map((item, index) => index < 5 ? { ...item, ...current[0], day: item.day } : item));
  return <div className="step-panel"><div className="step-intro inline"><div><h3>Set weekly operating hours</h3><p>Patients will see these hours on your public pharmacy profile.</p></div><button className="inline-link" onClick={copyWeekdays}><Copy size={15} /> Copy Monday to weekdays</button></div><div className="hours-list">{hours.map((item, index) => <div className={`hours-row ${!item.isOpen ? 'closed' : ''}`} key={item.day}><strong>{item.day}</strong><label className="switch-label"><input type="checkbox" checked={item.isOpen} onChange={(event) => update(index, { isOpen: event.target.checked })} /><span />{item.isOpen ? 'Open' : 'Closed'}</label>{item.isOpen && <><label className="check-label"><input type="checkbox" checked={item.is24Hours} onChange={(event) => update(index, { is24Hours: event.target.checked })} /> 24 hours</label>{!item.is24Hours && <div className="hours-inputs"><input type="time" value={item.open} onChange={(event) => update(index, { open: event.target.value })} /><span>to</span><input type="time" value={item.close} onChange={(event) => update(index, { close: event.target.value })} /></div>}</>}</div>)}</div></div>;
}

function DocumentsStep({ documents, chooseFile, remove }: { documents: Record<string, UploadState>; chooseFile: (key: string, event: ChangeEvent<HTMLInputElement>) => void; remove: (key: string) => void }) {
  const fields = [{ key: 'fda', label: 'FDA License to Operate' }, { key: 'permit', label: 'Business Permit' }, { key: 'prc', label: 'Pharmacist PRC ID' }];
  return <div className="step-panel"><div className="step-intro"><h3>Upload verification documents</h3><p>PDF, JPG, or PNG up to 10 MB. Files are prepared for private Supabase Storage buckets.</p></div><div className="document-upload-list">{fields.map((field) => <article key={field.key} className={documents[field.key] ? 'uploaded' : ''}><span className="doc-icon">{documents[field.key] ? <Check /> : <UploadCloud />}</span><div><strong>{field.label}</strong>{documents[field.key] ? <p>{documents[field.key].name} Â· {documents[field.key].size}</p> : <p>No file selected</p>}{documents[field.key] && <div className="upload-progress"><span /></div>}</div><div className="document-actions"><label className="inline-link">{documents[field.key] ? 'Replace' : 'Choose file'}<input type="file" hidden accept=".pdf,image/png,image/jpeg" onChange={(event) => chooseFile(field.key, event)} /></label>{documents[field.key] && <button onClick={() => remove(field.key)}>Remove</button>}</div></article>)}</div><p className="privacy-note"><FileCheck2 size={17} /> Verification files are sensitive. The production integration must use private storage and signed access.</p></div>;
}

function ReviewStep({ data, hours, documents }: { data: Record<string, string>; hours: typeof defaultHours; documents: Record<string, UploadState> }) {
  return <div className="step-panel"><div className="step-intro"><h3>Review before submission</h3><p>Confirm the details below. You can return to any previous step to make corrections.</p></div><div className="review-grid"><section><span className="review-label">Account</span><strong>{data.email}</strong><p>Email + password authentication</p></section><section><span className="review-label">Pharmacy</span><strong>{data.pharmacyName}</strong><p>{data.contact}<br />{data.address}, {data.barangay}</p></section><section><span className="review-label">Location</span><strong>Map pin confirmed</strong><p>{data.latitude}, {data.longitude}</p></section><section><span className="review-label">Operating hours</span><strong>{hours.filter((item) => item.isOpen).length} open days</strong><p><Clock3 size={13} /> Weekday hours configured</p></section><section className="review-wide"><span className="review-label">Verification documents</span><div className="review-docs">{Object.values(documents).map((doc) => <span key={doc.name}><Check size={13} /> {doc.name}</span>)}</div></section></div><div className="submission-notice"><FileCheck2 /><div><strong>What happens next?</strong><p>Your account is created, then the application enters administrator review. Dashboard access remains locked until approval.</p></div></div></div>;
}
