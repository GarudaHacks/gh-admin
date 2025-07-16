import { epochToStringDate } from "@/lib/helpers"
import { AvailableMentoring } from "@/lib/types"
import MentoringSlotsContainer from "./MentoringSlotsContainer";
import { MapPin, Video } from "lucide-react";
import DrawMentorshipSlot from "./DrawMentorshipSlot";

interface MentoringSlotsComponentProps {
  availableMentorings: AvailableMentoring[]
}

export default function MentoringSlotsComponent(
  { availableMentorings }: MentoringSlotsComponentProps
) {

  return (
    <MentoringSlotsContainer>
      {availableMentorings.map((availableMentoring, index) => (
        <DrawMentorshipSlot key={index} index={index} startTime={availableMentoring.startTime} endTime={availableMentoring.endTime}>
          <p>Mentor is available <span className="font-bold">{availableMentoring.location}</span></p>
        </DrawMentorshipSlot>
      ))}
    </MentoringSlotsContainer>
  );
}