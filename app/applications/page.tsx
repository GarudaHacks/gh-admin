import PageHeader from "@/components/PageHeader";

export default function Applications() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        subtitle="Manage and review participant applications for Garuda Hacks 6.0."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">150</div>
            <div className="text-sm text-white/70">Total Applications</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary mb-2">85</div>
            <div className="text-sm text-white/70">Pending Review</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-foreground mb-2">
              45
            </div>
            <div className="text-sm text-white/70">Approved</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-destructive mb-2">20</div>
            <div className="text-sm text-white/70">Rejected</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">
            Recent Applications
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-white/70">
                  Name
                </th>
                <th className="text-left p-4 text-sm font-medium text-white/70">
                  Email
                </th>
                <th className="text-left p-4 text-sm font-medium text-white/70">
                  University
                </th>
                <th className="text-left p-4 text-sm font-medium text-white/70">
                  Status
                </th>
                <th className="text-left p-4 text-sm font-medium text-white/70">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  name: "John Doe",
                  email: "john@example.com",
                  university: "University of Indonesia",
                  status: "pending",
                },
                {
                  name: "Jane Smith",
                  email: "jane@example.com",
                  university: "Bandung Institute of Technology",
                  status: "approved",
                },
                {
                  name: "Bob Johnson",
                  email: "bob@example.com",
                  university: "Gadjah Mada University",
                  status: "pending",
                },
              ].map((application, index) => (
                <tr key={index} className="border-b border-white/10">
                  <td className="p-4 text-white">{application.name}</td>
                  <td className="p-4 text-white/70">{application.email}</td>
                  <td className="p-4 text-white/70">
                    {application.university}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        application.status === "approved"
                          ? "bg-accent-foreground/20 text-accent-foreground"
                          : application.status === "rejected"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-secondary/20 text-secondary"
                      }`}
                    >
                      {application.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button className="text-primary hover:text-primary/80 text-sm">
                        View
                      </button>
                      <button className="text-accent-foreground hover:text-accent-foreground/80 text-sm">
                        Approve
                      </button>
                      <button className="text-destructive hover:text-destructive/80 text-sm">
                        Reject
                      </button>
                    </div>
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
