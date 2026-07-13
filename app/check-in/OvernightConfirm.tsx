"use client";

import { useState } from "react";
import { Check, Home, Loader2, Moon } from "lucide-react";
import toast from "react-hot-toast";
import { setOvernightPlan } from "./checkin-client";

/**
 * The "Overnight Plan" step: shows the hacker's current overnight answer and
 * lets the usher switch it (staying / not staying). Each switch writes straight
 * to the application (admin SDK) and reflects the new value.
 */
export function OvernightConfirm({
  uid,
  overnight,
  onChange,
}: {
  uid: string;
  overnight: boolean;
  onChange: (value: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  const switchTo = async (value: boolean) => {
    if (busy || value === overnight) return;
    setBusy(true);
    const res = await setOvernightPlan(uid, value);
    setBusy(false);
    if (!res.ok) {
      toast.error(res.reason);
      return;
    }
    onChange(res.overnight);
    toast.success(
      res.overnight ? "Set to staying overnight" : "Set to not staying overnight"
    );
  };

  return (
    <div className="space-y-3">
      <div
        className={`rounded-xl border p-4 ${
          overnight
            ? "border-[#874ffe]/40 bg-[#874ffe]/10"
            : "border-white/15 bg-white/5"
        }`}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          {overnight ? (
            <Moon className="h-4 w-4 text-[#b794ff]" />
          ) : (
            <Home className="h-4 w-4 text-white/60" />
          )}
          {overnight ? "Staying overnight at UMN" : "Not staying overnight"}
        </p>
        <p className="mt-1 text-xs text-white/50">
          Confirm this with the hacker. If it changed, switch it below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <OvernightOption
          label="Staying overnight"
          icon={<Moon className="h-4 w-4" />}
          active={overnight}
          busy={busy}
          onClick={() => switchTo(true)}
        />
        <OvernightOption
          label="Not staying"
          icon={<Home className="h-4 w-4" />}
          active={!overnight}
          busy={busy}
          onClick={() => switchTo(false)}
        />
      </div>
    </div>
  );
}

function OvernightOption({
  label,
  icon,
  active,
  busy,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
        active
          ? "border-[#874ffe]/60 bg-[#874ffe]/20 text-white"
          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : active ? (
        <Check className="h-4 w-4" />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}
