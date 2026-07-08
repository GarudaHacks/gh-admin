"use client"

import MentorPictureCropModal from "@/components/MentorPictureCropModal"
import MentorshipAppointmentCardComponent from "@/components/MentorshipAppointmentCardComponent"
import { auth } from "@/lib/firebase"
import { fetchMentorshipAppointmentsByMentorId, fetchMentorById, getMentorProfilePicture } from "@/lib/firebaseUtils"
import { FirestoreMentor, MentorshipAppointment } from "@/lib/types"
import { Camera, Loader2, Plus } from "lucide-react"
import Image from "next/image"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import ghq from "@/public/assets/ghq.png"

export default function MentorDetailPage() {
  const params = useParams<{ mentorId: string }>()
  const router = useRouter()
  const [mentor, setMentor] = useState<FirestoreMentor>()
  const [mentorshipAppointments, setMentorshipAppointments] = useState<MentorshipAppointment[]>()
  const [mentorUrl, setMentorUrl] = useState<string>('')
  const [error, setError] = useState('')

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [pictureError, setPictureError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchMentorById(params.mentorId).then((m) => {
      if (m) {
        setMentor(m)

        getMentorProfilePicture(m.displayName).then((pp) => {
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
    }).catch((err) => {
      console.error(err)
      setError('Failed to load mentoring schedule. Please refresh the page.')
    })


  }, [params.mentorId])

  const handleOnClickAddAppointment = (mentorId: string) => {
    router.push(`/mentorship/add?mentorId=${mentorId}`)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setRawImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCropCancel = () => {
    setRawImageSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleCropConfirm = async (blob: Blob) => {
    setRawImageSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    setPictureError('')
    setUploadingPicture(true)

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        setPictureError("You must be signed in to update the picture.")
        return
      }

      const formData = new FormData()
      formData.append("file", blob, "picture.png")

      const res = await fetch(`/api/mentors/${params.mentorId}/picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        setPictureError(data.reason || "Failed to upload the picture.")
        return
      }

      if (mentor) {
        getMentorProfilePicture(mentor.displayName).then((pp) => {
          if (pp) setMentorUrl(pp)
        })
      }
    } catch {
      setPictureError("Failed to upload the picture.")
    } finally {
      setUploadingPicture(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">

      <div className="flex flex-col gap-6 p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold ">Mentor Profile</h1>
        <div className="flex flex-col md:flex-row gap-6 shadow-lg rounded-xl p-6 border border-gray-100">
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <div className="relative w-40 h-40">
              <Image
                src={mentorUrl || "https://garudahacks.com/images/logo/ghq.png"}
                alt={`Profile picture of ${mentor?.displayName || 'mentor'}`}
                width={160}
                height={160}
                onError={() => setMentorUrl(ghq.src)}
                className="rounded-full w-40 h-40 object-cover border-2 border-gray-200"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
                type="button"
                title="Change picture"
                className="absolute bottom-1 right-1 bg-background border border-border rounded-full p-2 hover:bg-zinc-50/10 disabled:opacity-60"
              >
                {uploadingPicture ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
              </button>
              <input
                ref={fileInputRef}
                onChange={handleFileSelect}
                type="file"
                accept="image/*"
                className="hidden"
              />
            </div>
            {pictureError && (
              <span className="text-red-500 text-xs text-center max-w-40">{pictureError}</span>
            )}
          </div>
          <div className="flex flex-col gap-4 w-full">
            {mentor?.displayName && (
              <h2 className="text-2xl font-semibold ">{mentor.displayName}</h2>
            )}
            {mentor?.mentorTitle && (
              <p className="text-sm text-muted-foreground -mt-3">{mentor.mentorTitle}</p>
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

        {error && <span className="text-red-500 text-sm">{error}</span>}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {mentorshipAppointments?.map((mentorshipAppointment) => (
            <MentorshipAppointmentCardComponent key={mentorshipAppointment.id} mentorshipAppointment={mentorshipAppointment} />
          ))}
        </div>
      </div>

      {rawImageSrc && (
        <MentorPictureCropModal
          imageSrc={rawImageSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  )
}