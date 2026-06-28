"use client";

import MentorListComponent from "@/components/MentorList";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

export default function Mentorship() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentorship"
        subtitle="Add mentor, create schedules, and see ongoing mentoring."
      />
      <div>
        <MentorListComponent />
      </div>
    </div>
  );
}
