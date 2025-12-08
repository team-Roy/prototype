'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  mediaApi,
  getFileType,
  isValidFileType,
  getMaxFileSize,
  formatFileSize,
  MediaInfo,
  MediaFileType,
} from '@/lib/media';

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  mediaInfo?: MediaInfo;
}

interface MediaUploaderProps {
  maxFiles?: number;
  onUploadComplete?: (mediaList: MediaInfo[]) => void;
  accept?: string;
}

export function MediaUploader({
  maxFiles = 10,
  onUploadComplete,
  accept = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm',
}: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (newFiles: File[]) => {
      const validFiles: UploadingFile[] = [];

      for (const file of newFiles) {
        if (files.length + validFiles.length >= maxFiles) {
          break;
        }

        if (!isValidFileType(file)) {
          continue;
        }

        const fileType = getFileType(file);
        const maxSize = getMaxFileSize(fileType);

        if (file.size > maxSize) {
          continue;
        }

        const preview = file.type.startsWith('video/') ? '' : URL.createObjectURL(file);

        validFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          progress: 0,
          status: 'pending',
        });
      }

      setFiles((prev) => [...prev, ...validFiles]);
    },
    [files.length, maxFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const uploadFile = async (uploadingFile: UploadingFile) => {
    const { file, id } = uploadingFile;
    const fileType: MediaFileType = getFileType(file);

    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: 'uploading' as const } : f)));

    try {
      // Get presigned URL
      const presignedData = await mediaApi.getPresignedUrl({
        fileName: file.name,
        contentType: file.type,
        fileType,
        fileSize: file.size,
      });

      // Upload to R2
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress } : f)));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));

        xhr.open('PUT', presignedData.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Get image dimensions if it's an image
      let width: number | undefined;
      let height: number | undefined;

      if (fileType === 'IMAGE') {
        const dimensions = await getImageDimensions(file);
        width = dimensions.width;
        height = dimensions.height;
      }

      // Complete upload
      const mediaInfo = await mediaApi.completeUpload({
        fileKey: presignedData.fileKey,
        fileType,
        width,
        height,
        fileSize: file.size,
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'completed' as const, progress: 100, mediaInfo } : f
        )
      );

      return mediaInfo;
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, status: 'error' as const, error: '업로드 실패' } : f
        )
      );
      return null;
    }
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    const results = await Promise.all(pendingFiles.map(uploadFile));
    const completedMedia = results.filter((r): r is MediaInfo => r !== null);

    if (onUploadComplete && completedMedia.length > 0) {
      onUploadComplete(completedMedia);
    }
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        resolve({ width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary'}
          ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
          disabled={files.length >= maxFiles}
        />
        <div className="text-muted-foreground">
          <p className="text-lg font-medium">파일을 드래그하거나 클릭하세요</p>
          <p className="text-sm mt-1">
            이미지: jpg, png, gif, webp (최대 10MB) | 영상: mp4, webm (최대 100MB)
          </p>
          <p className="text-sm">
            최대 {maxFiles}개 ({files.length}/{maxFiles})
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
            >
              {/* Preview */}
              <div className="w-16 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                {uploadingFile.preview ? (
                  <img src={uploadingFile.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    영상
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{uploadingFile.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadingFile.file.size)}
                </p>

                {/* Progress Bar */}
                {uploadingFile.status === 'uploading' && (
                  <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                )}

                {/* Status */}
                {uploadingFile.status === 'completed' && (
                  <p className="text-xs text-green-600 mt-1">업로드 완료</p>
                )}
                {uploadingFile.status === 'error' && (
                  <p className="text-xs text-destructive mt-1">{uploadingFile.error}</p>
                )}
              </div>

              {/* Remove Button */}
              {uploadingFile.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(uploadingFile.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  ✕
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {pendingCount > 0 && (
        <Button onClick={uploadAll} disabled={uploadingCount > 0} className="w-full">
          {uploadingCount > 0 ? '업로드 중...' : `${pendingCount}개 파일 업로드`}
        </Button>
      )}
    </div>
  );
}
