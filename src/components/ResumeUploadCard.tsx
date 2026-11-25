import React, { useRef, useState } from 'react';
import { CheckCircle2, Download, FileText, Trash2, Upload } from 'lucide-react';
import type { CandidateProfile } from '../shared/types';

interface ResumeUploadCardProps {
  candidate: CandidateProfile;
  onUploadResume: (file: File) => Promise<{ ok: boolean; error?: string }>;
  onRemoveResume: () => Promise<boolean>;
  onDownloadSelfResume: () => Promise<void>;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const ResumeUploadCard: React.FC<ResumeUploadCardProps> = ({
  candidate,
  onUploadResume,
  onRemoveResume,
  onDownloadSelfResume,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const validateAndUpload = async (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);
    setStatusMsg(null);

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.pdf') && !lowerName.endsWith('.docx')) {
      setErrorMsg('Unsupported file format. Please select a PDF (.pdf) or Word (.docx) document.');
      return;
    }

    if (file.size === 0) {
      setErrorMsg('The selected file appears empty.');
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setErrorMsg('File exceeds the 5 MB limit. Please upload a smaller PDF or DOCX resume.');
      return;
    }

    setUploading(true);
    const result = await onUploadResume(file);
    setUploading(false);

    if (result.ok) {
      setStatusMsg(`"${file.name}" uploaded and attached to your profile for verified recruiters.`);
    } else {
      setErrorMsg(result.error || 'Could not upload resume. Please check the file and try again.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    void validateAndUpload(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    void validateAndUpload(file);
  };

  const handleRemove = async () => {
    setErrorMsg(null);
    setStatusMsg(null);
    setRemoving(true);
    const ok = await onRemoveResume();
    setRemoving(false);
    if (ok) {
      setStatusMsg('Uploaded resume file removed.');
    } else {
      setErrorMsg('Could not remove resume right now.');
    }
  };

  const handleDownload = async () => {
    setErrorMsg(null);
    setDownloading(true);
    await onDownloadSelfResume();
    setDownloading(false);
  };

  const hasStoredFile = Boolean(candidate.hasResumeFile && candidate.resumeFileName);
  const extLabel = candidate.resumeFileName?.toLowerCase().endsWith('.docx') ? 'DOCX' : 'PDF';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-slate-700">
          Upload Resume Document (PDF or DOCX · Max 5 MB)
        </label>
        <span className="text-[11px] text-slate-500">
          Downloadable by verified recruiters when you apply
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Upload PDF or DOCX resume file"
      />

      {hasStoredFile ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3.5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {candidate.resumeFileName}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 tabular-nums">
                  <span className="font-mono font-semibold text-emerald-800">{extLabel}</span>
                  {candidate.resumeSizeBytes && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{formatFileSize(candidate.resumeSizeBytes)}</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span>Ready for recruiter download</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={downloading}
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5 text-indigo-700" />
                {downloading ? 'Downloading...' : 'Download'}
              </button>

              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Uploading...' : 'Replace'}
              </button>

              <button
                type="button"
                disabled={removing}
                onClick={handleRemove}
                aria-label="Remove uploaded resume"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{removing ? 'Removing...' : 'Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-4 transition-colors sm:flex-row ${
            dragging
              ? 'border-indigo-600 bg-indigo-50/70'
              : 'border-slate-300 bg-slate-50 hover:border-indigo-500 hover:bg-slate-100/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
            <div>
              <div className="text-sm font-medium text-slate-800">
                {uploading
                  ? 'Uploading and verifying resume...'
                  : 'Drop your PDF or DOCX resume here, or browse'}
              </div>
              <div className="text-xs text-slate-500">
                Accepted formats: .pdf, .docx up to 5 MB · Shared only with verified employers you apply to
              </div>
            </div>
          </div>
          <span className="rounded-md border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 whitespace-nowrap">
            {uploading ? 'Uploading...' : 'Select File'}
          </span>
        </div>
      )}

      {errorMsg && (
        <p role="alert" className="text-xs font-medium text-red-700">
          {errorMsg}
        </p>
      )}

      {statusMsg && !errorMsg && (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{statusMsg}</span>
        </p>
      )}
    </div>
  );
};
