"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ztteam_navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/dashboard/urls", icon: "link", label: "URL Input" },
  { href: "/dashboard/queue", icon: "list_alt", label: "Queue" },
  { href: "/dashboard/generate", icon: "auto_awesome", label: "AI Generate" },
  { href: "/dashboard/review", icon: "rate_review", label: "Review" },
  { href: "/dashboard/video", icon: "movie", label: "Video" },
];

export default function ZTTeamSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-50">
      <div className="p-6">
        {/** Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-[#1337ec] rounded-lg p-2 flex items-center justify-center">
            <span className="material-symbols-outlined text-white">
              smart_toy
            </span>
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">ZTTeam</h1>
            <p className="text-xs text-slate-400">Pipeline Dashboard</p>
          </div>
        </div>

        {/** Nav */}
        <nav className="flex flex-col gap-2">
          {ztteam_navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? "bg-[#1337ec] text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="text-sm font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/** Footer */}
      <div className="mt-auto p-6 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#1337ec] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">
              person
            </span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold truncate">ZTTeam Admin</p>
            <p className="text-xs text-slate-400">Pipeline Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
