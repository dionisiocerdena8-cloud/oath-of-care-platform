import { ArrowLeft, ArrowRight, Check, Copy, Eye, FileCheck2, LocateFixed, MapPin, UploadCloud } from 'lucide-react';
import { ChangeEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SocialAuthButton } from '@/src/components/auth/SocialAuthButton';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { useToast } from '@/src/components/ui/Toast';
import { runtime } from '@/src/config/runtime';
import { BARANGAYS } from '@/src/constants/data';
import { defaultHours } from '@/src/data/mockData';
import { authService } from '@/src/services/authService';
import { pharmacyService } from '@/src/services/pharmacyService';

const steps = ['Account', 'Pharmacy', 'Location', 'Hours', 'Documents', 'Review'];
type UploadState = { name: string; size: string; type: string; url: string };
type RegistrationData = { email: string; password: string; confirmPassword: string; pharmacyName: string; contact: string; address: string; barangay: string; latitude: string; longitude: string };

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<RegistrationData>({ email: '', password: '', confirmPassword: '', pharmacyName: '', contact: '', address: '', barangay: '', latitude: '14.7933', longitude: '121.0754' });
  const [hours, setHours] = useState(defaultHours);
  const [documents, setDocuments] = useState<Record<string, UploadState>>({});
  const { showToast } = useToast();
  const navigate = useNavigate();
  const progress = ((step + 1) / steps.length) * 100;

  const setField = (key: keyof RegistrationData, value: string) => setData((current) => ({ ...current, [key]: value }));
  const canContinue = useMemo(() => {
    if (step === 0) return data.email.includes('@') && data.password.length >= 8 && data.password === data.confirmPassword;
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
    setDocuments((current) => ({ ...current, [key]: { name: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB`, type: file.type || 'Document', url: URL.createObjectURL(file) } }));
    showToast(`${file.name} is ready to upload.`);
  };
  const removeDocument = (key: string) => setDocuments((current) => {
    if (current[key]?.url) URL.revokeObjectURL(current[key].url);
    const nextDocs = { ...current }; delete nextDocs[key]; return nextDocs;
  });
  const providerLogin = async (provider: 'google' | 'facebook') => {
    try { await authService.signInWithProvider(provider); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Authentication failed.', 'error'); }
  };
  const submit = async () => {
    try { await pharmacyService.submitApplication(); showToast('Application submitted for review.'); navigate('/application-status'); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Submission failed.', 'error'); }
  };

  return (
    <div className={`register-card register-step-${step + 1}`}>
      <header className="register-heading"><div><span className="auth-context">Pharmacy onboarding</span><h2>{steps[step]}</h2><p>Step {step + 1} of {steps.length}</p></div></header>
      <div className="progress-track" aria-label={`Step ${step + 1} of ${steps.length}`}><span style={{ width: `${progress}%` }} /></div>
      <ol className="stepper">{steps.map((label, index) => <li key={label} className={index === step ? 'current' : index < step ? 'complete' : ''}><span>{index < step ? <Check size={13} /> : index + 1}</span><small>{label}</small></li>)}</ol>

      <div className="registration-body">
        {step === 0 && <AccountStep data={data} setField={setField} providerLogin={providerLogin} />}
        {step === 1 && <DetailsStep data={data} setField={setField} />}
        {step === 2 && <LocationStep data={data} setField={setField} />}
        {step === 3 && <HoursStep hours={hours} setHours={setHours} />}
        {step === 4 && <DocumentsStep documents={documents} chooseFile={chooseFile} remove={removeDocument} />}
        {step === 5 && <ReviewStep data={data} hours={hours} documents={documents} edit={setStep} />}
      </div>
      <footer className={`register-footer ${step === 0 ? 'first-step' : ''}`}>
        {step > 0 && <button className="button button-tertiary" onClick={() => setStep((value) => value - 1)}><ArrowLeft size={17} /> Back</button>}
        {step < steps.length - 1 ? <button className="button" onClick={next}>Continue <ArrowRight size={17} /></button> : <button className="button" onClick={submit}>Submit pharmacy application <FileCheck2 size={17} /></button>}
      </footer>
    </div>
  );
}

function AccountStep({ data, setField, providerLogin }: { data: RegistrationData; setField: (key: keyof RegistrationData, value: string) => void; providerLogin: (provider: 'google' | 'facebook') => void }) {
  const [confirmTouched, setConfirmTouched] = useState(false);
  const mismatch = confirmTouched && Boolean(data.confirmPassword) && data.password !== data.confirmPassword;
  const showRequirements = data.password.length > 0;
  return <div className="step-panel account-step"><div className="step-intro"><h3>Create the account owner</h3><p>Use the sign-in method that will own this pharmacy application.</p></div><div className="provider-stack"><SocialAuthButton provider="google" onClick={() => providerLogin('google')} /><SocialAuthButton provider="facebook" onClick={() => providerLogin('facebook')} /></div><div className="divider"><span>or continue with email</span></div><div className="account-fields"><label>Email address<input type="email" value={data.email} onChange={(event) => setField('email', event.target.value)} placeholder="name@example.com" autoComplete="email" required /></label><PasswordInput label="Password" value={data.password} onChange={(event) => setField('password', event.target.value)} placeholder="Create a password" minLength={8} autoComplete="new-password" required hint={showRequirements ? <span className={data.password.length >= 8 ? 'requirement-met' : ''}><Check size={13} /> At least 8 characters</span> : undefined} /><PasswordInput label="Confirm password" value={data.confirmPassword} onChange={(event) => setField('confirmPassword', event.target.value)} onBlur={() => setConfirmTouched(true)} placeholder="Re-enter your password" minLength={8} autoComplete="new-password" required error={mismatch ? 'Passwords do not match.' : undefined} /></div><p className="auth-switch account-sign-in">Already have an account? <Link to="/login">Sign in</Link></p></div>;
}

function DetailsStep({ data, setField }: { data: RegistrationData; setField: (key: keyof RegistrationData, value: string) => void }) {
  return <div className="step-panel"><div className="step-intro"><h3>Tell us about the pharmacy</h3><p>Use the same legal name and address shown in your documents.</p></div><section className="form-group"><h4>Store identity</h4><div className="photo-upload"><span><UploadCloud /></span><div><strong>Storefront photo</strong><p>JPG or PNG, up to 10 MB</p></div><label className="button button-secondary button-small">Choose image<input type="file" accept="image/png,image/jpeg" hidden /></label></div><label>Pharmacy name<input value={data.pharmacyName} onChange={(event) => setField('pharmacyName', event.target.value)} placeholder="St. Martha Pharmacy" /></label></section><section className="form-group"><h4>Contact &amp; address</h4><div className="form-grid"><label>Contact number<input value={data.contact} onChange={(event) => setField('contact', event.target.value.replace(/[^0-9+ -]/g, ''))} placeholder="+63 917 123 4567" /></label><label>Barangay<select value={data.barangay} onChange={(event) => setField('barangay', event.target.value)}><option value="">Select barangay</option>{BARANGAYS.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field-wide">Full address<textarea rows={3} value={data.address} onChange={(event) => setField('address', event.target.value)} placeholder="Street, barangay, municipality, province, postal code" /></label></div></section></div>;
}

function LocationStep({ data, setField }: { data: RegistrationData; setField: (key: keyof RegistrationData, value: string) => void }) {
  return <div className="step-panel"><div className="step-intro"><h3>Confirm the exact location</h3><p>Patients use this pin for directions to your store.</p></div><div className="map-placeholder onboarding-map"><div className="map-grid" /><span className="map-marker"><b>+</b></span><span className="map-label">{data.address || '123 Care Avenue, Poblacion'}<small>{runtime.hasMapsKey ? 'Interactive map ready' : 'Map preview · Web Maps key required'}</small></span></div><div className="location-details"><label>Confirmed address<div className="input-with-icon"><MapPin size={17} /><input value={data.address} onChange={(event) => setField('address', event.target.value)} placeholder="Search or enter the pharmacy address" /></div></label><button className="button button-secondary" type="button"><LocateFixed size={17} /> Update map location</button></div><details className="coordinate-details"><summary>Technical coordinates</summary><div className="coordinate-grid"><label>Latitude<input value={data.latitude} onChange={(event) => setField('latitude', event.target.value)} /></label><label>Longitude<input value={data.longitude} onChange={(event) => setField('longitude', event.target.value)} /></label></div></details></div>;
}

function HoursStep({ hours, setHours }: { hours: typeof defaultHours; setHours: React.Dispatch<React.SetStateAction<typeof defaultHours>> }) {
  const update = (index: number, patch: Partial<(typeof hours)[number]>) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const copyWeekdays = () => setHours((current) => current.map((item, index) => index < 5 ? { ...item, ...current[0], day: item.day } : item));
  return <div className="step-panel"><div className="step-intro inline"><div><h3>Set weekly operating hours</h3><p>Patients will see these hours on your public pharmacy profile.</p></div><button className="inline-link" onClick={copyWeekdays}><Copy size={15} /> Copy Monday to weekdays</button></div><div className="hours-list">{hours.map((item, index) => <div className={`hours-row ${!item.isOpen ? 'closed' : ''}`} key={item.day}><strong>{item.day}</strong><label className="switch-label"><input type="checkbox" checked={item.isOpen} onChange={(event) => update(index, { isOpen: event.target.checked })} /><span />{item.isOpen ? 'Open' : 'Closed'}</label>{item.isOpen && <><label className="check-label"><input type="checkbox" checked={item.is24Hours} onChange={(event) => update(index, { is24Hours: event.target.checked })} /> 24 hours</label>{!item.is24Hours && <div className="hours-inputs"><input type="time" value={item.open} onChange={(event) => update(index, { open: event.target.value })} /><span>→</span><input type="time" value={item.close} onChange={(event) => update(index, { close: event.target.value })} /></div>}</>}</div>)}</div></div>;
}

function DocumentsStep({ documents, chooseFile, remove }: { documents: Record<string, UploadState>; chooseFile: (key: string, event: ChangeEvent<HTMLInputElement>) => void; remove: (key: string) => void }) {
  const fields = [{ key: 'fda', label: 'FDA License to Operate' }, { key: 'permit', label: 'Business Permit' }, { key: 'prc', label: 'Pharmacist PRC ID' }];
  return <div className="step-panel"><div className="step-intro"><h3>Upload verification documents</h3><p>PDF, JPG, or PNG up to 10 MB. Each file is checked locally before submission.</p></div><div className="document-upload-list">{fields.map((field) => <article key={field.key} className={documents[field.key] ? 'uploaded' : ''}><span className="doc-icon">{documents[field.key] ? <Check /> : <UploadCloud />}</span><div><strong>{field.label}</strong>{documents[field.key] ? <p>{documents[field.key].name} · {documents[field.key].type} · {documents[field.key].size}</p> : <p>Not uploaded</p>}{documents[field.key] && <span className="document-state">Validated locally</span>}</div><div className="document-actions">{documents[field.key] && <a className="inline-link" href={documents[field.key].url} target="_blank" rel="noreferrer"><Eye size={15} /> Preview</a>}<label className="inline-link">{documents[field.key] ? 'Replace' : 'Choose file'}<input type="file" hidden accept=".pdf,image/png,image/jpeg" onChange={(event) => chooseFile(field.key, event)} /></label>{documents[field.key] && <button onClick={() => remove(field.key)}>Remove</button>}</div></article>)}</div><p className="privacy-note"><FileCheck2 size={17} /> Production files remain private and require signed access.</p></div>;
}

function ReviewStep({ data, hours, documents, edit }: { data: RegistrationData; hours: typeof defaultHours; documents: Record<string, UploadState>; edit: (step: number) => void }) {
  const sections = [
    { title: 'Account', summary: data.email, detail: 'Email and password authentication', step: 0 },
    { title: 'Pharmacy', summary: data.pharmacyName, detail: `${data.contact} · ${data.address}, ${data.barangay}`, step: 1 },
    { title: 'Location', summary: 'Map location confirmed', detail: data.address, step: 2 },
    { title: 'Operating hours', summary: `${hours.filter((item) => item.isOpen).length} open days`, detail: 'Weekly schedule configured', step: 3 },
  ];
  return <div className="step-panel"><div className="step-intro"><h3>Review before submission</h3><p>Confirm every section, then submit the pharmacy application.</p></div><div className="review-summary">{sections.map((section) => <section key={section.title}><div><span className="review-label">{section.title}</span><strong>{section.summary}</strong><p>{section.detail}</p></div><button className="inline-link" onClick={() => edit(section.step)}>Edit</button></section>)}<section><div><span className="review-label">Documents</span><strong>{Object.keys(documents).length} files ready</strong><div className="review-docs">{Object.values(documents).map((doc) => <span key={doc.name}><Check size={13} /> {doc.name}</span>)}</div></div><button className="inline-link" onClick={() => edit(4)}>Edit</button></section></div><div className="submission-notice"><FileCheck2 /><div><strong>Ready for review</strong><p>Dashboard access remains locked until the submitted information and documents are approved.</p></div></div></div>;
}
