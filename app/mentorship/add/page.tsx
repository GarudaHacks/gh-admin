"use client"

import { fetchMentorById } from "@/lib/firebaseUtils"
import { dateToStringTime, epochToStringDate } from "@/lib/helpers"
import { FirestoreMentor } from "@/lib/types"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css";

export default function AddMentorshipAppointmentPage() {
  const TIME_INTERVAL = 15
  const params = useSearchParams()
  const mentorId = params.get('mentorId')

  const [mentor, setMentor] = useState<FirestoreMentor | null>()
  const [mentorName, setMentorName] = useState<string | undefined>('')

  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [nTime, setNTime] = useState<number | undefined>(1)
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [appointmentType, setAppointmentType] = useState<string>('');
  const [error, setError] = useState('')

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAppointmentType(event.target.value);
  };

  const handleSubmit = async () => {
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
            <input type="radio" name="appointmentType" value={"offline"} id="offline" checked={appointmentType === 'offline'} onChange={handleTypeChange} />
            <label htmlFor="offline">Offline</label>
          </div>
          <div className="flex flex-row gap-1">
            <input type="radio" name="appointmentType" value={"online"} id="online" checked={appointmentType === 'online'} onChange={handleTypeChange} />
            <label htmlFor="online">Online</label>
          </div>
        </div>

        <div>
          <button onClick={handleSubmit} className="border p-2 rounded-xl text-sm" type="submit">Add Slot</button>
        </div>
      </div>
    </div>
  )
}