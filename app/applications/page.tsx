"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  fetchApplicationsWithUsers,
  formatApplicationDate,
  debugAuthToken,
  updateUserStatus,
  updateApplicationScore,
  resetApplicationStatus,
  getPortalConfig,
} from "@/lib/firebaseUtils";
import {
  CombinedApplicationData,
  APPLICATION_STATUS,
  PortalConfig,
} from "@/lib/types";
import ApplicationAcceptModal from "@/components/ApplicationAcceptModal";
import { calculateAge } from "@/lib/evaluator";

export default function Applications() {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [applications, setApplications] = useState<CombinedApplicationData[]>(
    []
  );
  const [applicationsOriginal, setApplicationsOriginal] = useState<
    CombinedApplicationData[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] =
    useState<CombinedApplicationData | null>(null);
  const [evaluationScore, setEvaluationScore] = useState<string>("");
  const [evaluationNotes, setEvaluationNotes] = useState<string>("");
  const [rejecting, setRejecting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [searchName, setSearchName] = useState<string>("");
  const [searchSort, setSearchSort] = useState<string>("applicationUpdatedAt");
  const [isSortDescending, setIsSortDescending] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"evaluate" | "issues" | "in-progress">("evaluate");
  const [activeIssueType, setActiveIssueType] = useState<
    "duplicates" | "oversize-team" | "missing-fields"
  >("duplicates");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const MAX_TEAM_SIZE = 4;

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const onChangeSearchQuery = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchName(e.target.value);
    const q = e.target.value.toLowerCase();

    if (!q) {
      setApplications([...applicationsOriginal]);
      return;
    }

    const results = applicationsOriginal.filter((app) => {
      const age = calculateAge(app.dateOfBirth).toString();
      return [
        app.firstName,
        app.lastName,
        app.email,
        app.status,
        app.genderIdentity,
        app.occupationPlace,
        app.currentOccupation,
        app.primaryRole,
        app.teamName,
        app.nationality,
        app.countryOfResidence,
        app.interestedTrack,
        age,
      ].some((field) => field?.toLowerCase().includes(q));
    });

    setApplications(results);
  };

  const getSortValue = (app: CombinedApplicationData, sortField: string) => {
    switch (sortField) {
      case "score":
        return app.score || 0;
      case "applicationCreatedAt":
        return new Date(app.applicationCreatedAt).getTime();
      case "applicationUpdatedAt":
        return new Date(app.applicationUpdatedAt).getTime();
      case "email":
        return app.email;
      case "firstName":
        return app.firstName || "";
      case "lastName":
        return app.lastName || "";
      default:
        return "";
    }
  };

  const applySorting = (sortField: string, descending: boolean = false) => {
    if (sortField === "none") {
      setApplications([...applicationsOriginal]);
      return;
    }

    const sorted = [...applications].sort((a, b) => {
      const aValue = getSortValue(a, sortField);
      const bValue = getSortValue(b, sortField);

      if (typeof aValue === "string" && typeof bValue === "string") {
        return descending
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return descending ? bValue - aValue : aValue - bValue;
      }

      return 0;
    });

    setApplications(sorted);
  };

  const onChangeSearchSort = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSearchSort(e.target.value);
    applySorting(e.target.value, isSortDescending);
  };

  const onChangeIsSortDescending = () => {
    const newIsSortDescending = !isSortDescending;
    setIsSortDescending(newIsSortDescending);
    applySorting(searchSort, newIsSortDescending);
  };

  useEffect(() => {
    loadConfig();
    loadApplications();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const portalConfig = await getPortalConfig();
      setConfig(portalConfig);
    } catch {
      setError("Failed to load portal configuration");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      await debugAuthToken();

      const data = await fetchApplicationsWithUsers();
      const sorted = [...data].sort((a, b) => {
        return new Date(b.applicationUpdatedAt).getTime() - new Date(a.applicationUpdatedAt).getTime();
      });
      setApplications(sorted);
      setApplicationsOriginal(data);
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

  const handleApplicationSelect = (application: CombinedApplicationData) => {
    setSelectedApplication(application);
    setEvaluationScore(application.score?.toString() || "");
    setEvaluationNotes(application.evaluationNotes || "");
  };

  const handleScoreSubmit = async () => {
    if (!selectedApplication) return;

    const score = parseFloat(evaluationScore);
    if (score >= 0 && score <= (config?.maxApplicationEvaluationScore || 20)) {
      try {
        const success = await updateApplicationScore(
          selectedApplication.id,
          score,
          evaluationNotes
        );

        if (success) {
          setApplications((prev) =>
            prev.map((app) =>
              app.id === selectedApplication.id
                ? { ...app, score, evaluationNotes }
                : app
            )
          );

          setSelectedApplication((prev) =>
            prev ? { ...prev, score, evaluationNotes } : null
          );

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



  const handleResetStatus = async () => {
    if (!selectedApplication) return;

    try {
      setResetting(true);
      const success = await resetApplicationStatus(selectedApplication.id);

      if (success) {
        const updatedRetryCount = (selectedApplication.retryCount || 0) + 1;

        setApplications((prev) =>
          prev.map((app) =>
            app.id === selectedApplication.id
              ? { ...app, status: APPLICATION_STATUS.NOT_APPLICABLE, retryCount: updatedRetryCount }
              : app
          )
        );

        setApplicationsOriginal((prev) =>
          prev.map((app) =>
            app.id === selectedApplication.id
              ? { ...app, status: APPLICATION_STATUS.NOT_APPLICABLE, retryCount: updatedRetryCount }
              : app
          )
        );

        setSelectedApplication((prev) =>
          prev ? { ...prev, status: APPLICATION_STATUS.NOT_APPLICABLE, retryCount: updatedRetryCount } : null
        );
      } else {
        console.error("Failed to reset application status");
      }
    } catch (error) {
      console.error("Error resetting application status:", error);
    } finally {
      setResetting(false);
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

  const InfoRow = ({
    label,
    value,
  }: {
    label: string;
    value?: string | null;
  }) =>
    value ? (
      <p className="text-white/70 text-sm">
        <span className="font-medium text-white/90">{label}:</span> {value}
      </p>
    ) : null;

  const LinkRow = ({
    href,
    label,
  }: {
    href?: string | null;
    label: string;
  }) =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-accent-accessible hover:text-accent-accessible/80 text-sm"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z"
            clipRule="evenodd"
          />
        </svg>
        {label}
      </a>
    ) : null;

  const SectionHeader = ({ title }: { title: string }) => (
    <h5 className="font-semibold text-white mb-2 text-sm border-b border-white/10 pb-1">
      {title}
    </h5>
  );

  const EssayField = ({
    label,
    value,
  }: {
    label: string;
    value?: string | null;
  }) => (
    <div>
      <div className="font-semibold text-white mb-2 text-sm">{label}</div>
      <textarea
        value={value || "No response"}
        readOnly
        className="input w-full resize-none bg-white/5 border-white/20 text-white/80 text-sm leading-relaxed overflow-y-auto"
        style={{ maxHeight: "500px", minHeight: "150px" }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Applications"
          subtitle="Evaluate and score participant applications for Garuda Hacks 7.0."
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
          subtitle="Evaluate and score participant applications for Garuda Hacks 7.0."
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
  const rejectedApplications = applications.filter(
    (app) => app.status === APPLICATION_STATUS.REJECTED
  );
  const displayableApplications = applications.filter(
    (app) => app.status !== APPLICATION_STATUS.NOT_APPLICABLE
  );
  const confirmedRSVPApplications = applications.filter(
    (app) => app.status === APPLICATION_STATUS.CONFIRMED_RSVP
  );
  const inProgressApplications = applicationsOriginal.filter(
    (app) =>
      app.status === APPLICATION_STATUS.NOT_APPLICABLE ||
      app.status === APPLICATION_STATUS.DRAFT
  );
  const filteredDisplayableApplications = (() => {
    if (statusFilter === "all") return displayableApplications;
    if (statusFilter === "pending") return pendingApplications;
    if (statusFilter === "rejected") return rejectedApplications;
    if (statusFilter === "accepted") return approvedApplications;
    if (statusFilter === "confirmed-rsvp") return confirmedRSVPApplications;
    return displayableApplications;
  })();

  // Issue detection: potential duplicates (same first+last name and phone)
  const duplicateGroups = (() => {
    const groups = new Map<string, CombinedApplicationData[]>();
    for (const app of applicationsOriginal.filter((a) => a.status === APPLICATION_STATUS.SUBMITTED)) {
      const firstName = (app.firstName || "").trim().toLowerCase();
      const lastName = (app.lastName || "").trim().toLowerCase();
      const phone = (app.phone || "").trim().replace(/\s+/g, "");
      if (!firstName || !lastName || !phone) continue;
      const key = `${firstName}|${lastName}|${phone}`;
      const group = groups.get(key) || [];
      group.push(app);
      groups.set(key, group);
    }
    return Array.from(groups.entries())
      .filter(([, apps]) => apps.length > 1)
      .map(([key, apps]) => ({ key, applications: apps }));
  })();

  // Issue detection: oversize teams (more than MAX_TEAM_SIZE members listed)
  const oversizeTeams = applicationsOriginal
    .filter((app) => app.status === APPLICATION_STATUS.SUBMITTED)
    .map((app) => {
      if (!app.teamMembers) return null;
      const members = app.teamMembers
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0);
      if (members.length > MAX_TEAM_SIZE) {
        return { application: app, members, count: members.length };
      }
      return null;
    })
    .filter(Boolean) as {
    application: CombinedApplicationData;
    members: string[];
    count: number;
  }[];

  const totalDuplicateApps = duplicateGroups.reduce(
    (sum, g) => sum + g.applications.length,
    0
  );

  // Issue detection: missing required fields
  const REQUIRED_FIELDS: { key: keyof CombinedApplicationData; label: string }[] = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "genderIdentity", label: "Gender Identity" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "nationality", label: "Nationality" },
    { key: "countryOfResidence", label: "Country of Residence" },
    { key: "preferredLanguage", label: "Preferred Language" },
    { key: "currentOccupation", label: "Current Occupation" },
    { key: "occupationPlace", label: "School / Company" },
    { key: "occupationDetail", label: "Major / Position" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "teamFormation", label: "Team Formation" },
    { key: "teamName", label: "Team Name" },
    { key: "interestedTrack", label: "Interested Track" },
    { key: "resume", label: "Resume" },
    { key: "qDreamCreation", label: "Dream Creation Essay" },
    { key: "qProudestMoment", label: "Proudest Moment Essay" },
    { key: "qWhyGarudaHacks", label: "Why Garuda Hacks Essay" },
    { key: "overnightPlan", label: "Overnight Plan" },
    { key: "leaveLetter", label: "Leave Letter" },
    { key: "phoneEmergency", label: "Emergency Phone" },
    { key: "emergencyWays", label: "Emergency Contact Methods" },
    { key: "emergencyRelation", label: "Emergency Relation" },
    { key: "signedConsent", label: "Signed Consent" },
    { key: "hackathonCount", label: "Hackathon Count" },
    { key: "ghCount", label: "GH Iterations" },
    { key: "joinSource", label: "Join Source" },
    { key: "referralSource", label: "Referral Source" },
    { key: "joinReason", label: "Join Reason" },
  ];

  const SPEED_DATING_FIELDS: { key: keyof CombinedApplicationData; label: string }[] = [
    { key: "primaryRole", label: "Primary Role" },
    { key: "roleProficiency", label: "Role Proficiency" },
    { key: "toolsUsed", label: "Tools Used" },
  ];

  const isFieldEmpty = (val: CombinedApplicationData[keyof CombinedApplicationData]) => {
    if (val === undefined || val === null) return true;
    if (typeof val === "string" && val.trim() === "") return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  };

  const missingFieldsApps = applicationsOriginal
    .filter((app) => app.status === APPLICATION_STATUS.SUBMITTED)
    .map((app) => {
      const choosesSpeedDating =
        (app.teamFormation || "").toLowerCase().includes("speed dating");

      const fieldsToCheck = choosesSpeedDating
        ? [...REQUIRED_FIELDS, ...SPEED_DATING_FIELDS]
        : REQUIRED_FIELDS;

      const missing = fieldsToCheck.filter((field) =>
        isFieldEmpty(app[field.key])
      );
      if (missing.length > 0) {
        return { application: app, missingFields: missing.map((f) => f.label) };
      }
      return null;
    })
    .filter(Boolean) as {
    application: CombinedApplicationData;
    missingFields: string[];
  }[];

  const getApplicationIssues = (appId: string): ("duplicates" | "oversize-team" | "missing-fields")[] => {
    const issues: ("duplicates" | "oversize-team" | "missing-fields")[] = [];
    if (duplicateGroups.some((g) => g.applications.some((a) => a.id === appId))) {
      issues.push("duplicates");
    }
    if (oversizeTeams.some((e) => e.application.id === appId)) {
      issues.push("oversize-team");
    }
    if (missingFieldsApps.some((e) => e.application.id === appId)) {
      issues.push("missing-fields");
    }
    return issues;
  };

  const navigateToIssue = (appId: string, issueType: "duplicates" | "oversize-team" | "missing-fields") => {
    setActiveTab("issues");
    setActiveIssueType(issueType);
    const app = applicationsOriginal.find((a) => a.id === appId);
    if (app) {
      setSelectedApplication(app);
      setEvaluationScore(app.score?.toString() || "");
      setEvaluationNotes(app.evaluationNotes || "");
    }
    if (issueType === "duplicates") {
      const group = duplicateGroups.find((g) => g.applications.some((a) => a.id === appId));
      if (group) {
        setExpandedGroups((prev) => new Set(prev).add(group.key));
      }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        subtitle="Evaluate and score participant applications for Garuda Hacks 7.0."
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => {
            setActiveTab("evaluate");
            setSelectedApplication(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "evaluate"
              ? "bg-white/10 text-white border-b-2 border-primary"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          Evaluate
        </button>
        <button
          onClick={() => {
            setActiveTab("issues");
            setSelectedApplication(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "issues"
              ? "bg-white/10 text-white border-b-2 border-primary"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          Potential Issues
          {(duplicateGroups.length > 0 ||
            oversizeTeams.length > 0 ||
            missingFieldsApps.length > 0) && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">
              {duplicateGroups.length +
                oversizeTeams.length +
                missingFieldsApps.length}
            </span>
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab("in-progress");
            setSelectedApplication(null);
          }}
          className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
            activeTab === "in-progress"
              ? "bg-white/10 text-white border-b-2 border-primary"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          In Progress
          {inProgressApplications.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
              {inProgressApplications.length}
            </span>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {activeTab === "evaluate" && (
            <>
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
                  <div className="text-center py-2 md:py-0 px-2">
                    <div
                      className={`text-xl font-bold mb-1 ${getStatusTextColor(
                        APPLICATION_STATUS.CONFIRMED_RSVP
                      )}`}
                    >
                      {confirmedRSVPApplications.length}
                    </div>
                    <div className="text-xs text-white/70">Confirmed RSVP</div>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mb-4 flex-wrap">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    statusFilter === "all"
                      ? "bg-white/20 text-white border border-white/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  All ({displayableApplications.length})
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    statusFilter === "pending"
                      ? "bg-fuchsia-500/20 text-fuchsia-500 border border-fuchsia-500/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  Pending ({pendingApplications.length})
                </button>
                <button
                  onClick={() => setStatusFilter("rejected")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    statusFilter === "rejected"
                      ? "bg-destructive/20 text-violet-600 border border-violet-600/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  Rejected ({rejectedApplications.length})
                </button>
                <button
                  onClick={() => setStatusFilter("accepted")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    statusFilter === "accepted"
                      ? "bg-accent-foreground/20 text-accent-accessible border border-accent-accessible/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  Accepted ({approvedApplications.length})
                </button>
                <button
                  onClick={() => setStatusFilter("confirmed-rsvp")}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    statusFilter === "confirmed-rsvp"
                      ? "bg-green-500/20 text-purple-500 border border-purple-500/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  RSVP ({confirmedRSVPApplications.length})
                </button>
              </div>
              <div
                className="card flex flex-col"
                style={{ height: "calc(100vh - 440px)" }}
              >
                <div className="p-4 flex flex-col gap-2">
                  <input
                    onChange={onChangeSearchQuery}
                    value={searchName}
                    className="input input-bordered input-primary w-full"
                    type="text"
                    placeholder="Search by keyword"
                  />
                  <p className="text-xs text-white/80">
                    Name, email, status, occupation, role, team, nationality,
                    country, track, age.
                  </p>

                  <div className="flex flex-row justify-end gap-4">
                    <div className="flex flex-col gap-2">
                      <p className="text-sm font-bold text-white/75">Sort by</p>
                      <select
                        className="bg-transparent text-sm border rounded-lg px-2"
                        value={searchSort}
                        onChange={onChangeSearchSort}
                      >
                        <option value={"none"}>None</option>
                        <option value={"firstName"}>First Name</option>
                        <option value={"lastName"}>Last Name</option>
                        <option value={"email"}>Email</option>
                        <option value={"score"}>Score</option>
                        <option value={"applicationCreatedAt"}>Created At</option>
                        <option value={"applicationUpdatedAt"}>Updated At</option>
                      </select>
                    </div>
                    <div className="flex items-center flex-col gap-2">
                      <p className="text-sm font-bold text-white/75">Desc</p>
                      <input type="checkbox" onChange={onChangeIsSortDescending} />
                    </div>
                  </div>
                </div>
                <div className="p-6 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white">
                    Applications List ({filteredDisplayableApplications.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredDisplayableApplications.length === 0 ? (
                    <div className="p-6 text-center text-white/70">
                      No applications found
                    </div>
                  ) : (
                    filteredDisplayableApplications.map((application) => (
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
                            {application.firstName} {application.lastName}
                          </h4>
                          <div className="text-right min-w-[30%] ">
                            {application.score ? (
                              <div className="text-sm font-bold text-white">
                                {application.score}/
                                {config?.maxApplicationEvaluationScore || 20}
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
                          {(() => {
                            const issues = getApplicationIssues(application.id);
                            if (issues.length === 0) return null;
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigateToIssue(application.id, issues[0]);
                                }}
                                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 transition-colors"
                                title={`Issues: ${issues.join(", ")}`}
                              >
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                </svg>
                                {issues.length}
                              </button>
                            );
                          })()}
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
            </>
          )}

          {activeTab === "issues" && (
            <>
              <div className="card py-4 px-3 mb-6">
                <div className="grid grid-cols-3 gap-4 divide-x divide-white/10">
                  <div className="text-center px-2">
                    <div className="text-xl font-bold mb-1 text-amber-400">
                      {duplicateGroups.length}
                    </div>
                    <div className="text-xs text-white/70">
                      Duplicates ({totalDuplicateApps} apps)
                    </div>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-xl font-bold mb-1 text-orange-400">
                      {oversizeTeams.length}
                    </div>
                    <div className="text-xs text-white/70">
                      Oversize (&gt;{MAX_TEAM_SIZE})
                    </div>
                  </div>
                  <div className="text-center px-2">
                    <div className="text-xl font-bold mb-1 text-red-400">
                      {missingFieldsApps.length}
                    </div>
                    <div className="text-xs text-white/70">
                      Missing Fields
                    </div>
                  </div>
                </div>
              </div>

              {/* Issue sub-tabs */}
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => {
                    setActiveIssueType("duplicates");
                    setSelectedApplication(null);
                  }}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    activeIssueType === "duplicates"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  Duplicates ({duplicateGroups.length})
                </button>
                <button
                  onClick={() => {
                    setActiveIssueType("oversize-team");
                    setSelectedApplication(null);
                  }}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    activeIssueType === "oversize-team"
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  Oversize ({oversizeTeams.length})
                </button>
                <button
                  onClick={() => {
                    setActiveIssueType("missing-fields");
                    setSelectedApplication(null);
                  }}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    activeIssueType === "missing-fields"
                      ? "bg-red-500/20 text-red-400 border border-red-500/50"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  Missing ({missingFieldsApps.length})
                </button>
              </div>

              <div
                className="card flex flex-col"
                style={{ height: "calc(100vh - 480px)" }}
              >
                <div className="flex-1 overflow-y-auto">
                  {activeIssueType === "duplicates" && (
                    <>
                      {duplicateGroups.length === 0 ? (
                        <div className="p-6 text-center text-white/70">
                          No potential duplicates found
                        </div>
                      ) : (
                        duplicateGroups.map((group) => {
                          const isExpanded = expandedGroups.has(group.key);
                          const firstApp = group.applications[0];
                          return (
                            <div
                              key={group.key}
                              className="border-b border-white/10"
                            >
                              <button
                                onClick={() => toggleGroup(group.key)}
                                className="w-full p-4 text-left hover:bg-white/5 transition-colors"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium text-sm text-white">
                                      {firstApp.firstName} {firstApp.lastName}
                                    </h4>
                                    <p className="text-xs text-white/50 mt-0.5">
                                      {firstApp.phone}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/50">
                                      {group.applications.length} entries
                                    </span>
                                    <svg
                                      className={`w-4 h-4 text-white/50 transition-transform ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                      />
                                    </svg>
                                  </div>
                                </div>
                              </button>
                              {isExpanded &&
                                group.applications.map((app) => (
                                  <div
                                    key={app.id}
                                    onClick={() =>
                                      handleApplicationSelect(app)
                                    }
                                    className={`pl-8 pr-4 py-3 cursor-pointer transition-colors hover:bg-white/5 border-t border-white/5 ${
                                      selectedApplication?.id === app.id
                                        ? "bg-primary/10"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-sm text-white/80">
                                          {app.email}
                                        </p>
                                        <p className="text-xs text-white/40 mt-0.5">
                                          {app.teamName || "No team"}
                                        </p>
                                      </div>
                                      <span
                                        className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClasses(
                                          getDisplayStatus(app)
                                        )}`}
                                      >
                                        {getDisplayStatus(app)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          );
                        })
                      )}
                    </>
                  )}

                  {activeIssueType === "oversize-team" && (
                    <>
                      {oversizeTeams.length === 0 ? (
                        <div className="p-6 text-center text-white/70">
                          No oversize teams found
                        </div>
                      ) : (
                        oversizeTeams.map((entry) => (
                          <div
                            key={entry.application.id}
                            onClick={() =>
                              handleApplicationSelect(entry.application)
                            }
                            className={`p-4 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5 ${
                              selectedApplication?.id === entry.application.id
                                ? "bg-primary/10 border-primary/30"
                                : ""
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm text-white truncate">
                                {entry.application.firstName}{" "}
                                {entry.application.lastName}
                              </h4>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/50">
                                {entry.count} members
                              </span>
                            </div>
                            <p className="text-xs text-white/50 truncate">
                              {entry.application.teamName || "No team name"}
                            </p>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {activeIssueType === "missing-fields" && (
                    <>
                      {missingFieldsApps.length === 0 ? (
                        <div className="p-6 text-center text-white/70">
                          No applications with missing required fields
                        </div>
                      ) : (
                        missingFieldsApps.map((entry) => (
                          <div
                            key={entry.application.id}
                            onClick={() =>
                              handleApplicationSelect(entry.application)
                            }
                            className={`p-4 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5 ${
                              selectedApplication?.id === entry.application.id
                                ? "bg-primary/10 border-primary/30"
                                : ""
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-sm text-white truncate">
                                {entry.application.firstName ||
                                  entry.application.email ||
                                  "Unknown"}{" "}
                                {entry.application.lastName || ""}
                              </h4>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/50">
                                {entry.missingFields.length} missing
                              </span>
                            </div>
                            <p className="text-xs text-red-400/70 truncate">
                              {entry.missingFields.slice(0, 3).join(", ")}
                              {entry.missingFields.length > 3 && "..."}
                            </p>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "in-progress" && (
            <>
              <div
                className="card flex flex-col"
                style={{ height: "calc(100vh - 440px)" }}
              >
                <div className="p-6 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-white">
                    In Progress ({inProgressApplications.length})
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {inProgressApplications.length === 0 ? (
                    <div className="p-6 text-center text-white/70">
                      No in-progress applications
                    </div>
                  ) : (
                    inProgressApplications.map((application) => (
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
                            {application.firstName} {application.lastName}
                          </h4>
                          <div className="text-right min-w-[30%]">
                            {application.score ? (
                              <div className="text-sm font-bold text-white">
                                {application.score}/{config?.maxApplicationEvaluationScore || 20}
                              </div>
                            ) : (
                              <div className="text-white/50 text-sm">Not scored</div>
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
            </>
          )}
        </div>

        <div className="lg:col-span-2">
          <div
            className="card flex flex-col"
            style={{ height: "calc(100vh - 280px)" }}
          >
            <div className="p-6 border-b border-white/10 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">
                {activeTab === "evaluate"
                  ? "Application Evaluator"
                  : "Application Detail"}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedApplication ? (
                <div className="space-y-6">
                  {/* Issue banners (only shown on issues tab) */}
                  {activeTab === "issues" &&
                    activeIssueType === "duplicates" && (
                      <div className="p-3 bg-amber-600/10 border border-amber-600/30 rounded-md">
                        <p className="text-amber-400 text-sm font-medium">
                          Potential Duplicate
                        </p>
                        <p className="text-amber-400/70 text-xs mt-1">
                          This application shares the same name and phone number
                          with another entry.
                        </p>
                      </div>
                    )}
                  {activeTab === "issues" &&
                    activeIssueType === "oversize-team" &&
                    (() => {
                      const members = (
                        selectedApplication.teamMembers || ""
                      )
                        .split(",")
                        .map((m) => m.trim())
                        .filter((m) => m.length > 0);
                      return (
                        <div className="p-3 bg-orange-600/10 border border-orange-600/30 rounded-md">
                          <p className="text-orange-400 text-sm font-medium">
                            Oversize Team &mdash; {members.length} members
                            listed (max {MAX_TEAM_SIZE})
                          </p>
                          <p className="text-orange-400/70 text-xs mt-1">
                            The applicant may or may not be included in this
                            list.
                          </p>
                          <ul className="mt-2 space-y-1">
                            {members.map((m, i) => (
                              <li
                                key={i}
                                className="text-orange-300 text-sm font-mono bg-orange-900/20 px-2 py-1 rounded"
                              >
                                {i + 1}. {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  {activeTab === "issues" &&
                    activeIssueType === "missing-fields" &&
                    (() => {
                      const entry = missingFieldsApps.find(
                        (e) => e.application.id === selectedApplication.id
                      );
                      if (!entry) return null;
                      return (
                        <div className="p-3 bg-red-600/10 border border-red-600/30 rounded-md">
                          <p className="text-red-400 text-sm font-medium">
                            {entry.missingFields.length} Required Field
                            {entry.missingFields.length > 1 ? "s" : ""} Missing
                          </p>
                          <ul className="mt-2 space-y-1">
                            {entry.missingFields.map((field) => (
                              <li
                                key={field}
                                className="text-red-300 text-sm font-mono bg-red-900/20 px-2 py-1 rounded"
                              >
                                {field}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}

                  {/* Reset Status (only in issues tab) */}
                  {activeTab === "issues" && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleResetStatus}
                        disabled={resetting || selectedApplication.status === APPLICATION_STATUS.NOT_APPLICABLE}
                        className="px-4 py-2.5 bg-amber-600/20 border border-amber-600/50 text-amber-400 rounded-md hover:bg-amber-600/30 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold text-sm"
                      >
                        {resetting ? "Resetting..." : "Reset Status to Not Applicable"}
                      </button>
                      {selectedApplication.retryCount !== undefined && selectedApplication.retryCount > 0 && (
                        <span className="text-xs text-white/50">
                          Retry count: {selectedApplication.retryCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* PROFILE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xl font-bold text-white mb-2">
                        {selectedApplication.firstName}{" "}
                        {selectedApplication.lastName}
                      </h4>
                      <div className="space-y-1">
                        <InfoRow
                          label="User ID"
                          value={selectedApplication.id}
                        />
                        <InfoRow
                          label="Email"
                          value={selectedApplication.email}
                        />
                        <InfoRow
                          label="Phone"
                          value={selectedApplication.phone}
                        />
                        <InfoRow
                          label="Gender"
                          value={selectedApplication.genderIdentity}
                        />
                        <InfoRow
                          label="Age"
                          value={`${calculateAge(selectedApplication.dateOfBirth)}`}
                        />
                        <InfoRow
                          label="Date of Birth"
                          value={selectedApplication.dateOfBirth}
                        />
                        <InfoRow
                          label="Nationality"
                          value={selectedApplication.nationality}
                        />
                        <InfoRow
                          label="Country of Residence"
                          value={selectedApplication.countryOfResidence}
                        />
                        <InfoRow
                          label="Preferred Language"
                          value={selectedApplication.preferredLanguage}
                        />
                      </div>
                    </div>
                    <div>
                      <SectionHeader title="Occupation" />
                      <div className="space-y-1">
                        <InfoRow
                          label="Level"
                          value={selectedApplication.currentOccupation}
                        />
                        <InfoRow
                          label="School / Company"
                          value={selectedApplication.occupationPlace}
                        />
                        <InfoRow
                          label="Major / Position"
                          value={selectedApplication.occupationDetail}
                        />
                        <InfoRow
                          label="University Year"
                          value={selectedApplication.universityYear}
                        />
                      </div>
                    </div>
                  </div>

                  {/* TEAM */}
                  <div>
                    <SectionHeader title="Team" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <InfoRow
                          label="Team Formation"
                          value={selectedApplication.teamFormation}
                        />
                        <InfoRow
                          label="Team Name"
                          value={selectedApplication.teamName}
                        />
                        <InfoRow
                          label="Interested Track"
                          value={selectedApplication.interestedTrack}
                        />
                      </div>
                      <div className="space-y-1">
                        <InfoRow
                          label="Team Members"
                          value={selectedApplication.teamMembers}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SPEED DATING */}
                  <div>
                    <SectionHeader title="Speed Dating" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <InfoRow
                          label="Primary Role"
                          value={selectedApplication.primaryRole}
                        />
                        <InfoRow
                          label="Proficiency"
                          value={selectedApplication.roleProficiency}
                        />
                      </div>
                      <div className="space-y-1">
                        <InfoRow
                          label="Tools / Languages"
                          value={selectedApplication.toolsUsed}
                        />
                        <InfoRow
                          label="Past Projects"
                          value={selectedApplication.pastProjects}
                        />
                      </div>
                    </div>
                  </div>

                  {/* LINKS & DOCUMENTS */}
                  <div>
                    <SectionHeader title="Links & Documents" />
                    <div className="flex flex-wrap gap-4">
                      <LinkRow
                        href={selectedApplication.resume}
                        label="Resume (PDF)"
                      />
                      <LinkRow
                        href={selectedApplication.github}
                        label="GitHub"
                      />
                      <LinkRow
                        href={selectedApplication.linkedin}
                        label="LinkedIn"
                      />
                      <LinkRow
                        href={selectedApplication.devpost}
                        label="DevPost"
                      />
                      <LinkRow
                        href={selectedApplication.signedConsent}
                        label="Signed Consent Form"
                      />
                    </div>
                  </div>

                  {/* ESSAY QUESTIONS */}
                  <EssayField
                    label="Your Dream Creation"
                    value={selectedApplication.qDreamCreation}
                  />
                  <EssayField
                    label="Your Proudest Moment"
                    value={selectedApplication.qProudestMoment}
                  />
                  <EssayField
                    label="Why Garuda Hacks"
                    value={selectedApplication.qWhyGarudaHacks}
                  />

                  {/* LOGISTICS */}
                  <div>
                    <SectionHeader title="Logistics" />
                    <div className="space-y-1">
                      <InfoRow
                        label="Overnight Plan"
                        value={selectedApplication.overnightPlan}
                      />
                      <InfoRow
                        label="Leave Letter"
                        value={selectedApplication.leaveLetter}
                      />
                    </div>
                  </div>

                  {/* EMERGENCY CONTACT */}
                  <div>
                    <SectionHeader title="Emergency Contact" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <InfoRow
                          label="Phone"
                          value={selectedApplication.phoneEmergency}
                        />
                        <InfoRow
                          label="Other Contact Methods"
                          value={selectedApplication.emergencyWays}
                        />
                      </div>
                      <div className="space-y-1">
                        <InfoRow
                          label="Relationship"
                          value={selectedApplication.emergencyRelation}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="space-y-1">
                        <InfoRow
                          label="Allergies"
                          value={selectedApplication.allergies}
                        />
                      </div>
                      <div className="space-y-1">
                        <InfoRow
                          label="Dietary Restrictions"
                          value={selectedApplication.dietaryRestrictions}
                        />
                      </div>
                      <div className="space-y-1">
                        <InfoRow
                          label="Medical Conditions"
                          value={selectedApplication.medicalConditions}
                        />
                      </div>
                    </div>
                  </div>

                  {/* ADDITIONAL INFO */}
                  <div>
                    <SectionHeader title="Additional Info" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <InfoRow
                          label="Hackathon Count"
                          value={selectedApplication.hackathonCount}
                        />
                        <InfoRow
                          label="Previous GH Iterations"
                          value={selectedApplication.ghCount?.join(", ")}
                        />
                        <InfoRow
                          label="Referral Source"
                          value={selectedApplication.referralSource}
                        />
                        <InfoRow
                          label="How They Heard About GH"
                          value={selectedApplication.joinSource?.join("; ")}
                        />
                        <InfoRow
                          label="Referral Code"
                          value={selectedApplication.referralCode}
                        />
                      </div>
                      <div className="space-y-1">
                        <InfoRow
                          label="Join Reason"
                          value={selectedApplication.joinReason}
                        />
                        <InfoRow
                          label="Application Date"
                          value={formatApplicationDate(
                            selectedApplication.applicationCreatedAt
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* EVALUATION */}
                  <div className="border-t border-white/10 pt-6">
                    <h5 className="font-semibold text-white mb-4">
                      Evaluation
                    </h5>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Score (0-
                          {config?.maxApplicationEvaluationScore || 20})
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={config?.maxApplicationEvaluationScore || 20}
                          step="0.1"
                          value={evaluationScore}
                          onChange={(e) => setEvaluationScore(e.target.value)}
                          className="input w-full"
                          placeholder={`Enter score (0-${config?.maxApplicationEvaluationScore || 20})`}
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
                          parseFloat(evaluationScore) >
                            (config?.maxApplicationEvaluationScore || 20)
                        }
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Submit Score
                      </button>
                    </div>
                  </div>

                  {/* STATUS OVERRIDES */}
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
        <ApplicationAcceptModal setShowAcceptModal={setShowAcceptModal} />
      )}
    </div>
  );
}
