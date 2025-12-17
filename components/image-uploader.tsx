'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface ImageUploaderProps {
  onUploadComplete: (mediaId: string) => void;
  onRemove: () => void;
  initialImageUrl?: string;
  maxSizeMB?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export function ImageUploader({
  onUploadComplete,
  onRemove,
  initialImageUrl,
  maxSizeMB = 5
}: ImageUploaderProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(`Invalid file type. Allowed types: JPEG, PNG, GIF, WebP`);
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      setError(`File size exceeds ${maxSizeMB}MB limit. Received: ${sizeMB}MB`);
      return;
    }

    setUploadedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-upload
    await handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/media/upload`, {
        method: 'POST',
        body: formData,
      });

      const responseText = await response.text();
      let data: any = null;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        // Non-JSON response, keep raw text for logging
      }

      if (!response.ok) {
        console.error('[ImageUploader] Upload failed', {
          status: response.status,
          statusText: response.statusText,
          body: responseText,
        });

        const backendMessage =
          (data && (data.error?.message || data.error || data.message)) ||
          responseText;

        const message =
          backendMessage && typeof backendMessage === 'string'
            ? `Upload failed (${response.status}): ${backendMessage}`
            : `Upload failed with status ${response.status} ${response.statusText}`;

        throw new Error(message);
      }

      if (data && data.success && data.mediaId) {
        setUploadedMediaId(data.mediaId);
        onUploadComplete(data.mediaId);
      } else {
        throw new Error('No media ID returned');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setUploadedFile(null);
    setPreviewUrl(initialImageUrl || null);
    setUploadedMediaId(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onRemove();
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        {previewUrl ? (
          <div className="relative inline-block">
            <div className="relative w-64 h-64 rounded-lg overflow-hidden bg-gray-100">
              <Image
                src={previewUrl}
                alt="Preview"
                fill
                className="object-cover"
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ImageIcon className="h-12 w-12 mx-auto text-gray-400" />
            <div>
              <p className="text-sm text-gray-600">
                Upload an image for the template header
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supported: JPEG, PNG, GIF, WebP (max {maxSizeMB}MB)
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Choose Image'}
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      {isUploading && (
        <div className="text-sm text-gray-600">
          Uploading image...
        </div>
      )}

      {uploadedMediaId && !error && (
        <div className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-2">
          ✓ Image uploaded successfully
        </div>
      )}
    </div>
  );
}

