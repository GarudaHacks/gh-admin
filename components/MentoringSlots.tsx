import { epochToStringDate } from "@/lib/helpers"
import { AvailableMentoring } from "@/lib/types"
import MentoringSlotsContainer from "./MentoringSlotsContainer";
import { MapPin, Video } from "lucide-react";

interface MentoringSlotsComponentProps {
  availableMentorings: AvailableMentoring[]
}

export default function MentoringSlotsComponent(
  { availableMentorings }: MentoringSlotsComponentProps
) {
  const EPOCH_START_MENTORING = 1753340400;
  const EPOCH_ENDS_MENTORING = 1753448400;

  const TOTAL_DURATION_SECONDS = EPOCH_ENDS_MENTORING - EPOCH_START_MENTORING;
  const TOTAL_DURATION_MINUTES = TOTAL_DURATION_SECONDS / 60;
  const PIXELS_PER_MINUTE = 1.2;
  const TOTAL_HEIGHT = TOTAL_DURATION_MINUTES * PIXELS_PER_MINUTE;
  const HOUR_HEIGHT = 60 * PIXELS_PER_MINUTE;

  return (
    <MentoringSlotsContainer>
      {/* Mentoring slots */}
      {availableMentorings.map((availableMentoring, index) => {
        const startOffset = (availableMentoring.startTime - EPOCH_START_MENTORING) / 60; // minutes from start
        const duration = (availableMentoring.endTime - availableMentoring.startTime) / 60; // duration in minutes
        const topPosition = startOffset * PIXELS_PER_MINUTE;
        const height = duration * PIXELS_PER_MINUTE;

        return (
          <div
            key={index}
            className="absolute flex flex-col text-sm w-fit items-center gap-2 px-2 py-1 border bg-primary opacity-90 rounded-lg cursor-pointer transition-colors z-10"
            style={{
              top: `${topPosition}px`,
              height: `${height}px`,
              right: '8px',
              minHeight: '24px'
            }}
          >
            <div className="flex flex-col gap-2">
              <span className="truncate">
                {epochToStringDate(availableMentoring.startTime)} - {epochToStringDate(availableMentoring.endTime)} WIB
              </span>
              <p className="text-sm">
                Mentor availability is <span className="font-bold">{availableMentoring.location.toUpperCase()}</span>
              </p>
            </div>
          </div>
        );
      })}
    </MentoringSlotsContainer>
  );
}