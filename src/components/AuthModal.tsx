import React, { useState } from 'react';
import { Building2, CheckCircle2, KeyRound, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import type { CandidateProfile, CompanyAccount, Sector } from '../shared/types';
import { SafalLogo } from './SafalLogo';

interface AuthModalProps {
  isOpen: boolean;
  initialTab?: 'candidate' | 'company';
  onClose: () => void;
  onCandidateSuccess: (token: string, candidate: CandidateProfile) => void;
  onCompanySuccess: (token: string, company: CompanyAccount) => void;
}

const SECTORS: Sector[] = [
  'BPO & Customer Support',
  'IT & Software',
  'Banking & Finance',
  'Sales & Retail',
  'Logistics & Operations',
  'Healthcare & Pharma',
  'Manufacturing & Engineering',
  'EdTech & Training',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialTab = 'candidate',
  onClose,
  onCandidateSuccess,
  onCompanySuccess,
}) => {
  const [roleTab, setRoleTab] = useState<'candidate' | 'company'>(initialTab);
  const [companyMode, setCompanyMode] = useState<'login' | 'register'>('register');

  // Candidate OTP state
  const [identifier, setIdentifier] = useState('');
  const [otpSentTo, setOtpSentTo] = useState<{
    identifier: string;
    masked: string;
    channel: 'mobile' | 'email';
    instantOtpCode?: string;
  } | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // Company Login state
  const [compLoginEmail, setCompLoginEmail] = useState('');
  const [compLoginPassword, setCompLoginPassword] = useState('');

  // Company Full KYC Registration state
  const [legalName, setLegalName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [gstin, setGstin] = useState('');
  const [cinOrRegNo, setCinOrRegNo] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [hrMobile, setHrMobile] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [city, setCity] = useState('Gurugram');
  const [sector, setSector] = useState<Sector>('BPO & Customer Support');
  const [companySize, setCompanySize] = useState('50–200 employees');
  const [website, setWebsite] = useState('');
  const [hrName, setHrName] = useState('');
  const [hrDesignation, setHrDesignation] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not send OTP.');
      } else {
        setOtpSentTo({
          identifier: data.identifier,
          masked: data.maskedTarget,
          channel: data.channel,
          instantOtpCode: data.instantOtpCode,
        });
      }
    } catch {
      setError('Network error while sending OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpSentTo) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: otpSentTo.identifier, otp: otpInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'OTP verification failed.');
      } else {
        onCandidateSuccess(data.token, data.candidate);
        onClose();
      }
    } catch {
      setError('Network error while verifying OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/company/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ officialEmail: compLoginEmail, password: compLoginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Company login failed.');
      } else {
        onCompanySuccess(data.token, data.company);
        onClose();
      }
    } catch {
      setError('Network error during company sign-in.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/company/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          brandName,
          gstin,
          cinOrRegNo,
          officialEmail,
          hrMobile,
          officeAddress,
          city,
          sector,
          companySize,
          website,
          hrName,
          hrDesignation,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Company verification failed.');
      } else {
        onCompanySuccess(data.token, data.company);
        onClose();
      }
    } catch {
      setError('Network error during company registration.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoEmployer = () => {
    setCompanyMode('login');
    setCompLoginEmail('hr@meridianbpo.in');
    setCompLoginPassword('SafalDemo@2026');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <SafalLogo size={28} showOwner />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign in dialog"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setRoleTab('candidate');
                setError('');
              }}
              className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                roleTab === 'candidate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Candidate (Free OTP Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setRoleTab('company');
                setError('');
              }}
              className={`rounded-md px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
                roleTab === 'company'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Company Verification &amp; Login
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {roleTab === 'candidate' ? (
            <div className="mt-6">
              <div className="mb-5 border-b border-slate-200 pb-4">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Candidate OTP Sign In — ₹0 Forever Free
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  No password or payment needed. Enter your Indian mobile number or email to verify with a 6-digit OTP.
                </p>
              </div>

              {!otpSentTo ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div>
                    <label htmlFor="otp-identifier" className="block text-sm font-medium text-slate-800">
                      Mobile Number or Email Address
                    </label>
                    <div className="relative mt-1.5">
                      <input
                        id="otp-identifier"
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. 9876543210 or name@gmail.com"
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-700/15"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> 10-digit Mobile (+91)
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> Personal Email
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
                  >
                    {loading ? 'Sending OTP...' : 'Send 6-Digit OTP'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          OTP sent via {otpSentTo.channel === 'mobile' ? 'SMS' : 'Email'} to {otpSentTo.masked}
                        </p>
                        {otpSentTo.instantOtpCode && (
                          <p className="mt-1 text-xs text-emerald-800">
                            Instant Verification Code:{' '}
                            <span className="font-mono text-sm font-bold tracking-wider">
                              {otpSentTo.instantOtpCode}
                            </span>
                          </p>
                        )}
                      </div>
                      {otpSentTo.instantOtpCode && (
                        <button
                          type="button"
                          onClick={() => setOtpInput(otpSentTo.instantOtpCode || '')}
                          className="shrink-0 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Auto-fill OTP
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="otp-code" className="block text-sm font-medium text-slate-800">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      id="otp-code"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="123456"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-3 font-mono text-lg tracking-[0.35em] text-slate-900 focus:border-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-700/15"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOtpSentTo(null);
                        setOtpInput('');
                        setError('');
                      }}
                      className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Change Number/Email
                    </button>
                    <button
                      type="submit"
                      disabled={loading || otpInput.length !== 6}
                      className="flex-1 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:opacity-60"
                    >
                      {loading ? 'Verifying...' : 'Verify OTP & Continue'}
                    </button>
                  </div>
                </form>
              )}

              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-200 pt-5 text-xs text-slate-600 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>₹0 Fees Forever</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Upfront Salary &amp; Shift</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Online Video Interviews</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-slate-900">
                    Verified Company Portal (Lowest Fee: ₹99/post)
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Full company KYC details (GSTIN, CIN, office address, HR contact) are mandatory to protect candidates.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyMode(companyMode === 'register' ? 'login' : 'register');
                      setError('');
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {companyMode === 'register' ? 'Already Verified? Sign In' : 'New Company KYC'}
                  </button>
                  <button
                    type="button"
                    onClick={fillDemoEmployer}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Use Demo Employer
                  </button>
                </div>
              </div>

              {companyMode === 'login' ? (
                <form onSubmit={handleCompanyLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-800">Official Company Email</label>
                    <input
                      type="email"
                      required
                      value={compLoginEmail}
                      onChange={(e) => setCompLoginEmail(e.target.value)}
                      placeholder="hr@company.in"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-700 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-800">Account Password</label>
                    <input
                      type="password"
                      required
                      value={compLoginPassword}
                      onChange={(e) => setCompLoginPassword(e.target.value)}
                      placeholder="Enter password"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-indigo-700 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    {loading ? 'Signing In...' : 'Sign In to Employer Dashboard'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCompanyRegister} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Registered Legal Name *</label>
                      <input
                        type="text"
                        required
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Apex BPO Services Pvt. Ltd."
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Brand / Hiring Name *</label>
                      <input
                        type="text"
                        required
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="e.g. Apex CX"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">15-Digit GSTIN *</label>
                      <input
                        type="text"
                        required
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase())}
                        placeholder="07AABCM4821K1Z5"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">CIN / MSME Udyam Reg. No. *</label>
                      <input
                        type="text"
                        required
                        value={cinOrRegNo}
                        onChange={(e) => setCinOrRegNo(e.target.value.toUpperCase())}
                        placeholder="U72900DL2021PTC123456"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm uppercase focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Official HR Email *</label>
                      <input
                        type="email"
                        required
                        value={officialEmail}
                        onChange={(e) => setOfficialEmail(e.target.value)}
                        placeholder="talent@yourcompany.in"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">HR Direct Mobile (10 digits) *</label>
                      <input
                        type="tel"
                        required
                        value={hrMobile}
                        onChange={(e) => setHrMobile(e.target.value)}
                        placeholder="9876543210"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Primary Industry Sector *</label>
                      <select
                        value={sector}
                        onChange={(e) => setSector(e.target.value as Sector)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      >
                        {SECTORS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Headquarters City *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Gurugram"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">Registered Office Address *</label>
                      <input
                        type="text"
                        required
                        value={officeAddress}
                        onChange={(e) => setOfficeAddress(e.target.value)}
                        placeholder="Building, Floor, Sector / Industrial Estate, PIN"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Company Website *</label>
                      <input
                        type="url"
                        required
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yourcompany.in"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Employee Count *</label>
                      <select
                        value={companySize}
                        onChange={(e) => setCompanySize(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      >
                        <option value="10–50 employees">10–50 employees</option>
                        <option value="50–200 employees">50–200 employees</option>
                        <option value="200–500 employees">200–500 employees</option>
                        <option value="500–1,000 employees">500–1,000 employees</option>
                        <option value="1,000+ employees">1,000+ employees</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Authorized HR Name *</label>
                      <input
                        type="text"
                        required
                        value={hrName}
                        onChange={(e) => setHrName(e.target.value)}
                        placeholder="Priya Nair"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">HR Designation *</label>
                      <input
                        type="text"
                        required
                        value={hrDesignation}
                        onChange={(e) => setHrDesignation(e.target.value)}
                        placeholder="Senior Talent Manager"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700">Create Account Password (min 8 chars) *</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-700 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {loading ? 'Verifying Company KYC...' : 'Verify Company Data & Continue'}
                  </button>
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                    <Building2 className="h-3.5 w-3.5" />
                    Zero spam policy: Only GSTIN/CIN-verified companies can publish vacancies.
                  </p>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
