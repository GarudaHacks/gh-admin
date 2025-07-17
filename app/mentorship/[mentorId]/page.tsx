"use client"

import MentorshipAppointmentCardComponent from "@/components/MentorshipAppointmentCardComponent"
import { fetchMentorshipAppointmentsByMentorId, fetchMentorById } from "@/lib/firebaseUtils"
import { FirestoreMentor, MentorshipAppointment } from "@/lib/types"
import { Plus } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function MentorDetailPage() {
  const params = useParams<{ mentorId: string }>()
  const router = useRouter()
  const [mentor, setMentor] = useState<FirestoreMentor>()
  const [mentorshipAppointments, setMentorshipAppointments] = useState<MentorshipAppointment[]>()

  useEffect(() => {
    fetchMentorById(params.mentorId).then((m) => {
      if (m) {
        setMentor(m)
      }
    })

    fetchMentorshipAppointmentsByMentorId(params.mentorId).then((m) => {
      if (m) {
        setMentorshipAppointments(m)
      }
    })
  }, [params.mentorId])

  const handleOnClickAddAppointment = (mentorId: string) => {
    router.push(`/mentorship/add?mentorId=${mentorId}`)
  }

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
        <div className="flex justify-between items-center">
          <h2 className="font-bold">Mentoring Schedule</h2>
          <button className="flex items-center gap-1 text-sm border rounded-full px-3 py-1 hover:bg-primary/90"
          onClick={() => handleOnClickAddAppointment(params.mentorId)}
          >Add Schedule
            <Plus />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          {mentorshipAppointments?.map((mentorshipAppointment) => (
            <MentorshipAppointmentCardComponent key={mentorshipAppointment.id} mentorshipAppointment={mentorshipAppointment} />
          ))}
        </div>
      </div>
    </div>
  )
}