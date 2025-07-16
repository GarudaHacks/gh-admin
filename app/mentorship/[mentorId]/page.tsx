"use client"

import { useParams } from "next/navigation"
import { useEffect } from "react"

export default function MentorDetailPage() {
  const params = useParams<{ mentorId: string }>()

  useEffect(() => {
    console.log("prams", params.mentorId)
  }, [])

  return (
    <div>
      {params.mentorId}
    </div>
  )
}