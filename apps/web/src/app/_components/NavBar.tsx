import { Target } from "lucide-react";

export interface NavBarProps {
    activeCount: number;
}

export function NavBar({ activeCount }: NavBarProps) {
    return (
        <nav
            className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5"
            style={{
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderBottom: "1px solid #EFF3FB",
            }}
        >
            <div className="flex items-center gap-2.5">
                <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: "#2563EB" }}
                >
                    <Target size={15} style={{ color: "#fff" }} />
                </div>
                <span className="bricolage font-bold text-xl tracking-tight" style={{ color: "#0F172A" }}>
                    Orion
                </span>
                <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full ml-1"
                    style={{ background: "#EFF6FF", color: "#3B82F6", border: "1px solid #DBEAFE" }}
                >
                    Beta
                </span>
            </div>

            <div className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "#64748B" }}>
                {["Dashboard", "", ""].map((item, i) => (
                    <button
                        key={item}
                        className="transition-colors hover:text-slate-900"
                        style={i === 0 ? { color: "#1D4ED8", fontWeight: 600 } : {}}
                    >
                        {item}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-3">
                <div
                    className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{
                        background: activeCount > 0 ? "#F0FDF4" : "#F8FAFC",
                        color: activeCount > 0 ? "#16A34A" : "#64748B",
                        border: activeCount > 0 ? "1px solid #BBF7D0" : "1px solid #E2E8F0"
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
