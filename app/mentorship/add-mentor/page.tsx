"use client"

import { auth } from "@/lib/firebase"
import { Check, Copy, Loader2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const SPECIALIZATIONS = [
  "developer",
  "backend",
  "frontend",
  "data scientist",
  "designer",
  "product manager",
  "entrepreneur",
  "other",
]

interface CreatedMentor {
  email: string
  displayName: string
  password: string
}

export default function AddMentorPage() {
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[0])
  const [discordUsername, setDiscordUsername] = useState("")
  const [intro, setIntro] = useState("")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<CreatedMentor | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    setError("")
    setLoading(true)

    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) {
        setError("You must be signed in to add a mentor.")
        return
      }

      const res = await fetch("/api/mentors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          displayName,
          specialization,
          discordUsername,
          intro,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.reason || "Something went wrong. Try again.")
        return
      }

      setCreated({
        email: data.email,
        displayName: data.displayName,
        password: data.password,
      })
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!created) return
    await navigator.clipboard.writeText(created.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setEmail("")
    setDisplayName("")
    setSpecialization(SPECIALIZATIONS[0])
    setDiscordUsername("")
    setIntro("")
    setCreated(null)
    setError("")
  }

  if (created) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <div>
          <h1 className="text-xl">Mentor Created</h1>
          <p className="text-muted-foreground">
            {created.displayName} ({created.email}) now has a login. Share the
            password below — it is shown only once and is not stored anywhere.
          </p>
        </div>

        <div className="flex flex-col gap-2 border border-gray-400 rounded-xl p-4">
          <span className="font-semibold text-sm">Generated Password</span>
          <div className="flex flex-row items-center gap-2">
            <code className="flex-1 p-2 rounded-lg bg-zinc-50/20 font-mono break-all">
              {created.password}
            </code>
            <button
              onClick={handleCopy}
              className="border p-2 rounded-lg flex items-center gap-1 text-sm"
              type="button"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-muted-foreground text-sm">
            The mentor can sign in with their email and this password, then reset
            it from the portal.
          </p>
        </div>

        <div className="flex flex-row gap-2">
          <button
            onClick={resetForm}
            className="border p-2 rounded-xl text-sm flex-1"
            type="button"
          >
            Add Another Mentor
          </button>
          <Link
            href="/mentorship"
            className="border p-2 rounded-xl text-sm flex-1 text-center"
          >
            Back to Mentorship
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl">Add Mentor</h1>
        <p className="text-muted-foreground">
          Fill in the mentor&apos;s details. This creates their login and returns
          a one-time password to share with them.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-xl">
        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="mentor@example.com"
            className="p-2 rounded-xl bg-zinc-50/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Display Name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            type="text"
            placeholder="Jane Doe"
            className="p-2 rounded-xl bg-zinc-50/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Specialization</span>
          <select
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            className="p-2 rounded-xl bg-zinc-50/20"
          >
            {SPECIALIZATIONS.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Discord Username</span>
          <input
            value={discordUsername}
            onChange={(e) => setDiscordUsername(e.target.value)}
            type="text"
            placeholder="janedoe"
            className="p-2 rounded-xl bg-zinc-50/20"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Introduction</span>
          <textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={3}
            placeholder="A short bio shown to hackers."
            className="p-2 rounded-xl bg-zinc-50/20"
          />
        </div>

        <div className="flex flex-col gap-2 text-center">
          {error && <span className="text-red-500 text-sm">{error}</span>}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="border p-2 rounded-xl text-sm flex flex-row items-center justify-center gap-1 disabled:opacity-60"
            type="button"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            Create Mentor
          </button>
        </div>
      </div>
    </div>
  )
}
