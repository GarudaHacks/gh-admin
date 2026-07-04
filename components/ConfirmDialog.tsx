import { Loader2 } from "lucide-react"

interface ConfirmDialogProps {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full mx-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description && <p className="text-white/80 text-sm">{description}</p>}
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-white/20 text-white/80 rounded-md hover:bg-white/5 transition-colors disabled:opacity-60"
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-white rounded-md bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-60"
            type="button"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
