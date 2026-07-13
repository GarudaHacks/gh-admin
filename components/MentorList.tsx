import { fetchMentors } from "@/lib/firebaseUtils"
import { auth } from "@/lib/firebase"
import { FirestoreMentor } from "@/lib/types"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Search, UserPlus } from "lucide-react"
import MentorItemComponent from "./MentorItemComponent"
import ConfirmDialog from "./ConfirmDialog"

export default function MentorListComponent() {
  const [mentors, setMentors] = useState<FirestoreMentor[]>()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [mentorToDelete, setMentorToDelete] = useState<FirestoreMentor | null>(null)
  const [search, setSearch] = useState("")
  const [specialization, setSpecialization] = useState("all")

  const requestDelete = (mentor: FirestoreMentor) => {
    if (!mentor.id) return
    setMentorToDelete(mentor)
  }

  const cancelDelete = () => {
    setMentorToDelete(null)
  }

  const confirmDelete = async () => {
    const mentor = mentorToDelete
    if (!mentor?.id) return

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
      setMentorToDelete(null)
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

  const filteredMentors = useMemo(() => {
    if (!mentors) return undefined
    const q = search.trim().toLowerCase()
    return mentors.filter((m) => {
      const matchesSpec =
        specialization === "all" ||
        m.specialization?.toLowerCase() === specialization
      const matchesSearch =
        !q ||
        m.displayName?.toLowerCase().includes(q) ||
        m.email?.toLowerCase().includes(q)
      return matchesSpec && matchesSearch
    })
  }, [mentors, search, specialization])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <h1 className="text-xl font-semibold">
            All Mentors ({mentors?.length ?? 0})
          </h1>
          <Link
            href="/mentorship/add-mentor"
            className="border border-border rounded-xl px-3 py-2 text-sm flex flex-row items-center gap-1 hover:bg-zinc-50/10"
          >
            <UserPlus size={16} />
            Add Mentor
          </Link>
        </div>

        {/* Search + specialization filter */}
        <div className="flex flex-col gap-3">
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-xl border border-border bg-input pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSpecialization("all")}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                specialization === "all"
                  ? "border-primary bg-primary/15 text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-primary/60"
              }`}
            >
              All
            </button>
            {specializations.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setSpecialization(spec)}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                  specialization === spec
                    ? "border-primary bg-primary/15 text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/60"
                }`}
              >
                {spec}
              </button>
            ))}
          </div>
        </div>

        {mentors === undefined ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="animate-spin" size={16} />
            Loading mentors…
          </div>
        ) : filteredMentors && filteredMentors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            {mentors.length === 0
              ? "No mentors yet. Click “Add Mentor” to create one."
              : "No mentors match your search or filter."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMentors?.map((m) => (
              <MentorItemComponent
                key={m.id}
                mentor={m}
                onDelete={requestDelete}
                deleting={deletingId === m.id}
              />
            ))}
          </div>
        )}
      </div>

      {mentorToDelete && (
        <ConfirmDialog
          title="Delete Mentor"
          description={`Delete ${mentorToDelete.displayName}? This removes their login and profile permanently.`}
          confirmLabel="Delete"
          loading={deletingId === mentorToDelete.id}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  )
}