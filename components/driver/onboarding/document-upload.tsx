'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { Upload, X, FileText, Loader2, Check } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { cn } from '@/lib/utils/cn';

/**
 * DocumentUpload — reusable upload block used across onboarding steps.
 *
 * Handles: file selection, upload to the onboarding_documents bucket via
 * /api/driver/onboarding/upload, and preview.
 *
 * Contract:
 *   - `documentType` — kind of doc (e.g. 'licence_front', 'utility_bill')
 *   - `initialUrl` — signed URL if the doc was previously uploaded
 *   - `onUploaded(pathOrUrl)` — parent stores the returned reference in
 *     onboarding_state, then re-renders
 *
 * If your upload endpoint or storage bucket differs, adjust the fetch
 * inside `handleUpload` to match your existing API.
 */

const MAX_MB = 10;
const ACCEPTED = 'image/jpeg,image/jpg,image/png,image/webp,application/pdf';

export function DocumentUpload({
  documentType,
  label,
  initialUrl,
  onUploaded,
  helperText,
}: {
  documentType: string;
  label: string;
  initialUrl?: string | null;
  onUploaded: (urlOrPath: string) => void | Promise<void>;
  helperText?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialUrl ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState<boolean>(
    Boolean(initialUrl && initialUrl.toLowerCase().includes('.pdf'))
  );

  const pick = () => inputRef.current?.click();

  const clear = () => {
    setPreviewUrl(null);
    setFileName(null);
    setIsPdf(false);
    if (inputRef.current) inputRef.current.value = '';
    onUploaded('');
  };

  const handleUpload = async (file: File) => {
    // Validate
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File is too large. Max ${MAX_MB}MB.`);
      return;
    }
    const validTypes = ACCEPTED.split(',');
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP, or PDF are supported.');
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);

      const res = await fetch('/api/driver/onboarding/upload', {
        method: 'POST',
        body: formData,
      });

      const body = (await res.json()) as {
        url?: string;
        path?: string;
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Upload failed');
        return;
      }

      const returned = body.url ?? body.path ?? '';
      if (!returned) {
        toast.error('Upload succeeded but returned no reference');
        return;
      }

      setFileName(file.name);
      setIsPdf(file.type === 'application/pdf');

      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(returned);
      }

      await onUploaded(returned);
      toast.success('Uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
  };

  const hasFile = Boolean(previewUrl);

  return (
    <div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted">
        {label}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onFileChange}
        className="hidden"
      />

      {!hasFile && (
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed p-8 transition-colors',
            'border-line-strong bg-paper-2 text-ink hover:border-ink hover:bg-paper-3',
            'disabled:cursor-not-allowed disabled:opacity-60'
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-ink-muted" strokeWidth={1.5} />
              <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Uploading…
              </div>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center border border-line-strong bg-paper">
                <Upload className="h-5 w-5 text-ink" strokeWidth={1.5} />
              </div>
              <div>
                <div className="font-body text-base text-ink">
                  Click to upload
                </div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  JPG · PNG · PDF · up to {MAX_MB}MB
                </div>
              </div>
            </>
          )}
        </button>
      )}

      {hasFile && (
        <div className="border border-line bg-paper-2 p-4">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center bg-green">
                <Check className="h-3.5 w-3.5 text-paper" strokeWidth={3} />
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-green">
                Uploaded
              </div>
            </div>
            <button
              type="button"
              onClick={clear}
              disabled={busy}
              className="text-ink-muted hover:text-oxblood"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          {isPdf ? (
            <div className="flex items-center gap-3 border border-line-strong bg-paper p-4">
              <FileText className="h-6 w-6 text-ink-muted" strokeWidth={1.5} />
              <div className="min-w-0 flex-1">
                <div className="truncate font-body text-sm text-ink">
                  {fileName ?? 'Document.pdf'}
                </div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                  PDF file
                </div>
              </div>
            </div>
          ) : (
            <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden border border-line-strong bg-paper">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt={label}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          )}

          <button
            type="button"
            onClick={pick}
            disabled={busy}
            className="mt-3 font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
          >
            Replace file →
          </button>
        </div>
      )}

      {helperText && (
        <p className="mt-2 font-body text-xs leading-relaxed text-ink-muted">
          {helperText}
        </p>
      )}
    </div>
  );
}
