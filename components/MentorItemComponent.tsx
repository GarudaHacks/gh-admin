import { epochToStringDate } from "@/lib/helpers"
import { FirestoreMentor } from "@/lib/types"
import Link from "next/link"

export default function MentorItemComponent({ mentor: m }: { mentor: FirestoreMentor }) {
  return (
    <Link href={`/mentorship/${m.id}`} key={m.id} className="border rounded-xl border-gray-400 p-4 flex justify-between">
      <div className="flex flex-col gap-2">
        <p className="font-semibold">{m.name}</p>
        <p className="text-muted-foreground">{m.email}</p>
        <p className="">{m.specialization.toUpperCase()}</p>

        {m.availableMentorings && (
          <div className="">
            {m.availableMentorings.map((availableMentoring, index) => {
              return (
                <div key={index} className="text-sm flex gap-2 px-2 border bg-muted rounded-xl">
                  <span>{epochToStringDate(availableMentoring.startTime)} WIB - {epochToStringDate(availableMentoring.endTime)} WIB</span>
                </div>
              )
            }
            )}
          </div>
        )}
      </div>
      <button className="font-semibold text-sm hover:underline">
        View
      </button>
    </Link>
  )
}