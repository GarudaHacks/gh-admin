import { fetchMentors } from "@/lib/firebaseUtils"
import { auth } from "@/lib/firebase"
import { FirestoreMentor, FirestoreUser } from "@/lib/types"
import { useEffect, useState } from "react"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import Separator from "./Separator"
import MentorItemComponent from "./MentorItemComponent"

export default function MentorListComponent() {
  const [mentors, setMentors] = useState<FirestoreMentor[]>()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (mentor: FirestoreMentor) => {
    if (!mentor.id) return
    const confirmed = window.confirm(
      `Delete ${mentor.displayName}? This removes their login and profile permanently.`
    )
    if (!confirmed) return

    setDeletingId(mentor.id)
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        alert("You must be signed in to delete a mentor.")
        return
      }

      const res = await fetch(`/api/mentors/${mentor.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        alert(data.reason || "Failed to delete mentor.")
        return
      }

      setMentors((prev) => prev?.filter((m) => m.id !== mentor.id))
    } catch {
      alert("Something went wrong. Try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const specializations = [
    "developer",
    "backend",
    "frontend",
    "data scientist",
    "designer",
    "product manager",
    "entrepreneur",
    "other"
  ]

  useEffect(() => {
    try {
      fetchMentors().then((result) => {
        setMentors(result)
      });
    } catch (error) {
      console.log(error)
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <h1 className="text-xl font-semibold">All Mentors ({mentors?.length})</h1>
          <Link
            href="/mentorship/add-mentor"
            className="border rounded-xl px-3 py-2 text-sm flex flex-row items-center gap-1 hover:bg-zinc-50/10"
          >
            <UserPlus size={16} />
            Add Mentor
          </Link>
        </div>
        <div className="rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {mentors?.map((m, index) => (
            <MentorItemComponent
              key={index}
              mentor={m}
              onDelete={handleDelete}
              deleting={deletingId === m.id}
            />
          ))}
        </div>
      </div>

    </div>
  )
}