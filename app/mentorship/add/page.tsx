"use client"

import { addMentorshipAppointment, fetchMentorById } from "@/lib/firebaseUtils"
import { dateToStringTime, epochToStringDate } from "@/lib/helpers"
import { FirestoreMentor, MentorshipAppointment } from "@/lib/types"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css";

export default function AddMentorshipAppointmentPage() {
  const router = useRouter()
  const TIME_INTERVAL = 15
  const params = useSearchParams()
  const mentorId = params.get('mentorId')

  const [mentor, setMentor] = useState<FirestoreMentor | null>()
  const [mentorName, setMentorName] = useState<string | undefined>('')
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [nTime, setNTime] = useState<number>(1)
  const [appointmentType, setAppointmentType] = useState<string>('online');
  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAppointmentType(event.target.value);
  };

  const handleSubmit = async () => {
    setLoading(true)

    try {
      if (nTime <= 0) {
        setError('Must create minimum 1 slot')
        return
      } else {
        setError('')
      }

      if (!startDate) {
        setError('Start date cannot be empty')
        return
      }

      if (!mentorId) {
        setError('Mentor Id cannot be empty')
        return
      }

      if (!location) {
        setError('Location cannot be empty')
        return
      }
      addMentorshipAppointment(startDate.getTime() / 1000, mentorId, appointmentType).then((res) => {
        router.replace(`/mentorship/${mentorId}`)
      })
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (mentorId) {
      fetchMentorById(mentorId).then((result) => {
        setMentor(result)
        setMentorName(result?.name)
      })
    }
  }, [mentorId])


  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl">Add Mentorship Appointment Slot</h1>
        <p className="text-muted-foreground">Add mentorship slots that can be booked immediately by hackers.</p>
      </div>

      <div className="flex flex-col gap-4 max-w-xl">
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Mentor Name</span>
          <input value={mentorName} onChange={e => setMentorName(e.target.value)} disabled type="text" className="p-2 rounded-xl bg-zinc-50/20" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Start Time</span>
          <div className="flex flex-row items-center gap-4">
            <DatePicker
              selected={startDate}
              onChange={(date: Date | null) => date && setStartDate(date)}
              showTimeSelect
              timeIntervals={15}
              className="bg-zinc-50/20 p-2 rounded-lg"
            />
            <span>{dateToStringTime(startDate || new Date())}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Create For N Times</span>
          <input value={nTime} onChange={e => setNTime(Number(e.target.value))} type="number" className="p-2 rounded-xl bg-zinc-50/20" />
          {startDate && <p className="text-muted-foreground text-sm">This will create {nTime} slot(s) with interval {TIME_INTERVAL} minutes starting from {epochToStringDate(startDate.getTime() / 1000)}</p>}

        </div>

        <div>
          <div className="flex flex-row gap-1">
            <input type="radio" name="appointmentType" value={"online"} id="online" checked={appointmentType === 'online'} onChange={handleTypeChange} />
            <label htmlFor="online">Online</label>
          </div>
          <div className="flex flex-row gap-1">
            <input type="radio" name="appointmentType" value={"offline"} id="offline" checked={appointmentType === 'offline'} onChange={handleTypeChange} />
            <label htmlFor="offline">Offline</label>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-center">
          {error && <span className="text-red-500 text-sm">{error}</span>}
          <button onClick={handleSubmit} className="border p-2 rounded-xl text-sm flex flex-row items-center justify-center gap-1" type="button">
            {loading && <Loader2 className="" />}
            Add Slot
          </button>
        </div>
      </div>
    </div>
  )
}