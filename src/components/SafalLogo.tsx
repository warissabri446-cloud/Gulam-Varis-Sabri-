import React from 'react';

interface JobSarathiLogoProps {
  className?: string;
  size?: number;
  showOwner?: boolean;
}

export const JobSarathiLogo: React.FC<JobSarathiLogoProps> = ({
  className = '',
  size = 32,
  showOwner = false,
}) => {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Deep sapphire crest background */}
        <rect width="40" height="40" rx="11" fill="#1E3A8A" />
        {/* Sarathi guiding compass ring */}
        <circle cx="20" cy="20" r="13.5" stroke="#3B82F6" strokeOpacity="0.45" strokeWidth="1.5" />
        {/* Guiding spoke & upward J-hook path */}
        <path
          d="M15 12.5V22.5C15 25.5376 17.4624 28 20.5 28C23.5376 28 26 25.5376 26 22.5V19"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Rising Sarathi arrow / North Star guide */}
        <path
          d="M21 15.5L26 10.5M26 10.5H21.5M26 10.5V15"
          stroke="#34D399"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Saffron center hub */}
        <circle cx="15" cy="12.5" r="2.2" fill="#F59E0B" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-bold tracking-tight text-slate-900">
          Job<span className="text-indigo-700">Sarathi</span>
        </span>
        {showOwner && (
          <span className="mt-0.5 text-[10px] font-semibold tracking-wider uppercase text-slate-500">
            by <span className="text-indigo-700">Waris Sabri</span>
          </span>
        )}
      </span>
    </span>
  );
};

export const OwnerSignatureSeal: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border border-indigo-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-4 py-2.5 text-white shadow-sm ${className}`}
    >
      {/* Unique WS Monogram Crest */}
      <svg
        width="34"
        height="34"
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1" y="1" width="34" height="34" rx="9" fill="#1E3A8A" stroke="#34D399" strokeOpacity="0.55" strokeWidth="1.2" />
        {/* Stylized 'W' stroke */}
        <path
          d="M8.5 12L11.5 23.5L15 15L18.5 23.5L21.5 12"
          stroke="#FFFFFF"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Rising Sarathi 'S' spark / arrow accent */}
        <path
          d="M23.5 22.5C25 23.8 28 23.5 28 21.2C28 18.8 23.5 18.6 23.5 16.2C23.5 14.2 26.2 13.7 28 14.8"
          stroke="#34D399"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="28" cy="11.5" r="1.7" fill="#F59E0B" />
      </svg>

      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[9px] font-semibold tracking-[0.18em] uppercase text-emerald-300">
          Founder &amp; Owner
        </span>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-display text-sm font-bold tracking-tight text-white">
            Waris Sabri
          </span>
          {/* Signature flourish */}
          <svg width="36" height="10" viewBox="0 0 36 10" fill="none" aria-hidden="true">
            <path
              d="M1 7.5C9 2.5 19 8.5 34 2.5"
              stroke="#F59E0B"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export const SafalLogo = JobSarathiLogo;
