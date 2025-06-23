import { APPLICATION_STATUS, CombinedApplicationData } from "@/lib/types";

interface AcceptingApplicationRowComponentProps {
    application: CombinedApplicationData
}

export default function AcceptingApplicationRowComponent(
    { application }: AcceptingApplicationRowComponentProps
) {
    const getDisplayStatus = (application: CombinedApplicationData): string => {
        if (
            application.status === APPLICATION_STATUS.SUBMITTED &&
            application.score
        ) {
            return APPLICATION_STATUS.GRADED;
        }
        return application.status;
    };
    return (
        <div
            key={application.id}
            className={`w-full max-w-full p-4 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5`}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-sm text-white truncate">
                    {application.firstName}
                </h4>
                <div className="text-right min-w-[30%]">
                    {application.score ? (
                        <div className="text-sm font-bold text-white">
                            <span className="text-green-400">{application.score}</span>/10
                        </div>
                    ) : (
                        <div className="text-white/50 text-sm">
                            Not scored
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-between items-center">
                <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border`}
                >
                    {getDisplayStatus(application)}
                </span>
            </div>
        </div>
    )
}