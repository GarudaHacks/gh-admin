"use client"

import MentoringSlotsComponent from "@/components/MentoringSlots"
import { fetchMentorById } from "@/lib/firebaseUtils"
import { epochToStringDate } from "@/lib/helpers"
import { AvailableMentoring, FirestoreMentor } from "@/lib/types"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function MentorDetailPage() {
  const params = useParams<{ mentorId: string }>()

  const [mentor, setMentor] = useState<FirestoreMentor>()
  const [availableMentorings, setAvailableMentorings] = useState<AvailableMentoring[]>()

  useEffect(() => {
    fetchMentorById(params.mentorId).then((m) => {
      if (m) {
        setMentor(m)
        setAvailableMentorings(m.availableMentorings)
      }
    })
  }, [params.mentorId])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">Mentor Details</h1>
        <div className="flex flex-col gap-2 border p-4 rounded-xl">
          <h2 className="text-2xl font-bold">{mentor?.name}</h2>
          <h3 className="text-muted-foreground">{mentor?.email}</h3>
          <p className="">Specialization: {mentor?.specialization.toUpperCase()}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-bold">Mentoring Slots</h2>
        {availableMentorings && <MentoringSlotsComponent availableMentorings={availableMentorings} />}
      </div>
    </div>
  )
}