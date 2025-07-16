import { EPOCH_START_MENTORING, PIXELS_PER_MINUTE } from "@/config";
import { epochToStringDate } from "@/lib/helpers";
import { ReactNode } from "react";

interface DrawMentorshipSlotProps {
  index: number
  startTime: number
  endTime: number
  children?: ReactNode
}

export default function DrawMentorshipSlot(
  { startTime, endTime, index, children }: DrawMentorshipSlotProps
) {
  const startOffset = (startTime - EPOCH_START_MENTORING) / 60; // minutes from start
  const duration = (endTime - startTime) / 60; // duration in minutes
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
          {epochToStringDate(startTime)} - {epochToStringDate(endTime)} WIB
        </span>
        {children}
      </div>
    </div>
  );
}