import PageHeader from "@/components/PageHeader";
import UnderConstruction from "@/components/UnderConstruction";

export default function Judging() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Judging"
        subtitle="Manage judges, scoring criteria, and evaluate project submissions."
      />
      <UnderConstruction
        feature="Judging System"
        description="This section will provide tools to manage judge assignments, create scoring rubrics, evaluate project submissions, and track judging progress throughout Garuda Hacks 6.0."
      />
    </div>
  );
}
