'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import imageCompression from 'browser-image-compression';
import { Upload, X, FileText, Loader2, ZoomIn } from 'lucide-react';
import { attachmentsApi } from '@/lib/api/attachments';
import { toast } from '@/lib/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UploadedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string;
  uploading?: boolean;
}

interface ReceiptUploadProps {
  claimId: string;
  itemIndex?: number;
  claimItemId?: string;
  onUploaded?: (attachment: any) => void;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 2000,
  useWebWorker: true,
};

export function ReceiptUpload({ claimId, claimItemId, onUploaded }: ReceiptUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  const processAndUpload = async (file: File) => {
    const tempId = Math.random().toString(36).slice(2);
    let processedFile = file;

    if (file.type.startsWith('image/')) {
      try {
        processedFile = await imageCompression(file, COMPRESSION_OPTIONS);
      } catch {
        processedFile = file;
      }
    }

    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(processedFile)
      : undefined;

    setFiles(prev => [...prev, { id: tempId, name: file.name, type: file.type, size: processedFile.size, preview, uploading: true }]);

    try {
      const result = await attachmentsApi.upload(processedFile, claimId, claimItemId);
      setFiles(prev => prev.map(f => f.id === tempId ? { ...f, id: result.id, uploading: false } : f));
      onUploaded?.(result);
      toast({ title: 'Receipt uploaded', description: file.name, variant: 'success' });
    } catch (err: any) {
      setFiles(prev => prev.filter(f => f.id !== tempId));
      // Revoke preview URL on failure to avoid memory leak
      if (preview) URL.revokeObjectURL(preview);
      toast({ title: 'Upload failed', description: err?.response?.data?.message || 'Please try again', variant: 'destructive' });
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(processAndUpload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, claimItemId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/heic': ['.heic'],
      'image/heif': ['.heif'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = async (id: string, preview?: string) => {
    if (preview) URL.revokeObjectURL(preview);
    try { await attachmentsApi.remove(id); } catch {}
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-gray-600">Receipts & Documents</p>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          isDragActive
            ? 'border-wurth-red bg-red-50'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-5 w-5 text-gray-300 mx-auto mb-1.5" />
        <p className="text-xs text-gray-500">
          {isDragActive ? 'Drop files here' : 'Tap to upload or drag & drop'}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">JPEG · PNG · HEIC · PDF — max 10 MB, images auto-compressed</p>
      </div>

      {/* File grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {files.map((file) => (
            <div key={file.id} className="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-50 group">
              {file.type.startsWith('image/') && file.preview ? (
                <>
                  {/* Thumbnail */}
                  <div className="relative">
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-24 object-cover"
                    />
                    {/* Zoom button — only when not uploading */}
                    {!file.uploading && (
                      <button
                        type="button"
                        onClick={() => setLightbox(file.preview!)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors"
                        title="View full size"
                      >
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="w-full h-24 flex flex-col items-center justify-center bg-gray-100 gap-1">
                  <FileText className="h-7 w-7 text-gray-400" />
                  <span className="text-xs text-gray-400 uppercase font-medium">PDF</span>
                </div>
              )}

              <div className="px-2 py-1.5">
                <p className="text-xs text-gray-700 font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
              </div>

              {/* Upload spinner overlay */}
              {file.uploading && (
                <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-wurth-red" />
                </div>
              )}

              {/* Delete button */}
              {!file.uploading && (
                <button
                  type="button"
                  onClick={() => removeFile(file.id, file.preview)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  title="Remove"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox}
              alt="Receipt preview"
              className="max-w-[90vw] max-h-[85vh] object-contain rounded shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white text-gray-800 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="text-center text-white/60 text-xs mt-2">Tap outside or press Esc to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
