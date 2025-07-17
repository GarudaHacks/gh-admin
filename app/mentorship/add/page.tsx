"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"

export default function AddMentorshipAppointmentPage() {
  const params = useParams<{ mentorId: string }>()

  useEffect(() => {

  }, [params.mentorId])

  return (
    <div>
      <div>
        <h1 className="text-xl">Add Mentorship Appointment Slot</h1>
        <p className="text-muted-foreground">Add a mentorship slot for a mentor that can be booked immediately by hackers.</p>
      </div>
      
      <div>

      </div>

    </div>
  )
}