import PageHeader from "@/components/PageHeader";

export default function Mentorship() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mentorship"
        subtitle="Connect mentors with participants and manage mentorship programs."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">12</div>
            <div className="text-sm text-white/70">Active Mentors</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary mb-2">45</div>
            <div className="text-sm text-white/70">Teams Matched</div>
          </div>
        </div>
        <div className="card p-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-accent-foreground mb-2">
              28
            </div>
            <div className="text-sm text-white/70">Sessions Completed</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">
              Available Mentors
            </h3>
            <button className="btn-primary">Add New Mentor</button>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                name: "Dr. Sarah Chen",
                expertise: "AI/ML, Data Science",
                teams: 3,
                rating: 4.9,
              },
              {
                name: "Alex Rodriguez",
                expertise: "Full Stack Development",
                teams: 4,
                rating: 4.8,
              },
              {
                name: "Maya Patel",
                expertise: "UI/UX Design",
                teams: 2,
                rating: 5.0,
              },
              {
                name: "James Kim",
                expertise: "Blockchain, Web3",
                teams: 3,
                rating: 4.7,
              },
              {
                name: "Emily Johnson",
                expertise: "Mobile Development",
                teams: 2,
                rating: 4.9,
              },
              {
                name: "Roberto Silva",
                expertise: "DevOps, Cloud",
                teams: 1,
                rating: 4.6,
              },
            ].map((mentor, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-lg p-4 hover:shadow-md transition-shadow bg-white/5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white">{mentor.name}</h4>
                    <p className="text-sm text-white/70">{mentor.expertise}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-accent-foreground">
                      ★ {mentor.rating}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70">
                    {mentor.teams} teams assigned
                  </span>
                  <button className="text-primary hover:text-primary/80">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
