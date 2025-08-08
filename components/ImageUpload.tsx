'use client';

import { useState, useRef } from 'react';
import { uploadCharacterImage, validateImageFile } from '@/lib/image-upload';

interface ImageUploadProps {
  characterId?: string;
  userId: string;
  currentImageUrl?: string;
  onImageUpload: (imageUrl: string) => void;
  onImageRemove?: () => void;
  className?: string;
}

export function ImageUpload({
  characterId,
  userId,
  currentImageUrl,
  onImageUpload,
  onImageRemove,
  className = ''
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイル検証
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);

    // プレビュー表示
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // アップロード実行
    if (characterId) {
      setIsUploading(true);
      try {
        const imageUrl = await uploadCharacterImage(file, characterId, userId);
        onImageUpload(imageUrl);
        setPreview(imageUrl);
      } catch (error) {
        console.error('アップロードエラー:', error);
        setError('画像のアップロードに失敗しました。');
        setPreview(currentImageUrl || null);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    setError(null);
    if (onImageRemove) {
      onImageRemove();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        disabled={isUploading}
      />

      <div className="relative group">
        {/* 画像表示エリア */}
        <div
          onClick={handleClick}
          className={`
            w-32 h-32 rounded-full border-2 border-dashed border-white/30 
            flex items-center justify-center cursor-pointer
            hover:border-purple-400 hover:bg-white/5 transition-all
            ${preview ? 'border-solid bg-cover bg-center' : ''}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          style={preview ? { backgroundImage: `url(${preview})` } : {}}
        >
          {!preview && !isUploading && (
            <div className="text-center">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-white/60 text-xs">
                画像を選択
              </p>
            </div>
          )}
          
          {isUploading && (
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-white/60 text-xs">
                アップロード中...
              </p>
            </div>
          )}
        </div>

        {/* ホバー時のオーバーレイ */}
        {preview && !isUploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClick();
              }}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full mr-2 transition-colors"
            >
              📝
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              className="bg-red-500/70 hover:bg-red-500 text-white p-2 rounded-full transition-colors"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="mt-2 text-red-400 text-xs bg-red-900/20 p-2 rounded">
          {error}
        </div>
      )}

      {/* ファイル形式の説明 */}
      <div className="mt-2 text-white/50 text-xs text-center">
        JPEG, PNG, GIF, WebP (最大5MB)
      </div>
    </div>
  );
}