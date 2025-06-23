import { CombinedApplicationData } from "@/lib/types";
import { Eye } from "lucide-react";

interface AcceptingApplicationRowComponentProps {
    application: CombinedApplicationData
    onPreviewApplication: (application: CombinedApplicationData) => void
}

export default function AcceptingApplicationRowComponent(
    { application, onPreviewApplication }: AcceptingApplicationRowComponentProps
) {
    
    return (
        <div
            key={application.id}
            className={`w-full max-w-full p-4 border-b border-white/10 cursor-pointer transition-colors hover:bg-white/5`}
        >
            <div className="grid grid-cols-3 place-items-center">
                <h4 className="font-medium text-sm text-white truncate place-self-start">
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
                <button
                    onClick={() => onPreviewApplication(application)}
                    className="flex flex-row items-center px-3 py-1 border border-white/75 rounded-full gap-1 hover:bg-white/10">
                    <span className="text-xs">Check application</span>
                    <Eye size={16} />
                </button>
            </div>
        </div>
    )
}