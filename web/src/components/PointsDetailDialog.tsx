import { Button } from "@/components/ui/button";
import type { PointsSummary } from "@/store/useAppStore";
import { Monitor, Smartphone, Tag, X } from "lucide-react";

interface Props {
    name: string;
    email?: string;
    pts: PointsSummary;
    onClose: () => void;
}

export function PointsDetailDialog({ name, email, pts, onClose }: Props) {
    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-end sm:justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:w-85 max-h-[90vh] overflow-y-auto scrollbar-thin"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-2 px-5 pt-4 pb-3 sticky top-0 bg-card border-b border-border">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold">{name}</h2>
                        {email && <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>}
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent -mr-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-5 py-4 flex flex-col gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Today's points</p>
                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                            <span className="text-3xl">🪙</span>
                            <span className="text-4xl font-bold">{pts.today}</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border overflow-hidden text-sm">
                        <div className="bg-muted/60 px-4 py-2.5 flex justify-between text-xs text-muted-foreground font-medium">
                            <span>Today's activity</span>
                            <span>Points</span>
                        </div>
                        <div className="divide-y divide-border">
                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-sm shrink-0">
                                    <Monitor className="w-4 h-4 text-muted-foreground" />
                                    Desktop Bing search
                                </span>
                                {pts.desktop ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary/60 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(100, (parseInt(pts.desktop) / (parseInt(pts.desktop.split("/")[1]) || 1)) * 100)}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono">
                                            <span className="font-semibold">{pts.desktop.split("/")[0]}</span>
                                            <span className="text-muted-foreground">/{pts.desktop.split("/")[1]}</span>
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                )}
                            </div>
                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                                <span className="flex items-center gap-2 text-sm shrink-0">
                                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                                    Mobile Bing search
                                </span>
                                {pts.mobile ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-sky-500/60 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${Math.min(100, (parseInt(pts.mobile) / (parseInt(pts.mobile.split("/")[1]) || 1)) * 100)}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="text-xs font-mono">
                                            <span className="font-semibold">{pts.mobile.split("/")[0]}</span>
                                            <span className="text-muted-foreground">/{pts.mobile.split("/")[1]}</span>
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground text-sm">—</span>
                                )}
                            </div>
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm">
                                    <Tag className="w-4 h-4 text-muted-foreground" />
                                    Offers
                                </span>
                                <span className="font-semibold text-sm">{pts.offers ?? 0}</span>
                            </div>
                        </div>
                    </div>
                    {(pts.thisMonth > 0 || pts.thisYear > 0 || pts.lifetime > 0) && (
                        <div className="rounded-xl border border-border overflow-hidden text-sm">
                            <div className="bg-muted/60 px-4 py-2.5 flex justify-between text-xs text-muted-foreground font-medium">
                                <span>History</span>
                                <span>Points</span>
                            </div>
                            <div className="divide-y divide-border">
                                {pts.thisMonth > 0 && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span>This month</span>
                                        <span className="font-mono font-medium">{pts.thisMonth.toLocaleString()}</span>
                                    </div>
                                )}
                                {pts.thisYear > 0 && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span>This year</span>
                                        <span className="font-mono font-medium">{pts.thisYear.toLocaleString()}</span>
                                    </div>
                                )}
                                {pts.lifetime > 0 && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span>Lifetime</span>
                                        <span className="font-mono font-medium">{pts.lifetime.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-5 pb-5">
                    <Button className="w-full" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}
