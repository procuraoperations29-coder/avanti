'use client';

import { useState, useRef } from 'react';
import { Upload, Check, X, FileText, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

/**
 * DocumentUpload — file picker + preview + upload progress.
 *
 * Given a `kind` (one of the document_kind enum values), uploads to
 * /api/driver/onboarding/documents. On success, returns the documentId
 * via onUploaded so parent can save it to onboarding state.
 *
 * If a documentId is already known (already uploaded, we're returning to
 * the step), pass it via `existingDocumentId` + `existingPreviewUrl` to
 * show the current state and offer a "replace" affordance.
 *
 * Camera-first on mobile via capture="environment" for photo-heavy steps.
 */

export interface DocumentUploadProps {
  kind: string;
  label: string;
  hint?: string;
  captureCamera?: boolean;
  existingDocumentId?: string;
  existingPreviewUrl?: string | null;
  onUploaded: (documentId: string, previewUrl: string | null, filename: string) => void;
  className?: string;
}

export function DocumentUpload({
  kind,
  label,
  hint,
  captureCamera,
  existingDocumentId,
  existingPreviewUrl,
  onUploaded,
  className,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(existingPreviewUrl ?? null);
  const [filename, setFilename] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(existingDocumentId ?? null);

  const openPicker = () => inputRef.current?.click();

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      if (file.size > 10 * 1024 * 1024) {
        setError('File too large. Maximum 10 MB.');
        return;
      }

      const form = new FormData();
      form.set('file', file);
      form.set('kind', kind);

      const res = await fetch('/api/driver/onboarding/documents', {
        method: 'POST',
        body: form,
      });
      const body = (await res.json()) as {
        documentId?: string;
        previewUrl?: string | null;
        filename?: string;
        message?: string;
      };
      if (!res.ok || !body.documentId) {
        setError(body.message ?? 'Upload failed');
        return;
      }
      setDocumentId(body.documentId);
      setPreview(body.previewUrl ?? null);
      setFilename(body.filename ?? file.name);
      onUploaded(body.documentId, body.previewUrl ?? null, body.filename ?? file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const clear = () => {
    setDocumentId(null);
    setPreview(null);
    setFilename(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isImage = preview && /\.(jpe?g|png|webp|heic)$/i.test(filename ?? '');

  return (
    <div className={cn('border border-line-strong bg-paper-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture={captureCamera ? 'environment' : undefined}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
        }}
        className="hidden"
      />

      {documentId && preview ? (
        <div className="relative">
          {isImage ? (
            <img
              src={preview}
              alt={filename ?? label}
              className="h-48 w-full object-cover"
            />
          ) : (
            <div className="flex h-48 items-center justify-center bg-paper-3">
              <FileText className="h-10 w-10 text-ink-muted" strokeWidth={1.5} />
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line-strong bg-paper-2 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <Check className="h-4 w-4 shrink-0 text-green" strokeWidth={2.5} />
              <div className="min-w-0">
                <div className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                  Uploaded
                </div>
                <div className="truncate font-mono text-xs text-ink">{filename ?? label}</div>
              </div>
            </div>
            <button
              onClick={clear}
              className="font-mono text-xs uppercase tracking-wider text-ink-muted hover:text-ink"
            >
              Replace
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          disabled={busy}
          className="flex h-48 w-full flex-col items-center justify-center gap-2 p-6 text-center transition-colors hover:bg-paper-3 disabled:opacity-60"
        >
          {busy ? (
            <>
              <div className="animate-pulse font-mono text-xs uppercase tracking-wider text-ink-muted">
                Uploading…
              </div>
            </>
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center border border-line-strong bg-paper">
                {captureCamera ? (
                  <ImageIcon className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
                ) : (
                  <Upload className="h-4 w-4 text-ink-muted" strokeWidth={1.5} />
                )}
              </div>
              <div className="font-body text-sm text-ink">{label}</div>
              {hint && <div className="font-mono text-[10px] uppercase tracking-wider text-ink-muted">{hint}</div>}
            </>
          )}
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 border-t border-oxblood/30 bg-paper-2 px-3 py-2">
          <X className="h-3.5 w-3.5 text-oxblood" />
          <div className="font-mono text-xs text-oxblood">{error}</div>
        </div>
      )}
    </div>
  );
}
