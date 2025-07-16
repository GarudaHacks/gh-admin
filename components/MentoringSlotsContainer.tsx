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
        className="absolute left-0 right-0 border-t border-gray-300 text-sm text-gray-500 p-2"
        style={{ top: `${topPosition}px` }}
      >
        {epochToStringDate(hourEpoch)}
      </div>
    );
  }
  return (
    <div>
      <div
        className="border p-4 rounded-xl relative overflow-hidden"
        style={{
          height: `${TOTAL_HEIGHT}px`,
          minHeight: '400px',
        }}
      >
        <div className="absolute inset-0">
          {hourMarks}
        </div>
        {children}
      </div>
    </div>
  )
}