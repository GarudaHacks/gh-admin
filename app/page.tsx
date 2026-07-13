"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  getPortalConfig,
  updatePortalConfig,
  getMatchConfig,
  updateMatchConfig,
  getMentorshipConfig,
  updateMentorshipConfig,
} from "@/lib/firebaseUtils";
import { PortalConfig, MatchConfig, MentorshipConfig } from "@/lib/types";

const DEFAULT_MATCH_CONFIG: MatchConfig = {
  isMatchOpen: false,
  startDate: new Date(),
  endDate: new Date(),
};

const DEFAULT_MENTORSHIP_CONFIG: MentorshipConfig = {
  isMentorshipOpen: false,
  startDate: new Date(),
  endDate: new Date(),
};

export default function Home() {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<PortalConfig | null>(
    null
  );
  const [matchConfig, setMatchConfig] = useState<MatchConfig | null>(null);
  const [originalMatchConfig, setOriginalMatchConfig] =
    useState<MatchConfig | null>(null);
  const [mentorshipConfig, setMentorshipConfig] =
    useState<MentorshipConfig | null>(null);
  const [originalMentorshipConfig, setOriginalMentorshipConfig] =
    useState<MentorshipConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const [portalConfig, matchConfigData, mentorshipConfigData] =
        await Promise.all([
          getPortalConfig(),
          getMatchConfig(),
          getMentorshipConfig(),
        ]);

      setConfig(portalConfig);
      setOriginalConfig(portalConfig);

      setMatchConfig(matchConfigData ?? DEFAULT_MATCH_CONFIG);
      setOriginalMatchConfig(matchConfigData);

      setMentorshipConfig(mentorshipConfigData ?? DEFAULT_MENTORSHIP_CONFIG);
      setOriginalMentorshipConfig(mentorshipConfigData);
    } catch {
      setError("Failed to load portal configuration");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = (): boolean => {
    if (!config || !originalConfig || !matchConfig || !mentorshipConfig)
      return false;

    const portalChanged =
      config.applicationStartDate.getTime() !==
        originalConfig.applicationStartDate.getTime() ||
      config.applicationCloseDate.getTime() !==
        originalConfig.applicationCloseDate.getTime() ||
      config.applicationReleaseDate.getTime() !==
        originalConfig.applicationReleaseDate.getTime() ||
      config.hackathonStartDate.getTime() !==
        originalConfig.hackathonStartDate.getTime() ||
      config.hackathonEndDate.getTime() !==
        originalConfig.hackathonEndDate.getTime() ||
      config.applicationsOpen !== originalConfig.applicationsOpen;

    const matchChanged =
      !originalMatchConfig ||
      matchConfig.isMatchOpen !== originalMatchConfig.isMatchOpen ||
      matchConfig.startDate.getTime() !==
        originalMatchConfig.startDate.getTime() ||
      matchConfig.endDate.getTime() !== originalMatchConfig.endDate.getTime();

    const mentorshipChanged =
      !originalMentorshipConfig ||
      mentorshipConfig.isMentorshipOpen !==
        originalMentorshipConfig.isMentorshipOpen ||
      mentorshipConfig.startDate.getTime() !==
        originalMentorshipConfig.startDate.getTime() ||
      mentorshipConfig.endDate.getTime() !==
        originalMentorshipConfig.endDate.getTime();

    return portalChanged || matchChanged || mentorshipChanged;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !matchConfig || !mentorshipConfig) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const [portalSuccess, matchSuccess, mentorshipSuccess] =
        await Promise.all([
          updatePortalConfig(config),
          updateMatchConfig(matchConfig),
          updateMentorshipConfig(mentorshipConfig),
        ]);

      if (portalSuccess && matchSuccess && mentorshipSuccess) {
        setSuccess(true);
        setOriginalConfig(config);
        setOriginalMatchConfig(matchConfig);
        setOriginalMentorshipConfig(mentorshipConfig);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("Failed to update configuration");
      }
    } catch {
      setError("Failed to update configuration");
    } finally {
      setSaving(false);
    }
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleDateChange = (field: keyof PortalConfig, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      [field]: new Date(value),
    });
  };

  const handleMatchDateChange = (
    field: "startDate" | "endDate",
    value: string
  ) => {
    if (!matchConfig) return;
    setMatchConfig({
      ...matchConfig,
      [field]: new Date(value),
    });
  };

  const handleMentorshipDateChange = (
    field: "startDate" | "endDate",
    value: string
  ) => {
    if (!mentorshipConfig) return;
    setMentorshipConfig({
      ...mentorshipConfig,
      [field]: new Date(value),
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Portal Dashboard"
          subtitle="Manage application dates and portal settings for Garuda Hacks 6.0."
        />
        <LoadingSpinner text="Loading configuration..." />
      </div>
    );
  }

  if (!config || !matchConfig || !mentorshipConfig) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Portal Dashboard"
          subtitle="Manage application dates and portal settings for Garuda Hacks 6.0."
        />
        <div className="card p-6 text-center">
          <div className="text-destructive mb-4">
            {error || "Portal configuration not found"}
          </div>
          <button onClick={loadConfig} className="btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portal Dashboard"
        subtitle="Manage application dates and portal settings for Garuda Hacks 6.0."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Application Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Application Start Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(config.applicationStartDate)}
                onChange={(e) =>
                  handleDateChange("applicationStartDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Application Close Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(config.applicationCloseDate)}
                onChange={(e) =>
                  handleDateChange("applicationCloseDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Application Release Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(config.applicationReleaseDate)}
                onChange={(e) =>
                  handleDateChange("applicationReleaseDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>
          </div>
          <div className="flex flex-col pt-6 space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.applicationsOpen}
                onChange={(e) =>
                  setConfig({ ...config, applicationsOpen: e.target.checked })
                }
                className="w-5 h-5 rounded border-border bg-input"
              />
              <span className="text-sm font-medium text-white">
                Applications Open
              </span>
            </label>
            <p className="text-xs text-yellow-400 ml-8">
              *Warning: this will override the application start and end date
            </p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Hackathon Schedule
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Hackathon Start Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(config.hackathonStartDate)}
                onChange={(e) =>
                  handleDateChange("hackathonStartDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Hackathon End Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(config.hackathonEndDate)}
                onChange={(e) =>
                  handleDateChange("hackathonEndDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Team Matching Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Match Start Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(matchConfig.startDate)}
                onChange={(e) =>
                  handleMatchDateChange("startDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Match End Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(matchConfig.endDate)}
                onChange={(e) =>
                  handleMatchDateChange("endDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>
          </div>
          <div className="flex flex-col pt-6 space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={matchConfig.isMatchOpen}
                onChange={(e) =>
                  setMatchConfig({
                    ...matchConfig,
                    isMatchOpen: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded border-border bg-input"
              />
              <span className="text-sm font-medium text-white">
                Team Matching Open
              </span>
            </label>
            <p className="text-xs text-yellow-400 ml-8">
              *Warning: this will override the match start and end date
            </p>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Mentorship Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Mentorship Start Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(mentorshipConfig.startDate)}
                onChange={(e) =>
                  handleMentorshipDateChange("startDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Mentorship End Date
              </label>
              <input
                type="datetime-local"
                value={formatDateForInput(mentorshipConfig.endDate)}
                onChange={(e) =>
                  handleMentorshipDateChange("endDate", e.target.value)
                }
                className="input w-full"
                required
              />
            </div>
          </div>
          <div className="flex flex-col pt-6 space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={mentorshipConfig.isMentorshipOpen}
                onChange={(e) =>
                  setMentorshipConfig({
                    ...mentorshipConfig,
                    isMentorshipOpen: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded border-border bg-input"
              />
              <span className="text-sm font-medium text-white">
                Mentorship Booking Open
              </span>
            </label>
            <p className="text-xs text-yellow-400 ml-8">
              *Warning: this will override the mentorship start and end date
            </p>
          </div>
        </div>

        {error && (
          <div className="card p-4 bg-destructive/20 border-destructive/50">
            <div className="text-destructive text-sm">{error}</div>
          </div>
        )}

        {success && (
          <div className="card p-4 bg-accent-accessible/20 border-accent-accessible/50">
            <div className="text-accent-accessible text-sm">
              Configuration updated successfully!
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !hasChanges()}
            className="btn-primary px-6 py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}
