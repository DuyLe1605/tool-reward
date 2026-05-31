import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, Terminal } from "lucide-react";

// Bảng màu rực rỡ dùng cho tên profile
const PROFILE_COLORS = [
    "#f87171", // red-400
    "#fb923c", // orange-400
    "#facc15", // yellow-400
    "#4ade80", // green-400
    "#34d399", // emerald-400
    "#22d3ee", // cyan-400
    "#60a5fa", // blue-400
    "#818cf8", // indigo-400
    "#c084fc", // purple-400
    "#f472b6", // pink-400
    "#2dd4bf", // teal-400
    "#a3e635", // lime-400
];

function hashProfileColor(name: string): string {
    let h = 0;
    for (let i = 0; i < name.length; i++) {
        h = (h * 31 + name.charCodeAt(i)) >>> 0;
    }
    return PROFILE_COLORS[h % PROFILE_COLORS.length];
}

/** Parse "[profileName] rest of message" → { profile, rest } | null */
function parseLogProfile(message: string): { profile: string; rest: string } | null {
    const m = message.match(/^\[([^\]]+)\](.*)$/);
    if (!m) return null;
    return { profile: m[1], rest: m[2] };
}

export function LogConsole() {
    const logs = useAppStore((s) => s.logs);
    const clearLogs = useAppStore((s) => s.clearLogs);
    const scrollRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef(true);

    // Auto-scroll xuống cuối khi có log mới — cuộn trực tiếp container, không cuộn trang
    useEffect(() => {
        if (!autoScrollRef.current) return;
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [logs]);

    return (
        <Card className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
                <span className="text-sm font-medium flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Log
                    <span className="text-xs font-normal text-muted-foreground">({logs.length})</span>
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearLogs} title="Xóa log">
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                <div ref={scrollRef} className="h-full overflow-y-auto px-4 pb-4 scrollbar-thin">
                    {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">Chưa có log...</p>
                    ) : (
                        <div className="font-mono text-[11px] space-y-0.5 pt-2">
                            {logs.map((line) => (
                                <div key={line.id} className={cn("flex items-start gap-2 leading-5 break-all")}>
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                            line.level === "error" && "bg-red-500",
                                            line.level === "success" && "bg-emerald-500",
                                            line.level === "info" && "bg-muted-foreground/30",
                                        )}
                                    />
                                    <span>
                                        <span className="text-muted-foreground/50 select-none mr-1.5">
                                            {new Date(line.timestamp).toLocaleTimeString("vi-VN", { hour12: false })}
                                        </span>
                                        <span
                                            className={cn(
                                                line.level === "error" && "text-red-400",
                                                line.level === "success" && "text-emerald-400",
                                                line.level === "info" && "text-muted-foreground",
                                            )}
                                        >
                                            {(() => {
                                                const parsed = parseLogProfile(line.message);
                                                if (!parsed) return line.message;
                                                const color = hashProfileColor(parsed.profile);
                                                return (
                                                    <>
                                                        <span style={{ color }} className="font-semibold">
                                                            [{parsed.profile}]
                                                        </span>
                                                        {parsed.rest}
                                                    </>
                                                );
                                            })()}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
