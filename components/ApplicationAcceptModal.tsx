import { useState } from "react"

interface ApplicationAcceptModalProps {
    setShowAcceptModal: (value: boolean) => void
}

export default function ApplicationAcceptModal({ setShowAcceptModal }: ApplicationAcceptModalProps) {
    const [minScore, setMinScore] = useState(0)
    const [minScoreError, setMinScoreError] = useState("")

    const onChangeMinScore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value)
        if (value < 0 || value > 10) {
            setMinScoreError("Score must be between 0 and 10")
        } else {
            setMinScore(value)
            setMinScoreError("")
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-white">
                        Accept Participants
                    </h2>
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
                        <h3 className="font-medium text-white mb-3">Coming Soon</h3>
                        <p className="text-white/70 text-sm">
                            This feature will allow you to bulk accept participants based
                            on scores, status, and other criteria. The implementation is
                            in progress.
                        </p>
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