import PageHeader from "@/components/PageHeader";
import UnderConstruction from "@/components/UnderConstruction";

export default function Mentorship() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentorship"
        subtitle="Connect mentors with participants and manage mentorship programs."
      />
      <UnderConstruction
        feature="Mentorship System"
        description="This section will allow you to manage mentor assignments, track mentorship sessions, and facilitate connections between mentors and participants during Garuda Hacks 6.0."
      />
    </div>
  );
}
