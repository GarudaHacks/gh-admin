import { EPOCH_START_MENTORING, HOUR_HEIGHT, TOTAL_DURATION_MINUTES, TOTAL_HEIGHT } from "@/config";
import { epochToStringDate } from "@/lib/helpers";
import { ReactNode } from "react";

export default function MentoringSlotsContainer(
  { children }: { children: ReactNode }
) {

  // Generate hour marks
  const hourMarks = [];
  const totalHours = Math.ceil(TOTAL_DURATION_MINUTES / 60);

  for (let i = 0; i <= totalHours; i++) {
    const hourEpoch = EPOCH_START_MENTORING + (i * 3600); // 3600 seconds = 1 hour
    const topPosition = i * HOUR_HEIGHT;

    hourMarks.push(
      <div
        key={i}
        className="absolute text-sm text-gray-500 p-2 flex w-full"
        style={{ top: `${topPosition}px` }}
      >
        <div className="w-1/5 -translate-y-2">
          {epochToStringDate(hourEpoch)}
        </div>
        <div className="border-t w-full h-1">
        </div>
      </div>
    );
  }
  return (
    <div>
      <div
        className=" p-4 rounded-xl relative overflow-hidden"
        style={{
          height: `${TOTAL_HEIGHT}px`,
          minHeight: '400px',
        }}
      >
        {hourMarks}
        <div className="w-3/5">
          {children}
        </div>
      </div>
    </div>
  )
}