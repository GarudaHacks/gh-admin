import { getMentorProfilePicture } from "@/lib/firebaseUtils"
import { FirestoreMentor } from "@/lib/types"
import { Loader2, Trash2, User } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

export default function MentorItemComponent({
  mentor: m,
  onDelete,
  deleting,
}: {
  mentor: FirestoreMentor
  onDelete?: (mentor: FirestoreMentor) => void
  deleting?: boolean
}) {
  const [pictureUrl, setPictureUrl] = useState("")

  useEffect(() => {
    let cancelled = false
    getMentorProfilePicture(m.displayName).then((url) => {
      if (!cancelled && url) setPictureUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [m.displayName])

  const handleDeleteClick = (e: React.MouseEvent) => {
    // The whole card is a Link; don't navigate when deleting.
    e.preventDefault()
    e.stopPropagation()
    onDelete?.(m)
  }

  return (
    <Link href={`/mentorship/${m.id}`} key={m.id} className="border border-border rounded-xl p-4 flex justify-between gap-3 transition-colors hover:border-primary/60 hover:bg-zinc-50/5">
      <div className="flex flex-row gap-3 min-w-0">
        <div className="w-12 h-12 rounded-full bg-zinc-50/20 border border-border overflow-hidden flex items-center justify-center shrink-0">
          {pictureUrl ? (
            <Image
              src={pictureUrl}
              alt={`Profile picture of ${m.displayName}`}
              width={48}
              height={48}
              onError={() => setPictureUrl("")}
              className="w-full h-full object-cover"
            />
          ) : (
            <User size={20} className="text-gray-400" />
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="font-semibold truncate">{m.displayName}</p>
          <p className="text-muted-foreground text-sm truncate">{m.email}</p>
          {m.specialization && (
            <span className="mt-1 w-fit rounded-full border border-border bg-zinc-50/5 px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              {m.specialization}
            </span>
          )}
        </div>
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
