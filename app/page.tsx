"use client";

import { useState, useEffect } from "react";
import PageHeader from "@/components/PageHeader";
import LoadingSpinner from "@/components/LoadingSpinner";
import { getPortalConfig, updatePortalConfig } from "@/lib/firebaseUtils";
import { PortalConfig } from "@/lib/types";

export default function Home() {
  const [config, setConfig] = useState<PortalConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<PortalConfig | null>(
    null
  );
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
      const portalConfig = await getPortalConfig();
      setConfig(portalConfig);
      setOriginalConfig(portalConfig);
    } catch {
      setError("Failed to load portal configuration");
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = (): boolean => {
    if (!config || !originalConfig) return false;

    return (
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
      config.applicationsOpen !== originalConfig.applicationsOpen
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const success = await updatePortalConfig(config);
      if (success) {
        setSuccess(true);
        setOriginalConfig(config);
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

  if (!config) {
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
