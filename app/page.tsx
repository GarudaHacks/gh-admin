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
    </div>
  );
}
