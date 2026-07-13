"use client"

import { useCallback, useState } from "react"
import Cropper, { Area } from "react-easy-crop"
import { Loader2, X } from "lucide-react"

interface MentorPictureCropModalProps {
  imageSrc: string
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export default function MentorPictureCropModal({
  imageSrc,
  onCancel,
  onConfirm,
}: MentorPictureCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setError("")
    setProcessing(true)
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels)
      onConfirm(blob)
    } catch {
      setError("Failed to process the image. Try a different picture.")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 max-w-lg w-full mx-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white">Adjust Picture</h2>
          <button
            onClick={onCancel}
            type="button"
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative w-full h-80 bg-black/40 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-white">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {error && <span className="text-red-500 text-sm">{error}</span>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            type="button"
            className="border p-2 rounded-xl text-sm px-4"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
            type="button"
            className="border p-2 rounded-xl text-sm px-4 flex items-center gap-1 disabled:opacity-60"
          >
            {processing && <Loader2 className="animate-spin" size={16} />}
            Use Picture
          </button>
        </div>
      </div>
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", () => reject(new Error("Failed to load image")))
    img.src = src
  })
}

async function getCroppedImageBlob(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not supported in this browser")

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("Failed to encode the cropped image"))
    }, "image/png")
  })
}
