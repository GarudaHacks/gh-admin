import { epochToStringDate } from "@/lib/helpers"
import { MentorshipAppointment } from "@/lib/types"
import Separator from "./Separator"

interface MentorshipAppointmentCardComponentProps {
  mentorshipAppointment: MentorshipAppointment
}

export default function MentorshipAppointmentCardComponent(
  { mentorshipAppointment }: MentorshipAppointmentCardComponentProps
) {
  return (
    <div className="border bg-zinc-50/10 rounded-xl p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        {mentorshipAppointment.hackerId ? <span className="border rounded-full py-1 px-2 text-xs bg-green-500">Booked</span> : <span className="border rounded-full py-1 px-2 text-xs">Available</span>}
      <p className="text-end text-sm text-muted-foreground">Mentoring ID : {mentorshipAppointment.id}</p>
      </div>
      <div>
        {epochToStringDate(mentorshipAppointment.startTime)} - {epochToStringDate(mentorshipAppointment.endTime)} <span className="font-bold">{(mentorshipAppointment.endTime - mentorshipAppointment.startTime) / 60} minutes</span>
      </div>
      <Separator />
      <div className="text-sm">
        {mentorshipAppointment.hackerDescription}
      </div>
    </div>
  )
}