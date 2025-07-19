"use client"

import MentorshipAppointmentCardComponent from "@/components/MentorshipAppointmentCardComponent"
import { fetchMentorshipAppointmentsByMentorId, fetchMentorById, getMentorProfilePicture } from "@/lib/firebaseUtils"
import { FirestoreMentor, MentorshipAppointment } from "@/lib/types"
import { Plus } from "lucide-react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import ghq from "@/public/assets/ghq.png"

export default function MentorDetailPage() {
  const params = useParams<{ mentorId: string }>()
  const router = useRouter()
  const [mentor, setMentor] = useState<FirestoreMentor>()
  const [mentorshipAppointments, setMentorshipAppointments] = useState<MentorshipAppointment[]>()
  const [mentorUrl, setMentorUrl] = useState<string>('')

  useEffect(() => {
    fetchMentorById(params.mentorId).then((m) => {
      if (m) {
        setMentor(m)

        getMentorProfilePicture(m.name).then((pp) => {
          if (pp) {
            setMentorUrl(pp)
          }
        })
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
          <Image
            src={mentorUrl || "https://garudahacks.com/images/logo/ghq.png"}
            alt={`Profile picture of ${mentor?.name || 'mentor'}`}
            width={200}
            height={200}
            onError={() => {
              setMentorUrl(ghq.src)
            }}
            className="rounded-full w-64 aspect-square"
          />
          {mentor?.name && <h2 className="text-2xl font-bold">{mentor?.name}</h2>}
          {mentor?.email && <h3 className="text-muted-foreground">{mentor?.email}</h3>}
          {mentor?.discordUsername && <p className="">Discord: <span className="text-muted-foreground font-mono w-fit p-1 rounded-full text-sm">{mentor?.discordUsername}</span></p>}
          {mentor?.specialization && <p className="">Specialization: {mentor?.specialization.toUpperCase()}</p>}
          <div>
            <p className="font-semibold text-muted-foreground">Intro</p>
            <p className="text-sm">{mentor?.intro}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="font-bold">Mentoring Schedule ({mentorshipAppointments?.length})</h2>
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