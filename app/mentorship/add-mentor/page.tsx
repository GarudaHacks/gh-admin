"use client"

import { auth } from "@/lib/firebase"
import { Check, Copy, ImagePlus, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRef, useState } from "react"
import MentorPictureCropModal from "@/components/MentorPictureCropModal"

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
  password?: string
  upgraded?: boolean
}

export default function AddMentorPage() {
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [mentorTitle, setMentorTitle] = useState("")
  const [specialization, setSpecialization] = useState(SPECIALIZATIONS[0])
  const [discordUsername, setDiscordUsername] = useState("")
  const [intro, setIntro] = useState("")

  const [loading, setLoading] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState("")
  const [existingEmail, setExistingEmail] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedMentor | null>(null)
  const [copied, setCopied] = useState(false)

  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null)
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pictureWarning, setPictureWarning] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setRawImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleCropCancel = () => {
    setRawImageSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleCropConfirm = (blob: Blob) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCroppedBlob(blob)
    setPreviewUrl(URL.createObjectURL(blob))
    setRawImageSrc(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleRemovePicture = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCroppedBlob(null)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const uploadMentorPicture = async (uid: string, token: string) => {
    if (!croppedBlob) return

    try {
      const formData = new FormData()
      formData.append("file", croppedBlob, "picture.png")

      const res = await fetch(`/api/mentors/${uid}/picture`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        setPictureWarning(
          data.reason || "Mentor created, but the picture failed to upload."
        )
      }
    } catch {
      setPictureWarning("Mentor created, but the picture failed to upload.")
    }
  }

  const submit = async (upgradeExisting: boolean) => {
    setError("")
    setPictureWarning("")
    if (upgradeExisting) setUpgrading(true)
    else setLoading(true)

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
          mentorTitle,
          specialization,
          discordUsername,
          intro,
          upgradeExisting,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.ok) {
        // Duplicate email on a create: offer to upgrade the existing user
        // instead of just showing an error.
        if (!upgradeExisting && data.code === "email-exists") {
          setExistingEmail(email)
          return
        }
        setError(data.reason || "Something went wrong. Try again.")
        return
      }

      await uploadMentorPicture(data.uid, token)

      setExistingEmail(null)
      setCreated({
        email: data.email,
        displayName: data.displayName,
        password: data.password,
        upgraded: data.upgraded === true,
      })
    } catch {
      setError("Something went wrong. Try again.")
    } finally {
      if (upgradeExisting) setUpgrading(false)
      else setLoading(false)
    }
  }

  const handleSubmit = () => submit(false)

  const handleCopy = async () => {
    if (!created?.password) return
    await navigator.clipboard.writeText(created.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetForm = () => {
    setEmail("")
    setDisplayName("")
    setMentorTitle("")
    setSpecialization(SPECIALIZATIONS[0])
    setDiscordUsername("")
    setIntro("")
    setCreated(null)
    setError("")
    setExistingEmail(null)
    handleRemovePicture()
    setPictureWarning("")
  }

  if (created) {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <div>
          <h1 className="text-xl">
            {created.upgraded ? "Mentor Upgraded" : "Mentor Created"}
          </h1>
          <p className="text-muted-foreground">
            {created.upgraded ? (
              <>
                {created.displayName} ({created.email}) is now a mentor. They keep
                their existing login — no new password is generated.
              </>
            ) : (
              <>
                {created.displayName} ({created.email}) now has a login. Share the
                password below — it is shown only once and is not stored anywhere.
              </>
            )}
          </p>
        </div>

        {created.upgraded ? (
          <div className="flex flex-col gap-1 border border-gray-400 rounded-xl p-4">
            <span className="font-semibold text-sm">Existing account upgraded</span>
            <p className="text-muted-foreground text-sm">
              This user was already registered, so they sign in with their current
              email and password. They now have mentor access (role: mentor) and a
              mentor profile.
            </p>
          </div>
        ) : (
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
        )}

        {pictureWarning && (
          <span className="text-yellow-500 text-sm">{pictureWarning}</span>
        )}

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
          <span className="font-semibold text-sm">Profile Picture</span>
          <div className="flex flex-row items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-zinc-50/20 border border-gray-400 overflow-hidden flex items-center justify-center shrink-0">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Mentor profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <ImagePlus size={24} className="text-gray-400" />
              )}
            </div>
            <div className="flex flex-row gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                type="button"
                className="border p-2 rounded-xl text-sm"
              >
                {previewUrl ? "Change Picture" : "Upload Picture"}
              </button>
              {previewUrl && (
                <button
                  onClick={handleRemovePicture}
                  type="button"
                  className="border p-2 rounded-xl text-sm"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              onChange={handleFileSelect}
              type="file"
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-semibold text-sm">Email</span>
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setExistingEmail(null)
              setError("")
            }}
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
          <span className="font-semibold text-sm">Title</span>
          <input
            value={mentorTitle}
            onChange={(e) => setMentorTitle(e.target.value)}
            type="text"
            placeholder="Senior Software Engineer at Acme"
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

        <div className="flex flex-col gap-3 text-center">
          {existingEmail && (
            <div className="flex flex-col gap-3 rounded-xl border border-yellow-600/50 bg-yellow-500/10 p-4 text-left">
              <div className="text-sm">
                <p className="font-semibold">
                  An account with {existingEmail} already exists.
                </p>
                <p className="text-muted-foreground">
                  Upgrade this existing user to a mentor? They keep their current
                  login and password. We&apos;ll grant mentor access (role:
                  mentor) and save the profile above onto their account.
                </p>
              </div>
              <button
                onClick={() => submit(true)}
                disabled={upgrading}
                className="border border-yellow-600/60 p-2 rounded-xl text-sm flex flex-row items-center justify-center gap-1 disabled:opacity-60 hover:bg-yellow-500/10"
                type="button"
              >
                {upgrading && <Loader2 className="animate-spin" size={16} />}
                Upgrade to Mentor
              </button>
            </div>
          )}
          {error && <span className="text-red-500 text-sm">{error}</span>}
          <button
            onClick={handleSubmit}
            disabled={loading || upgrading}
            className="border p-2 rounded-xl text-sm flex flex-row items-center justify-center gap-1 disabled:opacity-60"
            type="button"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            Create Mentor
          </button>
        </div>
      </div>

      {rawImageSrc && (
        <MentorPictureCropModal
          imageSrc={rawImageSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  )
}
