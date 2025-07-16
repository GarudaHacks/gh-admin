import { FirestoreMentor } from "@/lib/types"

export default function MentorItemComponent({ mentor: m }: { mentor: FirestoreMentor }) {
  return (
    <div key={m.id} className="border rounded-xl border-gray-400 p-4 flex justify-between">
      <div className="flex flex-col gap-2">
        <p className="font-semibold">{m.name}</p>
        <p className="text-muted-foreground">{m.email}</p>
        <p className="">{m.specialization.toUpperCase()}</p>

        {m.availableMentorings && (
          <div className="">
            {m.availableMentorings.map((availableMentoring, index) => {
              const startDate = new Date(availableMentoring.startTime * 1000)
              const startDay = startDate.toLocaleDateString()
              const startTimestamp = startDate.toLocaleString('id-ID', { timeStyle: 'short' })
              const start = `${startDay} ${startTimestamp}`

              const endDate = new Date(availableMentoring.startTime * 1000)
              const endDay = endDate.toLocaleDateString()
              const endTimestamp = endDate.toLocaleString('id-ID', { timeStyle: 'short' })
              const end = `${endDay} ${endTimestamp}`

              return (
                <div key={index} className="text-sm flex gap-2 px-2 border bg-muted rounded-xl">
                  <span>{start} WIB - {end} WIB</span>
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
    </div>
  )
}