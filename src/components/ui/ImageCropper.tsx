/**
 * @file src/components/ui/ImageCropper.tsx
 * @description
 * 이미지 크롭(자르기) 컴포넌트입니다.
 * 파일을 선택하고 원형으로 잘라서 업로드할 수 있습니다.
 *
 * 초보자 가이드:
 * 1. **onCropComplete**: 크롭 완료 시 호출되는 콜백
 * 2. **aspectRatio**: 크롭 비율 (1 = 정사각형)
 * 3. **cropShape**: 크롭 모양 (round = 원형)
 *
 * @example
 * <ImageCropper
 *   onCropComplete={(blob) => uploadImage(blob)}
 *   onClose={() => setShowCropper(false)}
 * />
 */

"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Button, Icon } from "@/components/ui";

interface ImageCropperProps {
  /** 크롭 완료 시 콜백 (Blob 반환) */
  onCropComplete: (blob: Blob) => void;
  /** 닫기 콜백 */
  onClose: () => void;
  /** 에러 발생 시 콜백 (선택) */
  onError?: (message: string) => void;
  /** 크롭 비율 (기본: 1 = 정사각형) */
  aspectRatio?: number;
  /** 크롭 모양 (기본: round = 원형) */
  cropShape?: "round" | "rect";
}

/**
 * 이미지 크롭 영역에서 실제 이미지를 잘라내는 함수
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  // 캔버스 크기를 크롭 영역 크기로 설정
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // 이미지를 캔버스에 그리기 (크롭 영역만)
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  // 캔버스를 Blob으로 변환
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Canvas to Blob failed"));
        }
      },
      "image/jpeg",
      0.9
    );
  });
}

/**
 * 이미지 URL로부터 Image 객체 생성
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

/**
 * 이미지 크롭 컴포넌트
 */
export function ImageCropper({
  onCropComplete,
  onClose,
  onError,
  aspectRatio = 1,
  cropShape = "round",
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 파일 선택 시 이미지 로드
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 타입 검증
    if (!file.type.startsWith("image/")) {
      onError?.("이미지 파일만 선택할 수 있습니다.");
      return;
    }

    // 파일을 Data URL로 변환
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setImageSrc(reader.result as string);
    });
    reader.readAsDataURL(file);
  };

  /**
   * 크롭 영역 변경 완료 시
   */
  const onCropCompleteInternal = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  /**
   * 크롭 완료 버튼 클릭
   */
  const handleComplete = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
    } catch (error) {
      console.error("크롭 실패:", error);
      onError?.("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-background-white dark:bg-surface-dark rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-border dark:border-border-dark">
          <h3 className="text-lg font-bold text-text dark:text-white">
            프로필 사진 설정
          </h3>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text dark:hover:text-white"
          >
            <Icon name="close" size="md" />
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4">
          {!imageSrc ? (
            // 파일 선택 영역
            <div className="flex flex-col items-center gap-4">
              <div className="size-32 rounded-full bg-surface dark:bg-background-dark border-2 border-dashed border-border dark:border-border-dark flex items-center justify-center">
                <Icon name="add_a_photo" size="xl" className="text-text-secondary" />
              </div>
              <p className="text-sm text-text-secondary text-center">
                프로필 사진으로 사용할 이미지를 선택하세요
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
                  <Icon name="upload" size="sm" />
                  이미지 선택
                </span>
              </label>
            </div>
          ) : (
            // 크롭 영역
            <div className="flex flex-col gap-4">
              <div className="relative h-72 bg-black rounded-lg overflow-hidden">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectRatio}
                  cropShape={cropShape}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropCompleteInternal}
                />
              </div>

              {/* 줌 슬라이더 */}
              <div className="flex items-center gap-3">
                <Icon name="zoom_out" size="sm" className="text-text-secondary" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 bg-surface dark:bg-background-dark rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <Icon name="zoom_in" size="sm" className="text-text-secondary" />
              </div>

              {/* 다시 선택 버튼 */}
              <label className="cursor-pointer text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="text-sm text-primary hover:underline">
                  다른 이미지 선택
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex gap-3 p-4 border-t border-border dark:border-border-dark">
          <Button variant="ghost" fullWidth onClick={onClose}>
            취소
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleComplete}
            disabled={!imageSrc || isProcessing}
          >
            {isProcessing ? "처리 중..." : "적용"}
          </Button>
        </div>
      </div>
    </div>
  );
}
