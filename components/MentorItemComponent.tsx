import { FirestoreMentor } from "@/lib/types"
import { Loader2, Trash2 } from "lucide-react"
import Link from "next/link"

export default function MentorItemComponent({
  mentor: m,
  onDelete,
  deleting,
}: {
  mentor: FirestoreMentor
  onDelete?: (mentor: FirestoreMentor) => void
  deleting?: boolean
}) {
  const handleDeleteClick = (e: React.MouseEvent) => {
    // The whole card is a Link; don't navigate when deleting.
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(m)
  }

  return (
    <Link href={`/mentorship/${m.id}`} key={m.id} className="border rounded-xl border-gray-400 p-4 flex justify-between">
      <div className="flex flex-col gap-2">
        <p className="font-semibold">{m.displayName}</p>
        <p className="text-muted-foreground">{m.email}</p>
        <p className="">{m.specialization.toUpperCase()}</p>
      </div>
      <div className="flex flex-col items-end justify-between gap-2">
        <button className="font-semibold text-sm hover:underline">
          View
        </button>
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            className="text-sm text-red-500 hover:underline flex flex-row items-center gap-1 disabled:opacity-60"
            type="button"
          >
            {deleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
            Delete
          </button>
        )}
      </div>
    </Link>
  )
}
