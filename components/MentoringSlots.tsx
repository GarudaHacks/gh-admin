import { epochToStringDate } from "@/lib/helpers"
import { AvailableMentoring } from "@/lib/types"

interface MentoringSlotsComponentProps {
  availableMentorings: AvailableMentoring[]
}

export default function MentoringSlotsComponent(
  { availableMentorings }: MentoringSlotsComponentProps
) {
  return (
    <div>
      {availableMentorings.map((availableMentoring, index) => {
        return (
          <div key={index} className="text-sm flex gap-2 px-2 border bg-muted rounded-xl">
            <span>{epochToStringDate(availableMentoring.startTime)} WIB - {epochToStringDate(availableMentoring.endTime)} WIB</span>
          </div>
        )
      }
      )}
    </div>
  )
}