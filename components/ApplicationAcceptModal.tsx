import { useEffect, useState } from "react"
import { APPLICATION_STATUS, CombinedApplicationData, fetchApplicationsWithUsers, formatApplicationDate, getEducationLevel, getQuestionText, getYearSuffix, updateApplicationStatus } from "@/lib/firebaseUtils"
import AcceptingApplicationRowComponent from "./lists/AcceptingApplicationRow"
import LoadingSpinner from "./LoadingSpinner"
import { Loader2, Podcast, SeparatorHorizontal, X } from "lucide-react"
import { calculateAge } from "@/lib/evaluator"
import toast from "react-hot-toast"

interface ApplicationAcceptModalProps {
	setShowAcceptModal: (value: boolean) => void
}

export default function ApplicationAcceptModal({ setShowAcceptModal }: ApplicationAcceptModalProps) {
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

	const [questionTexts, setQuestionTexts] = useState<{
		motivation: string;
		bigProblem: string;
		interestingProject: string;
	}>({
		motivation: "Motivation",
		bigProblem: "Problem to Solve",
		interestingProject: "Interesting Project",
	});

	const loadQuestionTexts = async () => {
		try {
			const [motivationText, bigProblemText, interestingProjectText] =
				await Promise.all([
					getQuestionText("motivation"),
					getQuestionText("bigProblem"),
					getQuestionText("interestingProject"),
				]);

			setQuestionTexts({
				motivation: motivationText,
				bigProblem: bigProblemText,
				interestingProject: interestingProjectText,
			});
		} catch (error) {
			console.error("Error loading question texts:", error);
		}
	};

	const onChangeMinScore = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = Number(e.target.value)
		if (value < 0 || value > 10) {
			setMinScoreError("Score must be between 0 and 10")
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
		loadQuestionTexts()
	}, [])

	useEffect(() => {
		setIsLoading(true)
		const scoreFilter = minScore === 0 ? undefined : minScore;
		fetchApplicationsWithUsers("submitted", scoreFilter).then((applications) => {
			setCombinedApplications(applications.filter(app => app.score !== undefined))
		})
		setIsLoading(false)
	}, [minScore])

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
								max={10}
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
													{currentApplicationPreview.firstName}
												</h4>
												<div className="space-y-1 text-sm">
													<p className="text-white/70">
														<span className="font-medium">Email:</span>{" "}
														{currentApplicationPreview.email}
													</p>
													<p className="text-white/70">
														<span className="font-medium">School:</span>{" "}
														{currentApplicationPreview.school}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Education:</span>{" "}
														{getEducationLevel(currentApplicationPreview.education)}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Year:</span>{" "}
														{getYearSuffix(currentApplicationPreview.year)}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Age:</span>{" "}
														{calculateAge(currentApplicationPreview.date_of_birth)}
													</p>
													<p className="text-white/70">
														<span className="font-medium">Hackathons:</span>{" "}
														{currentApplicationPreview.hackathonCount} previous
													</p>
													<p className="text-white/70">
														<span className="font-medium">Desired Roles:</span>{" "}
														{currentApplicationPreview.desiredRoles}
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
															<svg
																className="w-4 h-4"
																fill="currentColor"
																viewBox="0 0 20 20"
															>
																<path
																	fillRule="evenodd"
																	d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z"
																	clipRule="evenodd"
																/>
															</svg>
															Resume (PDF)
														</a>
													)}
													{currentApplicationPreview.portfolio &&
														currentApplicationPreview.portfolio !== "X" && (
															<a
																href={currentApplicationPreview.portfolio}
																target="_blank"
																rel="noopener noreferrer"
																className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
															>
																<svg
																	className="w-4 h-4"
																	fill="currentColor"
																	viewBox="0 0 20 20"
																>
																	<path
																		fillRule="evenodd"
																		d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
																		clipRule="evenodd"
																	/>
																</svg>
																Portfolio
															</a>
														)}
													{currentApplicationPreview.github &&
														currentApplicationPreview.github !== "X" && (
															<a
																href={currentApplicationPreview.github}
																target="_blank"
																rel="noopener noreferrer"
																className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
															>
																<svg
																	className="w-4 h-4"
																	fill="currentColor"
																	viewBox="0 0 20 20"
																>
																	<path
																		fillRule="evenodd"
																		d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
																		clipRule="evenodd"
																	/>
																</svg>
																GitHub
															</a>
														)}
													{currentApplicationPreview.linkedin &&
														currentApplicationPreview.linkedin !== "X" && (
															<a
																href={currentApplicationPreview.linkedin}
																target="_blank"
																rel="noopener noreferrer"
																className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
															>
																<svg
																	className="w-4 h-4"
																	fill="currentColor"
																	viewBox="0 0 20 20"
																>
																	<path
																		fillRule="evenodd"
																		d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z"
																		clipRule="evenodd"
																	/>
																</svg>
																LinkedIn
															</a>
														)}
												</div>
											</div>
										</div>

										<div>
											<div className="font-semibold text-white mb-2 text-sm">
												{questionTexts.motivation}
											</div>
											<textarea
												value={currentApplicationPreview.motivation || "No response"}
												readOnly
												className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
												style={{ maxHeight: "500px", minHeight: "250px" }}
											/>
										</div>

										<div>
											<div className="font-semibold text-white mb-2 text-sm">
												{questionTexts.bigProblem}
											</div>
											<textarea
												value={currentApplicationPreview.bigProblem || "No response"}
												readOnly
												className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
												style={{ maxHeight: "500px", minHeight: "250px" }}
											/>
										</div>

										<div>
											<div className="font-semibold text-white mb-2 text-sm">
												{questionTexts.interestingProject}
											</div>
											<textarea
												value={
													currentApplicationPreview.interestingProject || "No response"
												}
												readOnly
												className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
												style={{ maxHeight: "500px", minHeight: "250px" }}
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
												{currentApplicationPreview.accommodations &&
													currentApplicationPreview.accommodations !== "m" && (
														<div>
															<span className="font-medium text-white/90">
																Accommodations:
															</span>
															<p className="text-white/70">
																{currentApplicationPreview.accommodations}
															</p>
														</div>
													)}
												{currentApplicationPreview.dietary_restrictions &&
													currentApplicationPreview.dietary_restrictions !== "m" && (
														<div>
															<span className="font-medium text-white/90">
																Dietary Restrictions:
															</span>
															<p className="text-white/70">
																{currentApplicationPreview.dietary_restrictions}
															</p>
														</div>
													)}
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

								<div className="flex flex-row justify-end w-full gap-2">
									<button className="px-4 py-2 text-white rounded-md border border-white" onClick={() => setConfirmationModalActive(false)}>Cancel</button>
									<button className="px-4 py-2 text-white rounded-md bg-primary" onClick={handleAcceptSubmit}>
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