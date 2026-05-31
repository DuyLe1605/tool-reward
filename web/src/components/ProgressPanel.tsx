import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function ProgressPanel() {
    const { data: status } = useQuery({ queryKey: ["status"], queryFn: api.getStatus, refetchInterval: 2000 });
    const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: api.getProfiles });
    const wsProgress = useAppStore((s) => s.progress);
    const allPoints = useAppStore((s) => s.points);
    const lastCheckedDate = useAppStore((s) => s.lastCheckedDate);
    const running = status?.running ?? false;
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

    const nameByEmail = Object.fromEntries((profiles ?? []).map((p) => [p.email, p.name]));

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
                                    <div className="flex items-center gap-2.5">
                                        <div
                                            className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex"
                                            style={{ gap: "1px" }}
                                        >
                                            {/* Segment Desktop */}
                                            <div
                                                className="h-full relative overflow-hidden"
                                                style={{ width: hasBoth ? `${dSlotPct}%` : "100%" }}
                                                title={`Desktop: ${prog.desktopDone ?? 0}/${prog.desktopTotal ?? 0}`}
                                            >
                                                <motion.div
                                                    className="absolute inset-y-0 left-0 bg-sky-500"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${dFillPct}%` }}
                                                    transition={{ type: "spring", stiffness: 60, damping: 18 }}
                                                />
                                            </div>
                                            {/* Segment Mobile */}
                                            {hasBoth && (
                                                <div
                                                    className="h-full relative overflow-hidden flex-1"
                                                    title={`Mobile: ${prog.mobileDone ?? 0}/${prog.mobileTotal ?? 0}`}
                                                >
                                                    <motion.div
                                                        className="absolute inset-y-0 left-0 bg-violet-500"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${mFillPct}%` }}
                                                        transition={{ type: "spring", stiffness: 60, damping: 18 }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-mono tabular-nums shrink-0">
                                            <span
                                                className={cn(
                                                    dFillPct >= 100 ? "text-emerald-400/70" : "text-sky-400/60",
                                                )}
                                            >
                                                {prog.desktopDone ?? 0}/{prog.desktopTotal ?? 0}
                                            </span>
                                            {hasBoth && (
                                                <>
                                                    <span className="mx-1 text-muted-foreground/20">·</span>
                                                    <span
                                                        className={cn(
                                                            mFillPct >= 100
                                                                ? "text-fuchsia-400/70"
                                                                : "text-violet-400/60",
                                                        )}
                                                    >
                                                        {prog.mobileDone ?? 0}/{prog.mobileTotal ?? 0}
                                                    </span>
                                                </>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {pointEntries.length > 0 && (
                <Card className="overflow-hidden">
                    {/* Header: title + summary stats */}
                    <motion.div
                        className="px-4 pt-4 pb-3 border-b border-border"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                                <TrendingUp className="w-3.5 h-3.5" />
                                Điểm thưởng
                            </span>
                            {lastCheckedDate && <span className="text-[10px] text-sky-400/70">{lastCheckedDate}</span>}
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <div className="text-[10px] text-muted-foreground/80 mb-0.5">Điểm hôm nay</div>
                                <div className="text-2xl font-bold tabular-nums text-foreground">
                                    +{animatedTotal.toLocaleString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] text-muted-foreground/80 mb-0.5">Tổng điểm khả dụng</div>
                                <div className="text-2xl font-bold tabular-nums text-muted-foreground/80">
                                    {pointEntries.reduce((s, [, p]) => s + (p.available ?? 0), 0).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                    <CardContent className="p-0">
                        <ScrollArea className="max-h-[60vh]">
                            <div className="divide-y divide-border/50">
                                <AnimatePresence initial={true}>
                                    {pointEntries.map(([email, pts], idx) => {
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
                                            <motion.button
                                                key={email}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -6 }}
                                                transition={{
                                                    duration: 0.35,
                                                    delay: idx * 0.05,
                                                    ease: [0.22, 1, 0.36, 1],
                                                }}
                                                onClick={() => setSelectedProfile(email)}
                                                className="w-full px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
                                            >
                                                {/* Row 1: name | available */}
                                                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                                                    <span className="text-sm font-semibold truncate text-foreground">
                                                        {nameByEmail[email] ?? email}
                                                    </span>
                                                    <span className="text-base font-bold tabular-nums shrink-0 text-foreground">
                                                        {avail.toLocaleString()}
                                                    </span>
                                                </div>
                                                {/* Row 2: email | today */}
                                                <div className="flex items-baseline justify-between gap-2 mb-2">
                                                    <span className="text-[10px] text-muted-foreground/80 truncate">
                                                        {email}
                                                    </span>
                                                    <span className="text-xs font-semibold tabular-nums text-emerald-400/80 shrink-0">
                                                        +{(pts.today ?? 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                {/* Row 3: bar | counts */}
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex-1 h-[3px] bg-muted/40 overflow-hidden flex">
                                                        <div
                                                            className="h-full relative overflow-hidden"
                                                            style={{ width: hasMobile ? `${dSlot}%` : "100%" }}
                                                        >
                                                            <motion.div
                                                                className={cn(
                                                                    "absolute inset-y-0 left-0 h-full",
                                                                    dDone ? "bg-emerald-500" : "bg-sky-500",
                                                                )}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${dFill}%` }}
                                                                transition={{
                                                                    type: "spring",
                                                                    stiffness: 50,
                                                                    damping: 16,
                                                                    delay: idx * 0.04,
                                                                }}
                                                            />
                                                        </div>
                                                        {hasMobile && (
                                                            <div className="h-full relative overflow-hidden flex-1">
                                                                <motion.div
                                                                    className={cn(
                                                                        "absolute inset-y-0 left-0 h-full",
                                                                        mDone ? "bg-fuchsia-500" : "bg-violet-500",
                                                                    )}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${mFill}%` }}
                                                                    transition={{
                                                                        type: "spring",
                                                                        stiffness: 50,
                                                                        damping: 16,
                                                                        delay: idx * 0.04 + 0.08,
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] font-mono tabular-nums shrink-0">
                                                        <span
                                                            className={
                                                                dDone ? "text-emerald-400/70" : "text-sky-400/60"
                                                            }
                                                        >
                                                            {pts.desktop || "0/90"}
                                                        </span>
                                                        {hasMobile && (
                                                            <>
                                                                <span className="mx-1 text-muted-foreground/20">·</span>
                                                                <span
                                                                    className={
                                                                        mDone
                                                                            ? "text-fuchsia-400/70"
                                                                            : "text-violet-400/60"
                                                                    }
                                                                >
                                                                    {pts.mobile}
                                                                </span>
                                                            </>
                                                        )}
                                                    </span>
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </AnimatePresence>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {selectedProfile && allPoints[selectedProfile] && (
                <PointsDetailDialog
                    name={nameByEmail[selectedProfile] ?? selectedProfile}
                    email={selectedProfile}
                    pts={allPoints[selectedProfile]}
                    onClose={() => setSelectedProfile(null)}
                />
            )}
        </>
    );
}
