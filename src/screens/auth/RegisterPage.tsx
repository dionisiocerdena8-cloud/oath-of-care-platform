/* eslint-disable @next/next/no-img-element */
import {
  AlertCircle, ArrowLeft, ArrowRight, CalendarPlus, Check, CheckCircle2, ClipboardCheck,
  Copy, Crosshair, Eye, FileCheck2, FileSearch, ImagePlus, LoaderCircle, LocateFixed,
  MapPin, RefreshCw, ShieldCheck, Trash2, UploadCloud, X,
} from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SocialAuthButton } from '@/src/components/auth/SocialAuthButton';
import { PharmacyLocationMap } from '@/src/components/registration/PharmacyLocationMap';
import { PasswordInput } from '@/src/components/ui/PasswordInput';
import { useToast } from '@/src/components/ui/Toast';
import { defaultHours } from '@/src/data/mockData';
import { analyzeDocumentImage } from '@/src/lib/documentQuality';
import { clearRegistrationDraft, emptyRegistrationData, loadRegistrationDraft, saveRegistrationDraft } from '@/src/lib/registrationDraft';
import { supabase } from '@/src/lib/supabase';
import { EmailOtpVerification } from '@/src/components/auth/EmailOtpVerification';
import { authService } from '@/src/services/authService';
import { pharmacyService } from '@/src/services/pharmacyService';
import type { HolidayException, PharmacyPhotoState, RegistrationData, UploadState } from '@/src/types/registration';

const steps = ['Account', 'Pharmacy', 'Location', 'Operating Hours', 'Documents', 'Business & Review'];
const requiredDocuments = [
  { key: 'fda', label: 'FDA License to Operate', hint: 'Current license showing the pharmacy name and validity period' },
  { key: 'permit', label: 'Business Permit', hint: 'Latest local business permit with all corners visible' },
  { key: 'prc', label: 'Pharmacist PRC ID', hint: 'Front of the supervising pharmacist’s valid PRC ID' },
];

type AccountState = 'idle' | 'creating' | 'ready' | 'confirmation-required';
type GpsState = 'idle' | 'requesting' | 'located' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

const hasValidCoordinates = (data: RegistrationData) => {
  const latitude = Number(data.latitude);
  const longitude = Number(data.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

export function RegisterPage() {
  const restoredDraft = useMemo(() => loadRegistrationDraft(), []);
  const [step, setStep] = useState(restoredDraft?.step ?? 0);
  const [stepDirection, setStepDirection] = useState<'forward' | 'back'>('forward');
  const [data, setData] = useState<RegistrationData>(restoredDraft?.data ?? emptyRegistrationData);
  const [hours, setHours] = useState(restoredDraft?.hours ?? structuredClone(defaultHours));
  const [holidays, setHolidays] = useState<HolidayException[]>(restoredDraft?.holidays ?? []);
  const [documents, setDocuments] = useState<Record<string, UploadState>>(restoredDraft?.documents ?? {});
  const [photo, setPhoto] = useState<PharmacyPhotoState | null>(restoredDraft?.photo ?? null);
  const [accountState, setAccountState] = useState<AccountState>('idle');
  const [showOtp, setShowOtp] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mediaRef = useRef({ photo, documents });
  const { showToast } = useToast();
  const navigate = useNavigate();
  const progress = ((step + 1) / steps.length) * 100;

  useEffect(() => {
    authService.getAccount().then((account) => {
      setData((current) => ({ ...current, email: current.email || account.email }));
      setAccountState('ready');
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setAccountState('ready');
        setShowOtp(false);
        if (step === 0) {
          showToast('Email verified successfully.');
          setStepDirection('forward');
          setStep(1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
    return () => { subscription.unsubscribe(); };
  }, [showToast, step]);

  useEffect(() => {
    const timer = window.setTimeout(() => saveRegistrationDraft({ step, data, hours, holidays, documents, photo }), 180);
    return () => window.clearTimeout(timer);
  }, [data, documents, holidays, hours, photo, step]);

  useEffect(() => { mediaRef.current = { photo, documents }; }, [documents, photo]);

  useEffect(() => () => {
    if (mediaRef.current.photo?.url) URL.revokeObjectURL(mediaRef.current.photo.url);
    Object.values(mediaRef.current.documents).forEach((document) => { if (document.url) URL.revokeObjectURL(document.url); });
  }, []);

  useEffect(() => {
    const extracted = Object.values(documents).flatMap((document) => document.extractedFields ? [document.extractedFields] : []);
    if (!extracted.length) return;
    setData((current) => {
      const next = { ...current };
      extracted.forEach((candidate) => Object.entries(candidate).forEach(([key, value]) => {
        const field = key as keyof RegistrationData;
        if (!next[field] && typeof value === 'string') (next as unknown as Record<string, unknown>)[field] = value;
      }));
      return next;
    });
  }, [documents]);

  const setField = (key: keyof RegistrationData, value: string | number | null) => {
    setData((current) => ({ ...current, [key]: value }));
    if (step === 0 && (key === 'email' || key === 'password')) setAccountState('idle');
  };

  const canContinue = useMemo(() => {
    if (step === 0) return data.email.includes('@') && (accountState === 'ready' || (data.password.length >= 8 && /[A-Z]/.test(data.password) && /[a-z]/.test(data.password) && /\d/.test(data.password) && /[^A-Za-z0-9]/.test(data.password) && data.password === data.confirmPassword));
    if (step === 1) return Boolean(data.pharmacyName.trim() && data.contact.trim());
    if (step === 2) return hasValidCoordinates(data) && Boolean(data.locationConfirmedAt);
    if (step === 4) return requiredDocuments.every(({ key }) => documents[key]?.url && documents[key].status !== 'checking');
    if (step === 5) return Boolean(data.businessName.trim() && data.businessType && data.registrationNo.trim() && data.permitNo.trim() && data.tin.trim());
    return true;
  }, [accountState, data, documents, step]);

  const createAccountIfNeeded = async () => {
    if (accountState === 'ready') return true;
    if (accountState === 'confirmation-required') {
      setShowOtp(true);
      return false;
    }
    setAccountState('creating');
    try {
      const result = await authService.signUpWithPassword(data.email, data.password);
      if (result.requiresEmailConfirmation) {
        setAccountState('confirmation-required');
        setShowOtp(true);
        showToast('Check your inbox for the 6-digit verification code.');
        return false;
      }
      setAccountState('ready');
      showToast('Account details are ready.');
      return true;
    } catch (error) {
      setAccountState('idle');
      showToast(error instanceof Error ? error.message : 'Account setup failed.', 'error');
      return false;
    }
  };

  const next = async () => {
    if (!canContinue) {
      const message = step === 2 ? 'Place the pin and confirm the pharmacy location before continuing.' : step === 4 ? 'Select all required documents and let the quality checks finish.' : 'Complete the required information before continuing.';
      showToast(message, 'error');
      return;
    }
    if (step === 0 && !(await createAccountIfNeeded())) return;
    if (step >= 1) {
      try { await pharmacyService.saveApplicationDraft({ data, hours, holidays }); }
      catch (error) { showToast(error instanceof Error ? error.message : 'The application draft could not be saved.', 'error'); return; }
    }
    setStepDirection('forward');
    setStep((value) => Math.min(value + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (target: number) => {
    setReviewMode(false);
    setStepDirection(target < step ? 'back' : 'forward');
    setStep(Math.max(0, Math.min(target, steps.length - 1)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (reviewMode) {
      setReviewMode(false);
      return;
    }
    if (step === 0) {
      navigate('/');
      return;
    }
    goToStep(step - 1);
  };

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return showToast('Choose a JPG, PNG, or WebP image.', 'error');
    if (file.size > 10 * 1024 * 1024) return showToast('Choose an image smaller than 10 MB.', 'error');
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto({ name: file.name, type: file.type, sizeBytes: file.size, url: URL.createObjectURL(file) });
  };

  const chooseFile = async (key: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) return showToast('Choose a PDF, JPG, or PNG document.', 'error');
    if (!file.size || file.size > 10 * 1024 * 1024) return showToast('Choose a non-empty file smaller than 10 MB.', 'error');
    if (documents[key]?.url) URL.revokeObjectURL(documents[key].url);
    const base: UploadState = {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
      sizeBytes: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      progress: 18,
      status: 'checking',
      extractionStatus: 'not-configured',
      file,
    };
    setDocuments((current) => ({ ...current, [key]: base }));
    try {
      if (file.type.startsWith('image/')) {
        setDocuments((current) => ({ ...current, [key]: { ...current[key], progress: 58 } }));
        const quality = await analyzeDocumentImage(file);
        setDocuments((current) => ({
          ...current,
          [key]: { ...current[key], progress: 100, quality, status: quality.warnings.length ? 'needs-clearer-image' : 'quality-complete' },
        }));
        showToast(quality.warnings.length ? 'Quality check finished with recommendations.' : 'Image quality check completed.');
      } else {
        setDocuments((current) => ({ ...current, [key]: { ...current[key], progress: 100, status: 'quality-complete', extractionStatus: 'not-configured' } }));
        showToast('PDF prepared. Text extraction needs a configured OCR service.');
      }
    } catch (error) {
      setDocuments((current) => ({ ...current, [key]: { ...current[key], progress: 100, status: 'needs-clearer-image', quality: { width: 0, height: 0, brightness: 0, sharpness: 0, warnings: [error instanceof Error ? error.message : 'Image quality checks could not finish.'] } } }));
    }
  };

  const removeDocument = (key: string) => setDocuments((current) => {
    if (current[key]?.url) URL.revokeObjectURL(current[key].url);
    const nextDocuments = { ...current };
    delete nextDocuments[key];
    return nextDocuments;
  });

  const providerLogin = async (provider: 'google' | 'facebook') => {
    try { await authService.signInWithProvider(provider, `${window.location.origin}/register`); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Authentication failed.', 'error'); }
  };

  const submit = async () => {
    if (!canContinue) return showToast('Complete the required business details before review.', 'error');
    if (!requiredDocuments.every(({ key }) => documents[key]?.url)) {
      showToast('Select the required local files again before submitting.', 'error');
      goToStep(4);
      return;
    }
    if (!hasValidCoordinates(data) || !data.locationConfirmedAt) {
      showToast('Confirm the pharmacy pin before submitting.', 'error');
      goToStep(2);
      return;
    }
    setIsSubmitting(true);
    try {
      await pharmacyService.submitApplication({ data, hours, holidays, documents });
      clearRegistrationDraft();
      showToast('Application submitted for admin review.');
      navigate('/application-status');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Submission failed.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`register-card register-step-${step + 1}`}>
      <header className="register-heading">
        <button type="button" className="onboarding-back" onClick={goBack}><ArrowLeft size={17} /> Back</button>
        <div><span className="auth-context">Pharmacy onboarding</span><h2>{steps[step]}</h2><p>Step {step + 1} of {steps.length}{reviewMode ? ' · Final review' : ''}</p></div>
        <span className="draft-indicator"><CheckCircle2 size={14} /> Draft saved</span>
      </header>
      <div className="progress-track" role="progressbar" aria-label={`Step ${step + 1} of ${steps.length}`} aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1}><span style={{ width: `${progress}%` }} /></div>
      <ol className="stepper" aria-label="Registration steps">{steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={index === step ? 'current' : index < step ? 'complete' : ''}><span>{index < step ? <Check size={13} /> : index + 1}</span><small>{label}</small></li>)}</ol>
      {restoredDraft && <div className="draft-restored"><RefreshCw size={14} /> Saved answers restored. For privacy, local files must be selected again after a page refresh.</div>}

      <div className={`registration-body step-direction-${stepDirection}`} key={`${step}-${reviewMode ? 'review' : 'form'}`}>
        {step === 0 && <AccountStep data={data} setField={setField} providerLogin={providerLogin} accountState={accountState} onOpenOtp={() => setShowOtp(true)} />}
        {step === 1 && <PharmacyStep data={data} setField={setField} photo={photo} choosePhoto={choosePhoto} removePhoto={() => { if (photo?.url) URL.revokeObjectURL(photo.url); setPhoto(null); }} />}
        {step === 2 && <LocationStep data={data} setField={setField} />}
        {step === 3 && <HoursStep hours={hours} setHours={setHours} holidays={holidays} setHolidays={setHolidays} />}
        {step === 4 && <DocumentsStep documents={documents} chooseFile={chooseFile} remove={removeDocument} />}
        {step === 5 && !reviewMode && <BusinessStep data={data} setField={setField} documents={documents} />}
        {step === 5 && reviewMode && <ReviewStep data={data} hours={hours} holidays={holidays} documents={documents} edit={goToStep} />}
      </div>

      <footer className="register-footer">
        {step < steps.length - 1 && <button type="button" className="button" onClick={() => void next()}>Continue <ArrowRight size={17} /></button>}
        {step === steps.length - 1 && !reviewMode && <button type="button" className="button" onClick={() => canContinue ? setReviewMode(true) : showToast('Complete the required business details before review.', 'error')}>Review application <ClipboardCheck size={17} /></button>}
        {step === steps.length - 1 && reviewMode && <button type="button" className="button" onClick={() => void submit()} disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="spin" size={17} /> Submitting…</> : <>Submit application <FileCheck2 size={17} /></>}</button>}
      </footer>

      {showOtp && (
        <EmailOtpVerification
          email={data.email}
          onVerified={() => {
            setAccountState('ready');
            setShowOtp(false);
            showToast('Email verified successfully.');
            setStepDirection('forward');
            setStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onCancel={() => {
            setShowOtp(false);
            setAccountState('idle');
          }}
        />
      )}
    </div>
  );
}

function AccountStep({
  data,
  setField,
  providerLogin,
  accountState,
  onOpenOtp,
}: {
  data: RegistrationData;
  setField: (key: keyof RegistrationData, value: string) => void;
  providerLogin: (provider: 'google' | 'facebook') => void;
  accountState: AccountState;
  onOpenOtp: () => void;
}) {
  const [confirmTouched, setConfirmTouched] = useState(false);
  const mismatch = confirmTouched && Boolean(data.confirmPassword) && data.password !== data.confirmPassword;
  const requirements = [
    { label: '8+ characters', met: data.password.length >= 8 },
    { label: 'Upper and lowercase', met: /[A-Z]/.test(data.password) && /[a-z]/.test(data.password) },
    { label: 'Number and symbol', met: /\d/.test(data.password) && /[^A-Za-z0-9]/.test(data.password) },
  ];
  return (
    <div className="step-panel account-step">
      <div className="step-intro">
        <h3>Create the account owner</h3>
        <p>Use the email that will receive application and compliance updates.</p>
      </div>
      <div className="provider-stack horizontal">
        <SocialAuthButton provider="google" onClick={() => providerLogin('google')} />
        <SocialAuthButton provider="facebook" onClick={() => providerLogin('facebook')} />
      </div>
      <div className="divider"><span>or use email</span></div>
      <div className="account-fields compact-account-fields">
        <label className="field-wide">
          Email address
          <input
            type="email"
            value={data.email}
            onChange={(event) => setField('email', event.target.value)}
            placeholder="name@example.com"
            autoComplete="email"
            required
          />
        </label>
        <PasswordInput
          label="Password"
          value={data.password}
          onChange={(event) => setField('password', event.target.value)}
          placeholder="Create a password"
          minLength={8}
          autoComplete="new-password"
          required
        />
        <PasswordInput
          label="Confirm password"
          value={data.confirmPassword}
          onChange={(event) => setField('confirmPassword', event.target.value)}
          onBlur={() => setConfirmTouched(true)}
          placeholder="Re-enter password"
          minLength={8}
          autoComplete="new-password"
          required
          error={mismatch ? 'Passwords do not match.' : undefined}
        />
      </div>
      {data.password && (
        <div className="password-requirements compact">
          {requirements.map((requirement) => (
            <span key={requirement.label} className={requirement.met ? 'requirement-met' : 'requirement-pending'}>
              <Check size={13} /> {requirement.label}
            </span>
          ))}
        </div>
      )}
      {accountState === 'confirmation-required' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 16px', borderRadius: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '13px', lineHeight: 1.4 }}>Verification code sent to <strong>{data.email}</strong></span>
          </div>
          <button type="button" className="button button-small" onClick={onOpenOtp}>
            Enter 6-digit code
          </button>
        </div>
      )}
      <p className="auth-switch account-sign-in">Already have an account? <Link to="/login">Sign in</Link></p>
    </div>
  );
}

function PharmacyStep({ data, setField, photo, choosePhoto, removePhoto }: { data: RegistrationData; setField: (key: keyof RegistrationData, value: string) => void; photo: PharmacyPhotoState | null; choosePhoto: (event: ChangeEvent<HTMLInputElement>) => void; removePhoto: () => void }) {
  return <div className="step-panel"><div className="step-intro"><h3>Introduce your pharmacy</h3><p>Only the public name and essential contact details are needed here.</p></div><section className="form-group compact-section"><div className={`photo-upload compact-photo-upload ${photo?.url ? 'has-preview' : ''}`}>{photo?.url ? <img src={photo.url} alt="Selected pharmacy preview" /> : <span><ImagePlus /></span>}<div><strong>{photo?.name || 'Logo or storefront photo'}</strong><p>{photo?.url ? 'Image preview · replace anytime' : 'JPG, PNG, or WebP · up to 10 MB'}</p></div><label className="button button-secondary button-small">{photo?.url ? 'Replace' : 'Choose image'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={choosePhoto} /></label>{photo && <button type="button" className="icon-button subtle" onClick={removePhoto} aria-label="Remove pharmacy image"><X size={16} /></button>}</div><div className="form-grid"><label>Pharmacy name<input value={data.pharmacyName} onChange={(event) => setField('pharmacyName', event.target.value)} placeholder="St. Martha Pharmacy" /></label><label>Contact number<input value={data.contact} onChange={(event) => setField('contact', event.target.value.replace(/[^0-9+ ()-]/g, ''))} placeholder="+63 917 123 4567" /></label><label className="field-wide">Contact email <span className="optional-label">Optional if same as account email</span><input type="email" value={data.contactEmail} onChange={(event) => setField('contactEmail', event.target.value)} placeholder={data.email || 'pharmacy@example.com'} /></label></div></section></div>;
}

function LocationStep({ data, setField }: { data: RegistrationData; setField: (key: keyof RegistrationData, value: string | number | null) => void }) {
  const [gpsState, setGpsState] = useState<GpsState>('idle');
  const [tileError, setTileError] = useState(false);
  const latitude = data.latitude ? Number(data.latitude) : null;
  const longitude = data.longitude ? Number(data.longitude) : null;
  const positionValid = hasValidCoordinates(data);
  const updatePosition = (nextLatitude: number, nextLongitude: number, source: 'gps' | 'manual', accuracy: number | null = null) => {
    setField('latitude', nextLatitude.toFixed(6));
    setField('longitude', nextLongitude.toFixed(6));
    setField('locationSource', source);
    setField('locationAccuracy', accuracy);
    setField('locationConfirmedAt', '');
  };
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setGpsState('unsupported'); return; }
    setGpsState('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updatePosition(position.coords.latitude, position.coords.longitude, 'gps', Math.round(position.coords.accuracy));
        setGpsState('located');
      },
      (error) => setGpsState(error.code === error.PERMISSION_DENIED ? 'denied' : error.code === error.TIMEOUT ? 'timeout' : 'unavailable'),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };
  const messages: Partial<Record<GpsState, string>> = {
    denied: 'Location permission was denied. Click the map to place the pharmacy pin manually.',
    unavailable: 'Your location is unavailable. Place the pin manually or try again near the pharmacy.',
    timeout: 'The GPS request timed out. Try again or place the pin manually.',
    unsupported: 'This browser does not support location capture. Place the pin manually.',
  };
  return <div className="step-panel"><div className="step-intro location-intro"><div><h3>Pin the pharmacy location</h3><p>Use GPS only while physically at the pharmacy, or click the map to place the pin manually.</p></div><button type="button" className="button gps-button" onClick={useCurrentLocation} disabled={gpsState === 'requesting'}>{gpsState === 'requesting' ? <LoaderCircle className="spin" /> : <LocateFixed />} {gpsState === 'requesting' ? 'Finding location…' : 'Use My Current Location'}</button></div>{messages[gpsState] && <div className="location-alert"><AlertCircle /> <span>{messages[gpsState]}</span></div>}{data.locationAccuracy !== null && data.locationAccuracy > 100 && <div className="location-alert warning"><Crosshair /> <span>Reported accuracy is ±{data.locationAccuracy} m. Inspect the pin and adjust it before confirming.</span></div>}<div className="location-map-shell"><PharmacyLocationMap latitude={Number.isFinite(latitude) ? latitude : null} longitude={Number.isFinite(longitude) ? longitude : null} onPositionChange={(lat, lng) => updatePosition(lat, lng, 'manual')} onTileError={() => setTileError(true)} />{tileError && <div className="tile-warning">Map tiles are temporarily unavailable. Your coordinates can still be confirmed.</div>}</div><div className="location-details"><div className="coordinate-readout"><span><small>Latitude</small><strong>{data.latitude || 'Not set'}</strong></span><span><small>Longitude</small><strong>{data.longitude || 'Not set'}</strong></span><span><small>Source</small><strong>{data.locationSource === 'gps' ? `GPS${data.locationAccuracy ? ` · ±${data.locationAccuracy} m` : ''}` : data.locationSource === 'manual' ? 'Manual pin' : 'Not set'}</strong></span></div><label>Short address note <span className="optional-label">Optional</span><input value={data.conciseAddress} onChange={(event) => setField('conciseAddress', event.target.value)} placeholder="Street or nearby landmark" /></label><button type="button" className={`button confirm-location ${data.locationConfirmedAt ? 'confirmed' : ''}`} disabled={!positionValid} onClick={() => setField('locationConfirmedAt', new Date().toISOString())}>{data.locationConfirmedAt ? <><CheckCircle2 /> Location confirmed</> : <><MapPin /> Confirm this pharmacy pin</>}</button></div><p className="map-policy">Pin confirmation records the submitted coordinates; it is not legal verification of the pharmacy address.</p></div>;
}

function HoursStep({ hours, setHours, holidays, setHolidays }: { hours: typeof defaultHours; setHours: React.Dispatch<React.SetStateAction<typeof defaultHours>>; holidays: HolidayException[]; setHolidays: React.Dispatch<React.SetStateAction<HolidayException[]>> }) {
  const update = (index: number, patch: Partial<(typeof hours)[number]>) => setHours((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const copyWeekdays = () => setHours((current) => current.map((item, index) => index < 5 ? { ...item, ...current[0], day: item.day } : item));
  const addHoliday = () => setHolidays((current) => [...current, { id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`, date: '', isClosed: true, open: '09:00', close: '17:00' }]);
  const updateHoliday = (id: string, patch: Partial<HolidayException>) => setHolidays((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  return <div className="step-panel"><div className="step-intro inline"><div><h3>Set operating hours</h3><p>Keep the weekly schedule current and add known holiday exceptions.</p></div><button type="button" className="inline-link" onClick={copyWeekdays}><Copy size={15} /> Copy Monday to weekdays</button></div><div className="hours-list">{hours.map((item, index) => <div className={`hours-row ${!item.isOpen ? 'closed' : ''}`} key={item.day}><strong>{item.day}</strong><label className="switch-label"><input type="checkbox" checked={item.isOpen} onChange={(event) => update(index, { isOpen: event.target.checked })} /><span />{item.isOpen ? 'Open' : 'Closed'}</label>{item.isOpen && <><label className="check-label"><input type="checkbox" checked={item.is24Hours} onChange={(event) => update(index, { is24Hours: event.target.checked })} /> 24 hours</label>{!item.is24Hours && <div className="hours-inputs"><input aria-label={`${item.day} opening time`} type="time" value={item.open} onChange={(event) => update(index, { open: event.target.value })} /><span>to</span><input aria-label={`${item.day} closing time`} type="time" value={item.close} onChange={(event) => update(index, { close: event.target.value })} /></div>}</>}</div>)}</div><section className="holiday-section"><header><div><h4>Holiday exceptions</h4><p>Optional dates that differ from the weekly schedule.</p></div><button type="button" className="button button-secondary button-small" onClick={addHoliday}><CalendarPlus size={15} /> Add date</button></header>{holidays.length === 0 ? <p className="holiday-empty">No holiday exceptions added.</p> : <div className="holiday-list">{holidays.map((holiday) => <div key={holiday.id} className="holiday-row"><input aria-label="Holiday date" type="date" value={holiday.date} onChange={(event) => updateHoliday(holiday.id, { date: event.target.value })} /><label className="switch-label"><input type="checkbox" checked={!holiday.isClosed} onChange={(event) => updateHoliday(holiday.id, { isClosed: !event.target.checked })} /><span />{holiday.isClosed ? 'Closed' : 'Open'}</label>{!holiday.isClosed && <div className="hours-inputs"><input aria-label="Holiday opening time" type="time" value={holiday.open} onChange={(event) => updateHoliday(holiday.id, { open: event.target.value })} /><span>to</span><input aria-label="Holiday closing time" type="time" value={holiday.close} onChange={(event) => updateHoliday(holiday.id, { close: event.target.value })} /></div>}<button type="button" className="icon-button subtle" aria-label="Remove holiday exception" onClick={() => setHolidays((current) => current.filter((item) => item.id !== holiday.id))}><Trash2 size={15} /></button></div>)}</div>}</section></div>;
}

function DocumentsStep({ documents, chooseFile, remove }: { documents: Record<string, UploadState>; chooseFile: (key: string, event: ChangeEvent<HTMLInputElement>) => void; remove: (key: string) => void }) {
  return <div className="step-panel"><div className="step-intro"><h3>Prepare verification documents</h3><p>Files stay in the compliance workflow. Quality checks improve readability but do not verify authenticity.</p></div><div className="document-upload-list professional">{requiredDocuments.map((field) => {
    const document = documents[field.key];
    const needsAttention = document?.status === 'needs-clearer-image' || document?.status === 'reselection-required';
    return <article key={field.key} className={document ? `uploaded ${needsAttention ? 'needs-attention' : ''}` : ''}><span className="doc-icon">{document?.status === 'checking' ? <LoaderCircle className="spin" /> : document ? <FileSearch /> : <UploadCloud />}</span><div className="document-copy"><strong>{field.label}</strong><p>{document ? `${document.name} · ${document.size || document.type}` : field.hint}</p>{document?.status === 'checking' && <span className="document-state checking">Checking image quality…</span>}{document?.status === 'quality-complete' && <span className="document-state"><Check size={12} /> Quality check completed</span>}{document?.status === 'needs-clearer-image' && <span className="document-state warning"><AlertCircle size={12} /> Needs a clearer image</span>}{document?.status === 'reselection-required' && <span className="document-state warning"><RefreshCw size={12} /> Select this local file again</span>}{document?.quality?.warnings.map((warning) => <small className="quality-warning" key={warning}>{warning}</small>)}{document && <span className="extraction-state">OCR: {document.extractionStatus === 'information-extracted' ? 'information extracted for review' : 'manual entry fallback'}</span>}{document?.status === 'checking' && <div className="upload-progress"><span style={{ width: `${document.progress}%` }} /></div>}</div><div className="document-actions">{document?.url && <a className="inline-link" href={document.url} target="_blank" rel="noreferrer"><Eye size={15} /> Preview</a>}<label className="inline-link">{document ? 'Replace' : 'Choose file'}<input type="file" hidden accept=".pdf,image/png,image/jpeg" onChange={(event) => void chooseFile(field.key, event)} /></label>{document && <button type="button" onClick={() => remove(field.key)}>Remove</button>}</div></article>;
  })}</div><p className="privacy-note"><ShieldCheck size={17} /> “Quality check completed” means readable enough for review—not genuine, approved, or verified. Only an authorized admin can verify credentials.</p></div>;
}

function BusinessStep({ data, setField, documents }: { data: RegistrationData; setField: (key: keyof RegistrationData, value: string) => void; documents: Record<string, UploadState> }) {
  const extractedCount = Object.values(documents).filter((document) => document.extractionStatus === 'information-extracted').length;
  return <div className="step-panel"><div className="step-intro"><h3>Complete official business details</h3><p>Use the exact information on the submitted registrations and permits. You can correct any extracted value.</p></div><div className={`extraction-summary ${extractedCount ? 'has-data' : ''}`}><FileSearch /><div><strong>{extractedCount ? `${extractedCount} document${extractedCount > 1 ? 's' : ''} supplied candidate information` : 'Manual entry is active'}</strong><p>{extractedCount ? 'Review every prefilled field before submission. Extracted text is not trusted automatically.' : 'No OCR service is configured, so the app will not invent or simulate extracted credentials.'}</p></div></div><section className="form-group compact-section"><div className="form-grid business-grid"><label>Registered business name<input value={data.businessName} onChange={(event) => setField('businessName', event.target.value)} placeholder="St. Martha Drug Corporation" /></label><label>Business type<select value={data.businessType} onChange={(event) => setField('businessType', event.target.value)}><option value="">Select type</option><option>Sole proprietorship</option><option>Partnership</option><option>Corporation</option><option>Cooperative</option></select></label><label>DTI / SEC registration no.<input value={data.registrationNo} onChange={(event) => setField('registrationNo', event.target.value)} autoComplete="off" /></label><label>Pharmacy permit no.<input value={data.permitNo} onChange={(event) => setField('permitNo', event.target.value)} autoComplete="off" /></label><label>Tax identification no.<input value={data.tin} onChange={(event) => setField('tin', event.target.value)} inputMode="numeric" autoComplete="off" /></label><label>Contact person <span className="optional-label">If required</span><input value={data.contactPerson} onChange={(event) => setField('contactPerson', event.target.value)} /></label><label className="field-wide">Registered business address <span className="optional-label">As shown on documents</span><input value={data.registeredAddress} onChange={(event) => setField('registeredAddress', event.target.value)} /></label></div></section><p className="info-note"><FileCheck2 size={17} /> These values remain pending admin review. Matching text does not prove a document is authentic.</p></div>;
}

function ReviewStep({ data, hours, holidays, documents, edit }: { data: RegistrationData; hours: typeof defaultHours; holidays: HolidayException[]; documents: Record<string, UploadState>; edit: (step: number) => void }) {
  const sections = [
    { title: 'Account', summary: data.email, detail: 'Account owner and authentication', step: 0 },
    { title: 'Pharmacy', summary: data.pharmacyName, detail: `${data.contact}${data.contactEmail ? ` · ${data.contactEmail}` : ''}`, step: 1 },
    { title: 'Location', summary: `${data.latitude}, ${data.longitude}`, detail: `${data.locationSource === 'gps' ? 'GPS capture' : 'Manual pin'}${data.conciseAddress ? ` · ${data.conciseAddress}` : ''}`, step: 2 },
    { title: 'Operating hours', summary: `${hours.filter((item) => item.isOpen).length} open days`, detail: `${holidays.length} holiday exception${holidays.length === 1 ? '' : 's'}`, step: 3 },
    { title: 'Business', summary: data.businessName, detail: `${data.businessType} · ${data.registrationNo}`, step: 5 },
  ];
  return <div className="step-panel review-panel"><div className="step-intro"><h3>Review and submit</h3><p>Confirm the six sections below. Submission starts admin review—it does not approve the pharmacy.</p></div><div className="review-summary">{sections.map((section) => <section key={section.title}><div><span className="review-label">{section.title}</span><strong>{section.summary}</strong><p>{section.detail}</p></div><button type="button" className="inline-link" onClick={() => edit(section.step)}>Edit</button></section>)}<section><div><span className="review-label">Documents</span><strong>{Object.keys(documents).length} files prepared</strong><div className="review-docs">{requiredDocuments.map(({ key, label }) => <span key={key} className={documents[key]?.status === 'needs-clearer-image' ? 'warning' : ''}>{documents[key]?.status === 'needs-clearer-image' ? <AlertCircle size={13} /> : <Check size={13} />} {label}</span>)}</div></div><button type="button" className="inline-link" onClick={() => edit(4)}>Edit</button></section></div><div className="submission-notice"><FileCheck2 /><div><strong>Ready to enter the review queue</strong><p>Access remains pending until an authorized admin reviews the pharmacy and its credentials.</p></div></div></div>;
}
