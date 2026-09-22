"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  GitCompare,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Evaluation Runs",
    href: "/runs",
    icon: Activity,
  },
  {
    name: "Deployment Gate",
    href: "/gate",
    icon: ShieldCheck,
  },
  {
    name: "Baseline Comparison",
    href: "/baseline",
    icon: GitCompare,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart3,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-5">
      {/* Brand */}

      <Link
        href="/"
        className="mb-10 flex items-center gap-3"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black">
          <ShieldCheck size={21} />
        </div>

        <div>
          <h1 className="text-sm font-semibold text-white">
            RAG Guardrails
          </h1>

          <p className="text-xs text-zinc-500">
            LLMOps Platform
          </p>
        </div>
      </Link>

      {/* Navigation */}

      <nav className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;

          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={
                  active
                    ? "text-zinc-200"
                    : "text-zinc-500 group-hover:text-zinc-300"
                }
              />

              <span>{item.name}</span>

              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Environment */}

      <div className="mt-auto">
        <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />

            <span className="text-xs font-medium text-zinc-300">
              System Online
            </span>
          </div>

          <p className="mt-1 text-[10px] text-zinc-600">
            Evaluation engine ready
          </p>
        </div>

        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
        >
          <Settings size={18} />

          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}