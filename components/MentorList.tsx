import { fetchMentors } from "@/lib/firebaseUtils"
import { FirestoreMentor, FirestoreUser } from "@/lib/types"
import { useEffect, useState } from "react"

export default function MentorListComponent() {

  const [mentors, setMentors] = useState<FirestoreMentor[]>()

  useEffect(() => {
    try {
      fetchMentors().then((result) => {
        setMentors(result)
      });
    } catch (error) {
      console.log(error)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">All Mentors</h1>
      <div className="rounded-xl p-4 grid grid-cols-1 md:grid-cols-2">
        {mentors?.map((m) => (
          <div key={m.id} className="border rounded-xl border-gray-400 p-4 flex justify-between">
            <div>
              <p className="font-semibold">{m.name}</p>
              <p className="text-muted-foreground">{m.email}</p>
              <p className="">Specialization: {m.specialization}</p>
            </div>
            <button className="font-semibold text-sm hover:underline">
              View
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}