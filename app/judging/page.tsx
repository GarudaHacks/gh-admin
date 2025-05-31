import PageHeader from "@/components/PageHeader";

export default function Judging() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Judging"
        subtitle="Manage judges, scoring criteria, and evaluate project submissions."
      />

      {/* Judging Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">8</div>
            <div className="text-sm text-muted-foreground">Active Judges</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary mb-2">25</div>
            <div className="text-sm text-muted-foreground">
              Projects Submitted
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-foreground mb-2">
              18
            </div>
            <div className="text-sm text-muted-foreground">Projects Judged</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive mb-2">7</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </div>
        </div>
      </div>

      {/* Judging Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Judging Progress
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="text-card-foreground">72%</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: "72%" }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Technical Review</span>
                <span className="text-card-foreground">85%</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div
                  className="bg-secondary h-2 rounded-full"
                  style={{ width: "85%" }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Design Review</span>
                <span className="text-card-foreground">60%</span>
              </div>
              <div className="w-full bg-muted/20 rounded-full h-2">
                <div
                  className="bg-accent-foreground h-2 rounded-full"
                  style={{ width: "60%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">
            Top Projects
          </h3>
          <div className="space-y-3">
            {[
              { name: "EcoTrack", score: 9.2, category: "Sustainability" },
              { name: "HealthLink", score: 8.9, category: "Healthcare" },
              { name: "EduVerse", score: 8.7, category: "Education" },
              { name: "FinFlow", score: 8.5, category: "Fintech" },
            ].map((project, index) => (
              <div
                key={index}
                className="flex justify-between items-center p-3 rounded-lg hover:bg-accent/5"
              >
                <div>
                  <div className="font-medium text-card-foreground">
                    {project.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {project.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">{project.score}</div>
                  <div className="text-xs text-muted-foreground">/ 10</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Judges Panel */}
      <div className="card">
        <div className="p-6 border-b border-border">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-card-foreground">
              Judges Panel
            </h3>
            <button className="btn-primary">Assign New Judge</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/10">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Judge
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Expertise
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Projects Assigned
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Completed
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: "Prof. Anderson",
                  expertise: "AI/ML",
                  assigned: 4,
                  completed: 4,
                  status: "Available",
                },
                {
                  name: "Dr. Liu",
                  expertise: "Web Development",
                  assigned: 3,
                  completed: 2,
                  status: "Judging",
                },
                {
                  name: "Sarah Williams",
                  expertise: "UI/UX",
                  assigned: 3,
                  completed: 3,
                  status: "Available",
                },
                {
                  name: "Mark Thompson",
                  expertise: "Mobile Dev",
                  assigned: 4,
                  completed: 1,
                  status: "Judging",
                },
              ].map((judge, index) => (
                <tr key={index} className="border-b border-border">
                  <td className="p-4 text-card-foreground font-medium">
                    {judge.name}
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {judge.expertise}
                  </td>
                  <td className="p-4 text-center text-card-foreground">
                    {judge.assigned}
                  </td>
                  <td className="p-4 text-center text-card-foreground">
                    {judge.completed}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        judge.status === "Available"
                          ? "bg-accent-foreground/10 text-accent-foreground"
                          : "bg-secondary/10 text-secondary"
                      }`}
                    >
                      {judge.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
