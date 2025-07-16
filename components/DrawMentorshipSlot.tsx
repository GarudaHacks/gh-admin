import { EPOCH_START_MENTORING, PIXELS_PER_MINUTE } from "@/config";
import { epochToStringDate } from "@/lib/helpers";
import { ReactNode } from "react";

interface DrawMentorshipSlotProps {
  index: number
  startTime: number
  endTime: number
  children?: ReactNode
  asBooking?: boolean
}

export default function DrawMentorshipSlot(
  { startTime, endTime, index, children, asBooking }: DrawMentorshipSlotProps
) {
  const startOffset = (startTime - EPOCH_START_MENTORING) / 60; // minutes from start
  const duration = (endTime - startTime) / 60; // duration in minutes
  const topPosition = startOffset * PIXELS_PER_MINUTE;
  const height = duration * PIXELS_PER_MINUTE;

  return (
    <div
      key={index}
      className={`absolute flex flex-col text-sm items-center gap-2 px-2 py-1 border opacity-90 rounded-lg cursor-pointer transition-colors z-10 ${asBooking ? 'bg-primary' : 'bg-zinc-700 border-dashed rounded-l-none'}`}
      style={{
        top: `${topPosition}px`,
        height: `${height}px`,
        minHeight: '24px',
        width: `${asBooking ? '50%' : '20%'}`,
        right: `${asBooking ? '20%' : '0'}`
      }}
    >
      <div className="flex flex-col gap-2">
        <p>{epochToStringDate(startTime)} - {epochToStringDate(endTime)} WIB</p>
        {children}
      </div>
    </div>
  );
}