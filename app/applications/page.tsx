"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  fetchApplicationsWithUsers,
  getEducationLevel,
  formatApplicationDate,
  getYearSuffix,
  debugAuthToken,
  updateUserStatus,
  updateApplicationScore,
  getQuestionText,
} from "@/lib/firebaseUtils";
import { CombinedApplicationData, APPLICATION_STATUS } from "@/lib/types";

export default function Applications() {
  const [applications, setApplications] = useState<CombinedApplicationData[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<CombinedApplicationData | null>(null);
  const [evaluationScore, setEvaluationScore] = useState<string>("");
  const [evaluationNotes, setEvaluationNotes] = useState<string>("");
  const [rejecting, setRejecting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [questionTexts, setQuestionTexts] = useState<{
    motivation: string;
    bigProblem: string;
    interestingProject: string;
  }>({
    motivation: "Motivation",
    bigProblem: "Problem to Solve",
    interestingProject: "Interesting Project",
  });

  useEffect(() => {
    loadApplications();
    loadQuestionTexts();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      await debugAuthToken();

      const data = await fetchApplicationsWithUsers();
      setApplications(data);
      if (data.length > 0) {
        setSelectedApplication(data[0]);
        setEvaluationScore(data[0].score?.toString() || "");
        setEvaluationNotes(data[0].evaluationNotes || "");
      }
    } catch (err) {
      console.error("Error loading applications:", err);
      setError("Failed to load applications. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const handleApplicationSelect = (application: CombinedApplicationData) => {
    setSelectedApplication(application);
    setEvaluationScore(application.score?.toString() || "");
    setEvaluationNotes(application.evaluationNotes || "");
  };

  const handleScoreSubmit = async () => {
    if (!selectedApplication) return;

    const score = parseFloat(evaluationScore);
    if (score >= 0 && score <= 10) {
      try {
        const success = await updateApplicationScore(
          selectedApplication.id,
          score,
          evaluationNotes
        );

        if (success) {
          // Update local state to reflect the changes
          setApplications((prev) =>
            prev.map((app) =>
              app.id === selectedApplication.id
                ? { ...app, score, evaluationNotes }
                : app
            )
          );

          // Update selected application
          setSelectedApplication((prev) =>
            prev ? { ...prev, score, evaluationNotes } : null
          );

          // Clear the notes field after successful submission
          setEvaluationNotes("");
        } else {
          console.error("Failed to save score and notes");
        }
      } catch (error) {
        console.error("Error saving score:", error);
      }
    }
  };

  const handleRejectParticipant = async () => {
    if (!selectedApplication) return;

    try {
      setRejecting(true);
      const success = await updateUserStatus(
        selectedApplication.id,
        APPLICATION_STATUS.REJECTED
      );

      if (success) {
        try {
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: selectedApplication.email,
              type: "rejected",
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to send rejection email:", errorData);
          }
        } catch (emailError) {
          console.error("Error sending rejection email:", emailError);
        }

        setApplications((prev) =>
          prev.map((app) =>
            app.id === selectedApplication.id
              ? { ...app, status: APPLICATION_STATUS.REJECTED }
              : app
          )
        );

        setSelectedApplication((prev) =>
          prev ? { ...prev, status: APPLICATION_STATUS.REJECTED } : null
        );
      } else {
        console.error("Failed to reject participant");
      }
    } catch (error) {
      console.error("Error rejecting participant:", error);
    } finally {
      setRejecting(false);
    }
  };

  const handleAcceptParticipant = async () => {
    if (!selectedApplication) return;

    try {
      setAccepting(true);
      const success = await updateUserStatus(
        selectedApplication.id,
        APPLICATION_STATUS.ACCEPTED
      );

      if (success) {
        try {
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: selectedApplication.email,
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

        setApplications((prev) =>
          prev.map((app) =>
            app.id === selectedApplication.id
              ? { ...app, status: APPLICATION_STATUS.ACCEPTED }
              : app
          )
        );

        setSelectedApplication((prev) =>
          prev ? { ...prev, status: APPLICATION_STATUS.ACCEPTED } : null
        );
      } else {
        console.error("Failed to accept participant");
      }
    } catch (error) {
      console.error("Error accepting participant:", error);
    } finally {
      setAccepting(false);
    }
  };

  const handleWaitlistParticipant = async () => {
    if (!selectedApplication) return;

    try {
      setRejecting(true);
      const success = await updateUserStatus(
        selectedApplication.id,
        APPLICATION_STATUS.WAITLISTED
      );

      if (success) {
        try {
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: selectedApplication.email,
              type: "waitlisted",
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Failed to send waitlist email:", errorData);
          }
        } catch (emailError) {
          console.error("Error sending waitlist email:", emailError);
        }

        setApplications((prev) =>
          prev.map((app) =>
            app.id === selectedApplication.id
              ? { ...app, status: APPLICATION_STATUS.WAITLISTED }
              : app
          )
        );

        setSelectedApplication((prev) =>
          prev ? { ...prev, status: APPLICATION_STATUS.WAITLISTED } : null
        );
      } else {
        console.error("Failed to waitlist participant");
      }
    } catch (error) {
      console.error("Error waitlisting participant:", error);
    } finally {
      setRejecting(false);
    }
  };

  const getDisplayStatus = (application: CombinedApplicationData): string => {
    if (
      application.status === APPLICATION_STATUS.SUBMITTED &&
      application.score
    ) {
      return APPLICATION_STATUS.GRADED;
    }
    return application.status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.ACCEPTED:
        return "bg-accent-foreground/20 text-accent-accessible";
      case APPLICATION_STATUS.REJECTED:
        return "bg-destructive/20 text-violet-600";
      case APPLICATION_STATUS.SUBMITTED:
        return "bg-secondary/20 text-fuchsia-500";
      case APPLICATION_STATUS.GRADED:
        return "bg-blue-500/20 text-blue-400";
      case APPLICATION_STATUS.WAITLISTED:
        return "bg-yellow-500/20 text-violet-500";
      case APPLICATION_STATUS.CONFIRMED_RSVP:
        return "bg-green-500/20 text-purple-500";
      default:
        return "bg-white/10 text-white/70";
    }
  };

  const getStatusTextColor = (status: string) => {
    const colorClasses = getStatusColor(status);
    const textColorMatch = colorClasses.match(/text-[\w-\/]+/);
    return textColorMatch ? textColorMatch[0] : "text-white/70";
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case APPLICATION_STATUS.ACCEPTED:
        return "bg-accent-accessible/20 text-accent-accessible border-accent-accessible/50";
      case APPLICATION_STATUS.REJECTED:
        return "bg-violet-800/20 text-violet-800 border-violet-800/50";
      case APPLICATION_STATUS.SUBMITTED:
        return "bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500/50";
      case APPLICATION_STATUS.GRADED:
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case APPLICATION_STATUS.WAITLISTED:
        return "bg-violet-500/20 text-violet-500 border-violet-500/50";
      case APPLICATION_STATUS.CONFIRMED_RSVP:
        return "bg-purple-500/20 text-purple-500 border-purple-500/50";
      default:
        return "bg-white/10 text-white/70 border-white/30";
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    try {
      const birth = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birth.getDate())
      ) {
        age--;
      }
      return age;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Applications"
          subtitle="Evaluate and score participant applications for Garuda Hacks 6.0."
        />
        <LoadingSpinner text="Loading applications..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Applications"
          subtitle="Evaluate and score participant applications for Garuda Hacks 6.0."
        />
        <div className="card p-6 text-center">
          <div className="text-destructive mb-4">{error}</div>
          <button onClick={loadApplications} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pendingApplications = applications.filter(
    (app) => app.status === APPLICATION_STATUS.SUBMITTED && !app.score
  );
  const approvedApplications = applications.filter(
    (app) => app.status === APPLICATION_STATUS.ACCEPTED
  );
  const waitlistedApplications = applications.filter(
    (app) => app.status === APPLICATION_STATUS.WAITLISTED
  );
  const rejectedApplications = applications.filter(
    (app) => app.status === APPLICATION_STATUS.REJECTED
  );
  const displayableApplications = applications.filter(
    (app) => app.status !== APPLICATION_STATUS.NOT_APPLICABLE
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        subtitle="Evaluate and score participant applications for Garuda Hacks 6.0."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card py-4 px-3 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-white/10">
              <div className="text-center py-2 md:py-0 px-2">
                <div
                  className={`text-xl font-bold mb-1 ${getStatusTextColor(
                    APPLICATION_STATUS.SUBMITTED
                  )}`}
                >
                  {pendingApplications.length}
                </div>
                <div className="text-xs text-white/70">Pending</div>
              </div>
              <div className="text-center py-2 md:py-0 px-2">
                <div
                  className={`text-xl font-bold mb-1 ${getStatusTextColor(
                    APPLICATION_STATUS.WAITLISTED
                  )}`}
                >
                  {waitlistedApplications.length}
                </div>
                <div className="text-xs text-white/70">Waitlist</div>
              </div>
              <div className="text-center py-2 md:py-0 px-2">
                <div
                  className={`text-xl font-bold mb-1 ${getStatusTextColor(
                    APPLICATION_STATUS.REJECTED
                  )}`}
                >
                  {rejectedApplications.length}
                </div>
                <div className="text-xs text-white/70">Rejected</div>
              </div>
              <div className="text-center py-2 md:py-0 px-2">
                <div
                  className={`text-xl font-bold mb-1 ${getStatusTextColor(
                    APPLICATION_STATUS.ACCEPTED
                  )}`}
                >
                  {approvedApplications.length}
                </div>
                <div className="text-xs text-white/70">Accepted</div>
              </div>
            </div>
          </div>
          <div
            className="card flex flex-col"
            style={{ height: "calc(100vh - 400px)" }}
          >
            <div className="p-6 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">
                Applications List ({displayableApplications.length})
              </h3>
            </div>
            <div
              className="flex-1 overflow-y-auto"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {displayableApplications.length === 0 ? (
                <div className="p-6 text-center text-white/70">
                  No applications found
                </div>
              ) : (
                displayableApplications.map((application) => (
                  <div
                    key={application.id}
                    onClick={() => handleApplicationSelect(application)}
                    className={`w-full max-w-full p-4 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5 ${
                      selectedApplication?.id === application.id
                        ? "bg-primary/10 border-primary/30"
                        : ""
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm text-white truncate">
                        {application.firstName}
                      </h4>
                      <div className="text-right min-w-[30%] ">
                        {application.score ? (
                          <div className="text-sm font-bold text-white">
                            {application.score}/10
                          </div>
                        ) : (
                          <div className="text-white/50 text-sm">
                            Not scored
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(
                          getDisplayStatus(application)
                        )}`}
                      >
                        {getDisplayStatus(application)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAcceptModal(true)}
            className="w-full mt-6 px-4 py-3 bg-accent-accessible/20 border-2 border-grey text-grey-500 rounded-lg hover:bg-accent-accessible/30 hover:opacity-80 font-semibold transition-colors"
          >
            Bulk Accept
          </button>
        </div>

        <div className="lg:col-span-2">
          <div
            className="card flex flex-col"
            style={{ height: "calc(100vh - 240px)" }}
          >
            <div className="p-6 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">
                Application Evaluator
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedApplication ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">
                        {selectedApplication.firstName}
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p className="text-white/70">
                          <span className="font-medium">Email:</span>{" "}
                          {selectedApplication.email}
                        </p>
                        <p className="text-white/70">
                          <span className="font-medium">School:</span>{" "}
                          {selectedApplication.school}
                        </p>
                        <p className="text-white/70">
                          <span className="font-medium">Education:</span>{" "}
                          {getEducationLevel(selectedApplication.education)}
                        </p>
                        <p className="text-white/70">
                          <span className="font-medium">Year:</span>{" "}
                          {getYearSuffix(selectedApplication.year)}
                        </p>
                        <p className="text-white/70">
                          <span className="font-medium">Age:</span>{" "}
                          {calculateAge(selectedApplication.date_of_birth)}
                        </p>
                        <p className="text-white/70">
                          <span className="font-medium">Hackathons:</span>{" "}
                          {selectedApplication.hackathonCount} previous
                        </p>
                        <p className="text-white/70">
                          <span className="font-medium">Desired Roles:</span>{" "}
                          {selectedApplication.desiredRoles}
                        </p>
                      </div>
                    </div>
                    <div>
                      <h5 className="font-semibold text-white mb-2">
                        Links & Documents
                      </h5>
                      <div className="space-y-2">
                        {selectedApplication.resume && (
                          <a
                            href={selectedApplication.resume}
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
                        {selectedApplication.portfolio &&
                          selectedApplication.portfolio !== "X" && (
                            <a
                              href={selectedApplication.portfolio}
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
                        {selectedApplication.github &&
                          selectedApplication.github !== "X" && (
                            <a
                              href={selectedApplication.github}
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
                        {selectedApplication.linkedin &&
                          selectedApplication.linkedin !== "X" && (
                            <a
                              href={selectedApplication.linkedin}
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
                      value={selectedApplication.motivation || "No response"}
                      readOnly
                      className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
                      style={{ maxHeight: "120px", minHeight: "80px" }}
                    />
                  </div>

                  <div>
                    <div className="font-semibold text-white mb-2 text-sm">
                      {questionTexts.bigProblem}
                    </div>
                    <textarea
                      value={selectedApplication.bigProblem || "No response"}
                      readOnly
                      className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
                      style={{ maxHeight: "120px", minHeight: "80px" }}
                    />
                  </div>

                  <div>
                    <div className="font-semibold text-white mb-2 text-sm">
                      {questionTexts.interestingProject}
                    </div>
                    <textarea
                      value={
                        selectedApplication.interestingProject || "No response"
                      }
                      readOnly
                      className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
                      style={{ maxHeight: "120px", minHeight: "80px" }}
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
                          {selectedApplication.referralSource}
                        </p>
                      </div>
                      <div>
                        <span className="font-medium text-white/90">
                          Application Date:
                        </span>
                        <p className="text-white/70">
                          {formatApplicationDate(
                            selectedApplication.applicationCreatedAt
                          )}
                        </p>
                      </div>
                      {selectedApplication.accommodations &&
                        selectedApplication.accommodations !== "m" && (
                          <div>
                            <span className="font-medium text-white/90">
                              Accommodations:
                            </span>
                            <p className="text-white/70">
                              {selectedApplication.accommodations}
                            </p>
                          </div>
                        )}
                      {selectedApplication.dietary_restrictions &&
                        selectedApplication.dietary_restrictions !== "m" && (
                          <div>
                            <span className="font-medium text-white/90">
                              Dietary Restrictions:
                            </span>
                            <p className="text-white/70">
                              {selectedApplication.dietary_restrictions}
                            </p>
                          </div>
                        )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h5 className="font-semibold text-white mb-4">
                      Evaluation
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Score (0-10)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={evaluationScore}
                          onChange={(e) => setEvaluationScore(e.target.value)}
                          className="input w-full"
                          placeholder="Enter score (0-10)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Evaluation Notes
                        </label>
                        <textarea
                          value={evaluationNotes}
                          onChange={(e) => setEvaluationNotes(e.target.value)}
                          className="input w-full h-24 resize-none"
                          placeholder="Add your evaluation notes..."
                        />
                      </div>
                      <button
                        onClick={handleScoreSubmit}
                        disabled={
                          !evaluationScore ||
                          parseFloat(evaluationScore) < 0 ||
                          parseFloat(evaluationScore) > 10
                        }
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Score
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6">
                    <h5 className="font-semibold text-white mb-4">
                      Status Overrides
                    </h5>
                    <div className="space-y-3">
                      <p className="text-white/60 text-sm">
                        Directly change the participant&apos;s status regardless
                        of score.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedApplication.status !==
                          APPLICATION_STATUS.ACCEPTED && (
                          <button
                            onClick={handleAcceptParticipant}
                            disabled={accepting}
                            className="px-4 py-3 bg-green-600/20 border border-green-600/50 text-green-400 rounded-md hover:bg-green-600/30 hover:text-green-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                          >
                            {accepting ? "Accepting..." : "Accept"}
                          </button>
                        )}

                        {selectedApplication.status !==
                          APPLICATION_STATUS.REJECTED && (
                          <button
                            onClick={handleRejectParticipant}
                            disabled={rejecting}
                            className="px-4 py-3 bg-red-600/20 border border-red-600/50 text-red-400 rounded-md hover:bg-red-600/30 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                          >
                            {rejecting ? "Rejecting..." : "Reject"}
                          </button>
                        )}
                      </div>

                      {(selectedApplication.status ===
                        APPLICATION_STATUS.ACCEPTED ||
                        selectedApplication.status ===
                          APPLICATION_STATUS.REJECTED) && (
                        <div className="mt-3 p-3 bg-blue-600/10 border border-blue-600/30 rounded-md">
                          <p className="text-blue-400 text-sm">
                            Current Status:{" "}
                            <span className="font-semibold">
                              {selectedApplication.status}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-white/70 py-12">
                  Select an application to start evaluating
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAcceptModal && (
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
              <p className="text-white/80">
                Select criteria for automatically accepting participants:
              </p>

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
      )}
    </div>
  );
}
