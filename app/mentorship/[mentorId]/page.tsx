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

      <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold ">Mentor Profile</h1>
        <div className="flex flex-col md:flex-row gap-6 shadow-lg rounded-xl p-6 border border-gray-100">
          <div className="flex-shrink-0 flex justify-center">
            <Image
              src={mentorUrl || "https://garudahacks.com/images/logo/ghq.png"}
              alt={`Profile picture of ${mentor?.name || 'mentor'}`}
              width={160}
              height={160}
              onError={() => setMentorUrl(ghq.src)}
              className="rounded-full w-40 h-40 object-cover border-2 border-gray-200"
            />
          </div>
          <div className="flex flex-col gap-4 w-full">
            {mentor?.name && (
              <h2 className="text-2xl font-semibold ">{mentor.name}</h2>
            )}
            {mentor?.email && (
              <p className=" text-sm">
                <span className="font-medium">Email:</span> {mentor.email}
              </p>
            )}
            {mentor?.discordUsername && (
              <p className=" text-sm">
                <span className="font-medium">Discord:</span>{' '}
                <span className=" font-mono px-2 py-1 rounded-md text-sm">
                  {mentor.discordUsername}
                </span>
              </p>
            )}
            {mentor?.specialization && (
              <p className=" text-sm">
                <span className="font-medium">Specialization:</span>{' '}
                <span className="uppercase font-semibold ">
                  {mentor.specialization}
                </span>
              </p>
            )}
            {mentor?.intro && (
              <div className="mt-2">
                <p className="font-medium ">Introduction</p>
                <p className="text-sm leading-relaxed">{mentor.intro}</p>
              </div>
            )}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {mentorshipAppointments?.map((mentorshipAppointment) => (
            <MentorshipAppointmentCardComponent key={mentorshipAppointment.id} mentorshipAppointment={mentorshipAppointment} />
          ))}
        </div>
      </div>
    </div>
  )
}