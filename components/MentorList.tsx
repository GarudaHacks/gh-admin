import { fetchMentors } from "@/lib/firebaseUtils"
import { FirestoreMentor, FirestoreUser } from "@/lib/types"
import { useEffect, useState } from "react"
import Separator from "./Separator"
import MentorItemComponent from "./MentorItemComponent"

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
        <h1 className="text-xl font-semibold">All Mentors ({mentors?.length})</h1>
        <div className="rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {mentors?.map((m, index) => (
            <MentorItemComponent key={index} mentor={m} />
          ))}
        </div>
      </div>

      <Separator />

      {specializations.map((s, specializationIndex) => (
        <div key={specializationIndex} className="flex flex-col gap-4">
          <h1 className="text-xl font-semibold">{s.toUpperCase()}</h1>
          <div className="rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {mentors?.filter((ms) => ms.specialization.includes(s)).map((m) => (
              <MentorItemComponent key={m.id} mentor={m} />
            ))}
          </div>
        </div>
      ))}

    </div>
  )
}