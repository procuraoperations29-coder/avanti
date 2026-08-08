'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';
import { Portrait } from '@/components/avanti/portrait';
import { toast } from '@/components/ui/sonner';

/**
 * SelfieUpload — lets a driver set or replace their profile photo after
 * onboarding. Posts to /api/driver/onboarding/upload with documentType
 * 'selfie', which creates the documents row and retires the previous selfie.
 */

const MAX_MB = 10;
const ACCEPTED = 'image/jpeg,image/jpg,image/png,image/webp';

export function SelfieUpload({
  currentUrl,
  initials,
}: {
  currentUrl: string | null;
  initials: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl);

  const pick = () => inputRef.current?.click();

  const handleUpload = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Photo is too large. Max ${MAX_MB}MB.`);
      return;
    }
    if (!ACCEPTED.split(',').includes(file.type)) {
      toast.error('Please use a JPG, PNG, or WEBP image.');
      return;
    }

    setBusy(true);
    const localPreview = URL.createObjectURL(file);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'selfie');

      const res = await fetch('/api/driver/onboarding/upload', {
        method: 'POST',
        body: formData,
      });
      const body = (await res.json()) as { url?: string; error?: string; message?: string };
      if (!res.ok) {
        toast.error(body.message ?? body.error ?? 'Upload failed');
        return;
      }

      setPreview(localPreview);
      toast.success('Profile photo updated');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleUpload(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex items-center gap-5 rounded-2xl border border-admin-border bg-admin-card px-6 py-5 shadow-admin-sm">
      <div className="relative shrink-0">
        <Portrait initials={initials} imageUrl={preview} imageAlt="Your profile photo" size="lg" />
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" strokeWidth={2} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="font-body text-sm font-medium text-admin-text">Profile photo</div>
        <p className="mt-0.5 font-body text-[12px] text-admin-text-muted">
          A clear, front-facing photo of your face. Customers see this when choosing a driver.
        </p>
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-bg px-3 py-1.5 font-body text-[13px] font-medium text-admin-text transition-colors hover:bg-admin-card disabled:opacity-50"
        >
          <Camera className="h-3.5 w-3.5" strokeWidth={2} />
          {preview ? 'Replace photo' : 'Upload photo'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={onFileChange}
        className="hidden"
      />
    </div>
  );
}
