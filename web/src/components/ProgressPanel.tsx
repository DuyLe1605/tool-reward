import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp, Coins, Wallet } from "lucide-react";
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
                    <CardContent className="space-y-3">
                        {runningEntries.map(([name, prog]) => {
                            const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                            const hasBoth = (prog.desktopTotal ?? 0) > 0 && (prog.mobileTotal ?? 0) > 0;
                            const dSlotPct = prog.total > 0 ? ((prog.desktopTotal ?? 0) / prog.total) * 100 : 50;
                            const dFillPct =
                                (prog.desktopTotal ?? 0) > 0 ? ((prog.desktopDone ?? 0) / prog.desktopTotal) * 100 : 0;
                            const mFillPct =
                                (prog.mobileTotal ?? 0) > 0 ? ((prog.mobileDone ?? 0) / prog.mobileTotal) * 100 : 0;
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
                                    {hasBoth ? (
                                        <>
                                            <div
                                                className="h-2 w-full rounded-full bg-muted overflow-hidden flex"
                                                style={{ gap: "1px" }}
                                            >
                                                {/* Segment Desktop */}
                                                <div
                                                    className="h-full relative overflow-hidden"
                                                    style={{ width: `${dSlotPct}%` }}
                                                    title={`Desktop: ${prog.desktopDone ?? 0}/${prog.desktopTotal ?? 0}`}
                                                >
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-sky-500 transition-all duration-500"
                                                        style={{ width: `${dFillPct}%` }}
                                                    />
                                                </div>
                                                {/* Segment Mobile */}
                                                <div
                                                    className="h-full relative overflow-hidden flex-1"
                                                    title={`Mobile: ${prog.mobileDone ?? 0}/${prog.mobileTotal ?? 0}`}
                                                >
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-violet-500 transition-all duration-500"
                                                        style={{ width: `${mFillPct}%` }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <span className="inline-block w-2 h-1.5 rounded-sm bg-sky-500/70" />
                                                    🖥 {prog.desktopDone ?? 0}/{prog.desktopTotal ?? 0}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    📱 {prog.mobileDone ?? 0}/{prog.mobileTotal ?? 0}
                                                    <span className="inline-block w-2 h-1.5 rounded-sm bg-violet-500/70" />
                                                </span>
                                            </div>
                                        </>
                                    ) : (
                                        <Progress value={pct} className="h-2" />
                                    )}
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
                        {/* Summary: today + total available */}
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-primary/8 border border-primary/15 rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">Hôm nay</span>
                                <span className="text-xl font-bold tabular-nums text-foreground flex items-center gap-1.5">
                                    <Coins className="w-4 h-4 text-yellow-400 shrink-0" />
                                    {animatedTotal.toLocaleString()}
                                </span>
                            </div>
                            <div className="bg-muted/40 border border-border rounded-xl px-3 py-2.5 flex flex-col gap-0.5">
                                <span className="text-[10px] text-muted-foreground">Khả dụng</span>
                                <span className="text-xl font-bold tabular-nums text-foreground flex items-center gap-1.5">
                                    <Wallet className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                                    {pointEntries.reduce((s, [, p]) => s + (p.available ?? 0), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {pointEntries.map(([name, pts]) => {
                                const hasMobile = !!(pts.mobile && pts.mobile !== "0/0");
                                const dParts = (pts.desktop ?? "0/90").split("/").map(Number);
                                const mParts = hasMobile ? pts.mobile!.split("/").map(Number) : [0, 0];
                                const dTotal = dParts[1] || 90;
                                const mTotal = mParts[1] || 0;
                                const combined = dTotal + mTotal;
                                const dSlot = combined > 0 ? (dTotal / combined) * 100 : 100;
                                const dFill = dTotal > 0 ? (dParts[0] / dTotal) * 100 : 0;
                                const mFill = mTotal > 0 ? (mParts[0] / mTotal) * 100 : 0;
                                const dDone = dParts[0] >= dTotal;
                                const mDone = hasMobile && mParts[0] >= mTotal;
                                const avail = pts.available ?? 0;
                                return (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedProfile(name)}
                                        className="w-full px-4 py-3 hover:bg-accent/40 transition-colors text-left group"
                                    >
                                        {/* Row 1: name/email + available */}
                                        <div className="flex items-start gap-3 mb-2.5">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-semibold truncate leading-snug group-hover:text-primary transition-colors">
                                                    {name}
                                                </div>
                                                {emailByName[name] && (
                                                    <div className="text-[10px] text-muted-foreground/50 truncate leading-tight mt-0.5">
                                                        {emailByName[name]}
                                                    </div>
                                                )}
                                            </div>
                                            <span
                                                className={`text-base font-bold tabular-nums shrink-0 leading-snug ${avail > 0 ? "text-foreground" : "text-muted-foreground/25"}`}
                                            >
                                                {avail.toLocaleString()}
                                            </span>
                                        </div>
                                        {/* Row 2: progress bar — 2px tall, no gap between segments */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="flex-1 h-[3px] bg-muted/60 rounded-full overflow-hidden flex">
                                                <div
                                                    className="h-full relative overflow-hidden"
                                                    style={{ width: hasMobile ? `${dSlot}%` : "100%" }}
                                                >
                                                    <div
                                                        className={`absolute inset-y-0 left-0 h-full transition-all duration-700 ${dDone ? "bg-emerald-500" : "bg-sky-500"}`}
                                                        style={{ width: `${dFill}%` }}
                                                    />
                                                </div>
                                                {hasMobile && (
                                                    <div className="h-full relative overflow-hidden flex-1">
                                                        <div
                                                            className={`absolute inset-y-0 left-0 h-full transition-all duration-700 ${mDone ? "bg-fuchsia-500" : "bg-violet-500"}`}
                                                            style={{ width: `${mFill}%` }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-[10px] font-mono shrink-0 tabular-nums">
                                                <span className={dDone ? "text-emerald-400/80" : "text-sky-400/70"}>
                                                    {pts.desktop || "0/90"}
                                                </span>
                                                {hasMobile && (
                                                    <>
                                                        <span className="mx-1 text-muted-foreground/20">·</span>
                                                        <span
                                                            className={
                                                                mDone ? "text-fuchsia-400/80" : "text-violet-400/70"
                                                            }
                                                        >
                                                            {pts.mobile}
                                                        </span>
                                                    </>
                                                )}
                                            </span>
                                        </div>
                                        {/* Row 3: today */}
                                        <div className="flex items-baseline justify-between gap-2">
                                            <span className="text-xs text-muted-foreground/70">Hôm nay</span>
                                            <span className="text-sm font-semibold tabular-nums text-foreground">
                                                +{(pts.today ?? 0).toLocaleString()}
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
