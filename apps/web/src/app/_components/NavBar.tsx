import { Target, GitBranch } from "lucide-react";
import { CONNECT_REPO_URL } from "../../services/repos.service";

import { ThemeToggle } from "./ThemeToggle";

export interface NavBarProps {
    activeCount: number;
}

export function NavBar({ activeCount }: NavBarProps) {
    return (
        <nav
            className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5"
            style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderBottom: "1px solid var(--border-subtle)",
            }}
        >
            <div className="flex items-center gap-2.5">
                <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "var(--primary)" }}
                >
                    <Target size={15} style={{ color: "var(--text-inverse)" }} />
                </div>
                <span className="bricolage font-bold text-xl tracking-tight" style={{ color: "var(--text-main)" }}>
                    Orion
                </span>
                <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full ml-1"
                    style={{ background: "var(--primary-bg)", color: "var(--primary-light)", border: "1px solid var(--primary-border)" }}
                >
                    Beta
                </span>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                {["Dashboard", "", ""].map((item, i) => (
                    <button
                        key={item || `nav-item-${i}`}
                        className="transition-colors hover:text-blue-500"
                        style={i === 0 ? { color: "var(--primary-hover)", fontWeight: 600 } : {}}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <ThemeToggle />
                <a
                    href={CONNECT_REPO_URL}
                    className="hidden sm:flex items-center gap-2 text-xs font-semibold px-4 py-1.5 rounded-full transition-all hover:opacity-80"
                    style={{
                        background: "var(--bg-card)",
                        color: "var(--primary)",
                        border: "1px solid var(--primary-border-light)",
                        textDecoration: "none",
                        cursor: "pointer"
                    }}
                >
                    <GitBranch size={14} />
                    Connect GitHub Repo
                </a>
                <div
                    className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{
                        background: activeCount > 0 ? "#F0FDF4" : "var(--bg-muted)",
                        color: activeCount > 0 ? "#16A34A" : "var(--text-muted)",
                        border: activeCount > 0 ? "1px solid #BBF7D0" : "1px solid var(--border-muted)"
                    }}
                >
                    {activeCount > 0 && (
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "#22C55E" }} />
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "#22C55E" }} />
                        </span>
                    )}
                    {activeCount > 0 ? `${activeCount} active` : "0 idle"}
                </div>
            </div>
        </nav>
    );
}
