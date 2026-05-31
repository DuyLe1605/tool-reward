import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp } from "lucide-react";
import { PointsDetailDialog } from "@/components/PointsDetailDialog";
import { cn } from "@/lib/utils";

function useCountUp(target: number, duration = 700) {
    const [count, setCount] = useState(target);
    const prevRef = useRef(target);
    useEffect(() => {
        if (prevRef.current === target) return;
        const start = prevRef.current;
        const diff = target - start;
        const startTime = performance.now();
        const tick = (now: number) => {
            const elapsed = Math.min(now - startTime, duration);
            const t = elapsed / duration;
            const eased = 1 - Math.pow(1 - t, 3);
            const next = Math.round(start + diff * eased);
            setCount(next);
            if (elapsed < duration) {
                requestAnimationFrame(tick);
            } else {
                setCount(target);
                prevRef.current = target;
            }
        };
        requestAnimationFrame(tick);
    }, [target, duration]);
    return count;
}

const MEDALS = ["🥇", "🥈", "🥉"];

export function ProgressPanel() {
    const { data: status } = useQuery({ queryKey: ["status"], queryFn: api.getStatus, refetchInterval: 2000 });
    const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: api.getProfiles });
    const wsProgress = useAppStore((s) => s.progress);
    const allPoints = useAppStore((s) => s.points);
    const lastCheckedDate = useAppStore((s) => s.lastCheckedDate);
    const running = status?.running ?? false;
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

    const emailByName = Object.fromEntries((profiles ?? []).map((p) => [p.name, p.email]));

    const merged = { ...(status?.progress ?? {}), ...wsProgress };
    const runningEntries = Object.entries(merged);

    const pointEntries = Object.entries(allPoints).sort((a, b) => {
        const isDone = (d: string) => {
            if (!d) return true;
            const [n, t] = d.split("/").map(Number);
            return n >= t;
        };
        const aFull = isDone(a[1].desktop),
            bFull = isDone(b[1].desktop);
        if (aFull !== bFull) return aFull ? 1 : -1;
        return b[1].today - a[1].today;
    });

    const totalToday = pointEntries.reduce((s, [, pts]) => s + (pts.today ?? 0), 0);
    const animatedTotal = useCountUp(totalToday);

    if (!running && runningEntries.length === 0 && pointEntries.length === 0) return null;

    const dPct = (d: string) => {
        if (!d) return 0;
        const [n, t] = d.split("/").map(Number);
        return t > 0 ? Math.round((n / t) * 100) : 0;
    };
    const dFull = (d: string) => {
        if (!d) return false;
        const [n, t] = d.split("/").map(Number);
        return n >= t;
    };

    return (
        <>
            {(running || runningEntries.length > 0) && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Tiến độ
                            {running && (
                                <Badge
                                    variant="secondary"
                                    className="ml-auto text-[10px] border border-green-500/30 bg-green-500/10 text-green-400"
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse mr-1 inline-block" />
                                    Đang chạy
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                        {runningEntries.map(([name, prog]) => {
                            const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                            return (
                                <div key={name}>
                                    <div className="flex justify-between text-xs mb-1.5">
                                        <span className="font-medium truncate max-w-[60%]">{name}</span>
                                        <span className="font-mono text-muted-foreground">
                                            {prog.done}/{prog.total}{" "}
                                            <span
                                                className={cn(
                                                    "font-semibold",
                                                    pct >= 100 ? "text-emerald-400" : "text-primary",
                                                )}
                                            >
                                                {pct}%
                                            </span>
                                        </span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {pointEntries.length > 0 && (
                <Card className="overflow-hidden">
                    <CardHeader className="pb-0 px-4 pt-3">
                        <div className="flex items-center justify-between mb-2">
                            <CardTitle className="text-sm flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                Điểm thưởng
                            </CardTitle>
                            {lastCheckedDate && (
                                <span className="text-[10px] font-normal text-muted-foreground">{lastCheckedDate}</span>
                            )}
                        </div>
                        {/* Summary metric */}
                        <div className="bg-primary/8 border border-primary/15 rounded-xl px-3 py-2.5 mb-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Tổng hôm nay</span>
                            <span className="text-xl font-bold tabular-nums text-foreground">
                                🪙 {animatedTotal.toLocaleString()}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {pointEntries.map(([name, pts], idx) => {
                                const full = dFull(pts.desktop);
                                const pct = dPct(pts.desktop);
                                const medal = MEDALS[idx];
                                return (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedProfile(name)}
                                        className="w-full px-4 py-2.5 hover:bg-accent/40 transition-colors text-left group"
                                    >
                                        <div className="flex items-start gap-2 mb-1.5">
                                            {medal ? (
                                                <span className="text-base leading-none mt-0.5 shrink-0">{medal}</span>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground/50 font-mono w-4 mt-1 shrink-0 tabular-nums">
                                                    {idx + 1}
                                                </span>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                                    {name}
                                                </div>
                                                {emailByName[name] && (
                                                    <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                                                        {emailByName[name]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-base font-bold shrink-0 tabular-nums text-foreground pt-0.5">
                                                {(pts.today ?? 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 pl-6">
                                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-700 ${full ? "bg-emerald-500/70" : "bg-primary/60"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span
                                                className={`text-[10px] font-mono shrink-0 w-11 text-right ${full ? "text-emerald-500/80" : "text-primary/70"}`}
                                            >
                                                {pts.desktop || "0/90"}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {selectedProfile && allPoints[selectedProfile] && (
                <PointsDetailDialog
                    name={selectedProfile}
                    email={emailByName[selectedProfile]}
                    pts={allPoints[selectedProfile]}
                    onClose={() => setSelectedProfile(null)}
                />
            )}
        </>
    );
}
