'use client'

import React, { useState } from 'react'
import SidebarTab from './SidebarTab'
import { useRouter } from 'next/navigation'
import ProfileBar from './ProfileBar'

const TABS = [
    { name: "Portal", path: "/portal" },
    { name: "Hacker Applications", path: "/applications" },
    { name: "Judging", path: "/judging" },
    { name: "Mailing", path: "/mailing" },
    { name: "Mentorship", path: "/mentorship" },
]

// Allows selection between tabs (sections) of the portal
function Sidebar() {

    const router = useRouter();

    // Currently displayed section/tab
    const [selected, setSelected] = useState(TABS[0].name)

    // Set selected path and display relevant section
    const handleTabClick = (tabName: string, path: string) => {
        setSelected(tabName);
        router.push(path);
    }

  return (
    <div className="
        bg-primary 
        h-screen
        w-[18rem]
    ">
        <div className="p-8">
            {/* Logo header */}
            <div className="flex flex-row justify-start gap-x-2 w-[5rem] items-center">
                <img src="ghq_logo.svg" alt="ghq logo white" height="60" width="20"/>
                <div className="text-sm/[1rem] text-secondary font-medium">
                    Internal <br />
                    Admin
                </div>
            </div>

            {/* Navigation options */}
            <div className="mt-6 flex flex-col gap-y-2">
                {TABS.map((tab) => (
                    <SidebarTab
                    key={tab.name}
                    title={tab.name}
                    selected={tab.name === selected}
                    onClick={() => handleTabClick(tab.name, tab.path)}
                    />
                ))}
            </div>

            {/* Profile & Log out */}
            <ProfileBar />
        </div>
    </div>
  )
}

export default Sidebar