import { useEffect, useState } from "react"
import { CombinedApplicationData, fetchApplicationsWithUsers } from "@/lib/firebaseUtils"

interface ApplicationAcceptModalProps {
    setShowAcceptModal: (value: boolean) => void
}

export default function ApplicationAcceptModal({ setShowAcceptModal }: ApplicationAcceptModalProps) {
    const [minScore, setMinScore] = useState<number | undefined>(undefined)
    const [minScoreError, setMinScoreError] = useState("")
    const [combinedApplications, setCombinedApplications] = useState<CombinedApplicationData[]>([])

    const onChangeMinScore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value)
        if (value < 0 || value > 10) {
            setMinScoreError("Score must be between 0 and 10")
        } else {
            setMinScore(value)
            setMinScoreError("")
        }
    }

    useEffect(() => {
        const scoreFilter = minScore === 0 ? undefined : minScore;
        fetchApplicationsWithUsers("submitted", scoreFilter).then((applications) => {
            setCombinedApplications(applications.filter(app => app.score !== undefined))
        })
    }, [minScore])

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            Accept Participants
                        </h2>
                        <p className="text-white/80 text-sm">Bulk accept participants based on scores, status, and other criteria.</p>
                    </div>
                    <button
                        onClick={() => setShowAcceptModal(false)}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <svg
                            className="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2 flex flex-row gap-4 justify-between items-start">
                        <p className="text-white/80 font-bold">
                            Score threshold to accept applicants:
                        </p>
                        <div className="flex flex-col gap-1 w-full">
                            <input
                                type="number"
                                className="bg-transparent border border-white/20 rounded-md px-4 py-2 text-white w-full"
                                placeholder="Minimum score"
                                min={0}
                                max={10}
                                onChange={onChangeMinScore}
                            />
                            <span className="text-red-500 text-xs text-end">{minScoreError}</span>
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/20 rounded-md p-4">
                        {combinedApplications.map((application) => (
                            <div key={application.id}>{application.id}</div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                    <button
                        onClick={() => setShowAcceptModal(false)}
                        className="px-4 py-2 border border-white/20 text-white/80 rounded-md hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        disabled
                        className="px-4 py-2 bg-accent-accessible/50 text-white rounded-md opacity-50 cursor-not-allowed"
                    >
                        Accept Selected
                    </button>
                </div>
            </div>
        </div>
    )
}