import { useEffect, useState } from "react"
import { APPLICATION_STATUS, CombinedApplicationData, fetchApplicationsWithUsers, formatApplicationDate, getPortalConfig, updateApplicationAcceptanceEmail, updateApplicationStatus } from "@/lib/firebaseUtils"
import AcceptingApplicationRowComponent from "./lists/AcceptingApplicationRow"
import LoadingSpinner from "./LoadingSpinner"
import { Loader2, X } from "lucide-react"
import { calculateAge } from "@/lib/evaluator"
import toast from "react-hot-toast"
import { PortalConfig } from "@/lib/types"

interface ApplicationAcceptModalProps {
	setShowAcceptModal: (value: boolean) => void
}

export default function ApplicationAcceptModal({ setShowAcceptModal }: ApplicationAcceptModalProps) {
	const [config, setConfig] = useState<PortalConfig | null>(null);
	const [configError, setConfigError] = useState("")
	const [isLoading, setIsLoading] = useState(true)
	const [minScore, setMinScore] = useState<number | undefined>(undefined)
	const [minScoreError, setMinScoreError] = useState("")
	const [combinedApplications, setCombinedApplications] = useState<CombinedApplicationData[]>([])
	const [previewModalActive, setPreviewModalActive] = useState(false)
	const [currentApplicationPreview, setCurrentApplicationPreview] = useState<CombinedApplicationData | undefined>(undefined)
	const [toAcceptApplications, setToAcceptApplications] = useState<CombinedApplicationData[]>([])
	const [confirmationModalActive, setConfirmationModalActive] = useState(false)
	const [confirmationError, setConfirmationError] = useState("")
	const [isAcceptingLoading, setIsAcceptingLoading] = useState(false)

	const loadConfig = async () => {
    try {
      setIsLoading(true);
      const portalConfig = await getPortalConfig();
      setConfig(portalConfig);
    } catch {
      setConfigError("Failed to load portal configuration");
			console.log("Failed to load portal config.")
    } finally {
      setIsLoading(false);
    }
  };

	const onChangeMinScore = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = Number(e.target.value)
		if (value < 0 || value > 20) {
			setMinScoreError("Score must be between 0 and 20")
		} else {
			setMinScore(value)
			setMinScoreError("")
			setToAcceptApplications([])
		}
	}

	const onPreviewApplication = (application: CombinedApplicationData) => {
		setCurrentApplicationPreview(application)
		setPreviewModalActive(true)
	}

	const handleIsToAcceptChange = (application: CombinedApplicationData) => {
		if (toAcceptApplications.includes(application)) {
			setToAcceptApplications(toAcceptApplications.filter(app => app.id !== application.id))
		} else {
			setToAcceptApplications([...toAcceptApplications, application])
		}
	}

	const handleSelectAll = () => {
		setToAcceptApplications(combinedApplications)
	}

	const handleUnselectAll = () => {
		setToAcceptApplications([])
	}

	const handleAcceptSelected = () => {
		if (minScore === undefined || minScore === 0) {
			setConfirmationError("Score threshold cannot be empty")
			return
		}
		else if (toAcceptApplications.length === 0) {
			setConfirmationError("Select minimum 1 application")
			return
		}
		setConfirmationError("")
		setConfirmationModalActive(true)
	}

	const handleAcceptSubmit = async () => {
		let successCount = 0;
		let failCount = 0;
		setIsAcceptingLoading(true)
		try {
			const applications = toAcceptApplications.filter(app => app.score !== undefined && app.score >= minScore!)

			const results = await Promise.allSettled(applications.map(async (application) => {
				try {
					const result = await updateApplicationStatus(application.id, APPLICATION_STATUS.ACCEPTED)
					return { success: result, application };
				} catch (error) {
					return { success: false, application };
				}
			}));

			for (const result of results) {
				if (result.status === 'fulfilled' && result.value) {
					try {
						const response = await fetch("/api/send-email", {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								email: result.value.application.email,
								rsvpDeadline: "2025-07-01",
								teamDeadline: "2025-07-01",
								eventStartDate: "2025-07-24",
							}),
						});

						if (!response.ok) {
							const errorData = await response.json();
							console.error("Failed to send acceptance email:", errorData);
							failCount++
							continue;
						}

						try {
							await updateApplicationAcceptanceEmail(result.value.application.id)
						} catch (error) {
							console.error(`Error updating application acceptance email for ${result.value.application.id}:`, error);
							failCount++
							continue;
						}
					} catch (emailError) {
						console.error("Error sending acceptance email:", emailError);
					}
					successCount++;
				} else {
					failCount++;
				}
			}

			toast((t) => (
				<div>
					<p className="">Successfully  <span className="text-green-600 font-semibold"> accepted {successCount} applications.</span></p>
					<p><span className="text-red-600 font-semibold">{failCount} applications failed</span> to process.</p>
					<p>This window will refresh automatically in 7 seconds.</p>
				</div>
			), {
				duration: 7000
			});

			setTimeout(() => {
				window.location.reload()
			}, 7000)
		} catch (error) {
			console.log(`Error when bulk accept: ${error}`)
			toast.error("Something went wrong. Please check log.")
		} finally {
			console.log('Finally block executing');
			setShowAcceptModal(false)
			setPreviewModalActive(false)
			setConfirmationModalActive(false)
			setIsAcceptingLoading(false)
		}
	}

	useEffect(() => {
		loadConfig()
	}, [])

	useEffect(() => {
		setIsLoading(true)
		const scoreFilter = minScore === 0 ? undefined : minScore;
		fetchApplicationsWithUsers("submitted", scoreFilter).then((applications) => {
			setCombinedApplications(applications.filter(app => app.score !== undefined))
		})
		setIsLoading(false)
	}, [minScore])

	if (configError) {
		<div>
			<p className="text-red-500 text-sm text-center">{configError}</p>
		</div>
	}

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
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

				<div className="space-y-4 flex-1 flex flex-col">
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
								max={20}
								onChange={onChangeMinScore}
							/>
							<span className="text-red-500 text-xs text-end">{minScoreError}</span>
						</div>
					</div>

					<div className="w-full h-1 border-b border-white/50" />

					{isLoading ? (
						<div>
							<LoadingSpinner />
						</div>
					) : (
						<>
							<div className="flex flex-row justify-between items-end">
								<p className="text-xs font-semibold text-white/70">Showing {combinedApplications.length} applications passing the score threshold</p>
								<div className="flex flex-col items-end gap-2">
									<div className="flex flex-row gap-1 text-xs">
										<button className="border px-3 py-1 rounded-full border-green-400 hover:bg-white/10" onClick={handleSelectAll}>Select All</button>
										<button className="border px-3 py-1 rounded-full border-red-400 hover:bg-white/10" onClick={handleUnselectAll}>Unselect All</button>
									</div>
									<span className="text-xs">Selected {toAcceptApplications.length}</span>
								</div>
							</div>

							<div className="bg-white/5 border border-white/20 rounded-md p-4 flex-1 overflow-y-auto max-h-96">
								{combinedApplications.map((application) => (
									<div key={application.id} onClick={() => handleIsToAcceptChange(application)}>
										<AcceptingApplicationRowComponent
											setIsToAccept={handleIsToAcceptChange}
											isToAccept={toAcceptApplications.includes(application)}
											application={application}
											onPreviewApplication={onPreviewApplication}
											maxApplicationEvaluationScore={config?.maxApplicationEvaluationScore || 20}
										/>
									</div>
								))}
							</div>
						</>
					)}

				</div>

				<div className="flex justify-end space-x-3 mt-6">
					<button
						onClick={() => setShowAcceptModal(false)}
						className="px-4 py-2 border border-white/20 text-white/80 rounded-md hover:bg-white/5 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleAcceptSelected}
						className="px-4 py-2 text-white rounded-md bg-primary"
					>
						Accept Selected
					</button>
				</div>

				<p className="text-red-500 text-xs text-end mt-4">{confirmationError}</p>
			</div>

			{previewModalActive && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
						<div className="flex justify-end hover:text-white/70" onClick={() => setPreviewModalActive(false)}>
							<X />
						</div>

						<div className="flex flex-col gap-4">
							<h2 className="text-xl font-semibold text-white">
								Application Preview
							</h2>

							{currentApplicationPreview && (
								<div className="bg-white/5 border border-white/20 rounded-md p-4 flex-1 overflow-y-auto max-h-96">
									<div className="space-y-6">
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<div>
												<h4 className="text-xl font-bold text-white mb-2">
													{currentApplicationPreview.firstName} {currentApplicationPreview.lastName}
												</h4>
												<div className="space-y-1 text-sm">
													<p className="text-white/70">
														<span className="font-medium">Email:</span>{" "}
														{currentApplicationPreview.email}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Gender:</span>{" "}
														{currentApplicationPreview.genderIdentity}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Age:</span>{" "}
														{calculateAge(currentApplicationPreview.dateOfBirth)}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Nationality:</span>{" "}
														{currentApplicationPreview.nationality}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Occupation:</span>{" "}
														{currentApplicationPreview.currentOccupation}
													</p>
													<p className="text-white/70">
														<span className="font-medium">School / Company:</span>{" "}
														{currentApplicationPreview.occupationPlace}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Major / Position:</span>{" "}
														{currentApplicationPreview.occupationDetail}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Primary Role:</span>{" "}
														{currentApplicationPreview.primaryRole}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Track:</span>{" "}
														{currentApplicationPreview.interestedTrack}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Hackathons:</span>{" "}
														{currentApplicationPreview.hackathonCount}
													</p>
												</div>
											</div>
											<div>
												<h5 className="font-semibold text-white mb-2">
													Links & Documents
												</h5>
												<div className="space-y-2">
													{currentApplicationPreview.resume && (
														<a
															href={currentApplicationPreview.resume}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
														>
															Resume (PDF)
														</a>
													)}
													{currentApplicationPreview.github && (
														<a
															href={currentApplicationPreview.github}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
														>
															GitHub
														</a>
													)}
													{currentApplicationPreview.linkedin && (
														<a
															href={currentApplicationPreview.linkedin}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
														>
															LinkedIn
														</a>
													)}
													{currentApplicationPreview.devpost && (
														<a
															href={currentApplicationPreview.devpost}
															target="_blank"
															rel="noopener noreferrer"
															className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
														>
															DevPost
														</a>
													)}
												</div>
											</div>
										</div>

										<div>
											<div className="font-semibold text-white mb-2 text-sm">
												Your Dream Creation
											</div>
											<textarea
												value={currentApplicationPreview.qDreamCreation || "No response"}
												readOnly
												className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
												style={{ maxHeight: "500px", minHeight: "150px" }}
											/>
										</div>

										<div>
											<div className="font-semibold text-white mb-2 text-sm">
												Your Proudest Moment
											</div>
											<textarea
												value={currentApplicationPreview.qProudestMoment || "No response"}
												readOnly
												className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
												style={{ maxHeight: "500px", minHeight: "150px" }}
											/>
										</div>

										<div>
											<div className="font-semibold text-white mb-2 text-sm">
												Why Garuda Hacks
											</div>
											<textarea
												value={currentApplicationPreview.qWhyGarudaHacks || "No response"}
												readOnly
												className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
												style={{ maxHeight: "500px", minHeight: "150px" }}
											/>
										</div>

										<div>
											<h5 className="font-semibold text-white mb-2">
												Additional Info
											</h5>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
												<div>
													<span className="font-medium text-white/90">
														Referral Source:
													</span>
													<p className="text-white/70">
														{currentApplicationPreview.referralSource}
													</p>
												</div>
												<div>
													<span className="font-medium text-white/90">
														Application Date:
													</span>
													<p className="text-white/70">
														{formatApplicationDate(
															currentApplicationPreview.applicationCreatedAt
														)}
													</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}

			{confirmationModalActive && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<div className="bg-background border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
						<div className="flex justify-between items-center mb-6">
							<div className="flex flex-col gap-4 w-full">
								<h2 className="text-xl font-semibold text-white">
									{"⚠️"} <span className="ml-2">Accept Applications</span>
								</h2>
								<p className="text-white/80">You&apos;re about to accept {toAcceptApplications.length} applications with score ≥ {minScore}.</p>

								{toAcceptApplications.length > 12 && (
									<div className="flex flex-col gap-2 rounded bg-yellow-500/70 p-4 text-sm">
										<p className="">‼️ You&apos;re accepting over 200 participants. This may take longer—continue?</p>
										<p>Bulk operation completes within 5 seconds for up to 200 applicants.</p>
									</div>
								)}

								<div className="flex flex-row justify-end w-full gap-2">
									<button className="px-4 py-2 text-white rounded-md border border-white" onClick={() => setConfirmationModalActive(false)}>Cancel</button>
									<button className="px-4 py-2 text-white rounded-md bg-primary flex gap-1" onClick={handleAcceptSubmit}>
										{isAcceptingLoading && <Loader2 className="animate-spin" />}
										Accept
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
