"use client"

import DrawMentorshipSlot from "@/components/DrawMentorshipSlot"
import MentoringSlotsContainer from "@/components/MentoringSlotsContainer"
import { fetchBookedMentorshipSlotsByMentorId, fetchMentorById } from "@/lib/firebaseUtils"
import { AvailableMentoring, FirestoreMentor, MentorshipAppointment } from "@/lib/types"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

export default function MentorDetailPage() {
  const params = useParams<{ mentorId: string }>()

  const [mentor, setMentor] = useState<FirestoreMentor>()
  const [availableMentorings, setAvailableMentorings] = useState<AvailableMentoring[]>()

  const [bookedSlots, setBookedSlots] = useState<MentorshipAppointment[]>()

  useEffect(() => {
    fetchMentorById(params.mentorId).then((m) => {
      if (m) {
        setMentor(m)
        setAvailableMentorings(m.availableMentorings)
      }
    })

    fetchBookedMentorshipSlotsByMentorId(params.mentorId).then((m) => {
      if (m) {
        setBookedSlots(m)
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
        <h2 className="font-bold">Mentoring Schedule</h2>
        <MentoringSlotsContainer>
          {availableMentorings && availableMentorings.map((availableMentoring, index) => (
            <DrawMentorshipSlot key={index} index={index} startTime={availableMentoring.startTime} endTime={availableMentoring.endTime}>
              <p>Mentor is available <span className="font-bold">{availableMentoring.location}</span></p>
            </DrawMentorshipSlot>
          ))}

          {bookedSlots?.map((bookedSlot, index) => (
            <DrawMentorshipSlot key={index} index={index} startTime={bookedSlot.startTime} endTime={bookedSlot.endTime} asBooking>
            </DrawMentorshipSlot>
          ))}
        </MentoringSlotsContainer>
      </div>
    </div>
  )
}