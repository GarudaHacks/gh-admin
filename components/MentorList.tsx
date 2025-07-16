import { fetchMentors } from "@/lib/firebaseUtils"
import { FirestoreMentor, FirestoreUser } from "@/lib/types"
import { useEffect, useState } from "react"
import Separator from "./Separator"

export default function MentorListComponent() {
  const [mentors, setMentors] = useState<FirestoreMentor[]>()

  const specializations = [
    "developer",
    "backend",
    "frontend",
    "data scientist",
    "designer",
    "product manager",
    "entrepreneur",
    "other"
  ]

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
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">All Mentors</h1>
        <div className="rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {mentors?.map((m) => (
            <div key={m.id} className="border rounded-xl border-gray-400 p-4 flex justify-between">
              <div>
                <p className="font-semibold">{m.name}</p>
                <p className="text-muted-foreground">{m.email}</p>
                <p className="mt-1">{m.specialization.toUpperCase()}</p>
              </div>
              <button className="font-semibold text-sm hover:underline">
                View
              </button>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {specializations.map((s) => (
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{s.toUpperCase()}</h1>
          <div className="rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentors?.filter((ms) => ms.specialization.includes(s)).map((m) => (
              <div key={m.id} className="border rounded-xl border-gray-400 p-4 flex justify-between">
                <div>
                  <p className="font-semibold">{m.name}</p>
                  <p className="text-muted-foreground">{m.email}</p>
                  <p className="mt-1">{m.specialization.toUpperCase()}</p>
                </div>
                <button className="font-semibold text-sm hover:underline">
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

    </div>
  )
}