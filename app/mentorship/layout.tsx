"use client"

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

export default function MentorDetailLayout(
  { children }: { children: ReactNode }
) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4">
      <div>
        <button className="flex flex-row items-center justify-center gap-1 border p-2 rounded-lg text-md" onClick={() => router.back()}>
          <ChevronLeft />
          <span>Back</span>
        </button>
      </div>
      {children}
    </div>
  )
}