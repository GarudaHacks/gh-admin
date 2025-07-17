import { EPOCH_START_MENTORING, PIXELS_PER_MINUTE } from "@/config";
import { epochToStringDate } from "@/lib/helpers";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode, useState } from "react";

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

  const [openDetail, setOpenDetail] = useState(false)

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
      onClick={() => setOpenDetail(!openDetail)}
    >
      <div className="flex flex-col gap-2">
        <div className="flex justify-between gap-2 items-center w-full">
          <p>{asBooking && <span className="font-bold">Booked{" -- "}</span> }{epochToStringDate(startTime)} - {epochToStringDate(endTime)} WIB</p>
          <button >
            {openDetail ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
        <div className={`${openDetail ? 'block' : 'hidden'} bg-gray-700 max-w-xl p-4 rounded-xl`}>
          {children}
        </div>
      </div>
    </div>
  );
}