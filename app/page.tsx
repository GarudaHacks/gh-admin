import PageHeader from "@/components/PageHeader";

export default function Home() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        subtitle="View all important announcements and events here."
      />

      {/* Applications Announcement */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-primary">
          Applications are open!
        </h2>

        <div className="card-highlight p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-white">
                <span className="font-semibold">Apply by June 19, 2025</span>{" "}
                for a spot at Garuda Hacks 6.0.
              </p>
              <p className="text-white">
                <span className="font-semibold">Date:</span> July 23, 2025 -
                July 25, 2025.
              </p>
              <p className="text-white">
                <span className="font-semibold">Venue:</span> Universitas
                Multimedia Nusantara.
              </p>
            </div>

            <button className="btn-primary px-6 py-3 font-semibold">
              Apply Now
            </button>
          </div>
        </div>
      </div>

      {/* Additional Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Recent Updates
          </h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-white">Workshop schedule updated</p>
                <p className="text-xs text-white/60">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-white">
                  New mentor applications received
                </p>
                <p className="text-xs text-white/60">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-accent-foreground rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-white">Judging criteria finalized</p>
                <p className="text-xs text-white/60">1 day ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-3">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Total Applications</span>
              <span className="text-2xl font-bold text-primary">150</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Active Mentors</span>
              <span className="text-2xl font-bold text-secondary">12</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/70">Projects Submitted</span>
              <span className="text-2xl font-bold text-accent-foreground">
                25
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
