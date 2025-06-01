import { Icon } from 'next/dist/lib/metadata/types/metadata-types'
import React from 'react'

interface SidebarTabProps {
    title: string;
    icon?: Icon;
    selected: boolean;
    onClick: () => void;
}

function SidebarTab({title, selected, onClick}: SidebarTabProps) {
  return (
    <div className={`cursor-pointer px-4 py-2 rounded-md text-md
                    ${selected ? "bg-primary-dark font-semibold" : "bg-none font-normal"}`}
         onClick={onClick}>
        <div className="flex gap-x-2 text-secondary">
            {/* Place icon here once icon dependency installed */}
            <span>{title}</span>
        </div>
    </div>
  )
}

export default SidebarTab