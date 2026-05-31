import { Button } from "@/components/ui/button";
import type { PointsSummary } from "@/store/useAppStore";
import { Monitor, Smartphone, Tag, X, Coins, Trophy } from "lucide-react";

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
                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-4 pb-3 sticky top-0 bg-card border-b border-border">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold leading-snug">{name}</h2>
                        {email && <p className="text-[11px] text-muted-foreground truncate">{email}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors -mr-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3">
                    {/* Today + Available — compact stat row */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/40 border border-border rounded-xl p-3">
                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Hôm nay</p>
                            <div className="flex items-baseline gap-1.5">
                                <Coins className="w-4 h-4 text-yellow-400 shrink-0 self-center" />
                                <span className="text-xl font-bold tabular-nums">+{pts.today}</span>
                            </div>
                        </div>
                        <div className="bg-amber-500/6 border border-amber-500/20 rounded-xl p-3">
                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wide">Khả dụng</p>
                            <div className="flex items-baseline gap-1.5">
                                <Trophy className="w-4 h-4 text-amber-400 shrink-0 self-center" />
                                <span className="text-xl font-bold tabular-nums text-amber-400">
                                    {(pts.available ?? 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Search activity */}
                    <div className="rounded-xl border border-border overflow-hidden">
                        <div className="bg-muted/50 px-4 py-2 flex justify-between text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                            <span>Tìm kiếm hôm nay</span>
                            <span>Tiến độ</span>
                        </div>
                        <div className="divide-y divide-border">
                            {/* Desktop */}
                            <div className="px-4 py-2.5 flex items-center gap-3">
                                <Monitor className="w-3.5 h-3.5 text-sky-400/80 shrink-0" />
                                <span className="text-sm flex-1 text-foreground/80">Desktop</span>
                                {pts.desktop ? (
                                    (() => {
                                        const [n, t] = pts.desktop.split("/").map(Number);
                                        const full = n >= t;
                                        return (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${full ? "bg-emerald-500/70" : "bg-sky-500/60"}`}
                                                        style={{ width: `${t > 0 ? (n / t) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <span
                                                    className={`text-xs font-mono ${full ? "text-emerald-400" : "text-sky-400/80"}`}
                                                >
                                                    {n}
                                                    <span className="text-muted-foreground/50">/{t}</span>
                                                </span>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <span className="text-muted-foreground/50 text-sm">—</span>
                                )}
                            </div>
                            {/* Mobile */}
                            <div className="px-4 py-2.5 flex items-center gap-3">
                                <Smartphone className="w-3.5 h-3.5 text-violet-400/80 shrink-0" />
                                <span className="text-sm flex-1 text-foreground/80">Mobile</span>
                                {pts.mobile ? (
                                    (() => {
                                        const [n, t] = pts.mobile.split("/").map(Number);
                                        const full = n >= t;
                                        return (
                                            <div className="flex items-center gap-2 shrink-0">
                                                <div className="w-14 h-1 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${full ? "bg-emerald-500/70" : "bg-violet-500/60"}`}
                                                        style={{ width: `${t > 0 ? (n / t) * 100 : 0}%` }}
                                                    />
                                                </div>
                                                <span
                                                    className={`text-xs font-mono ${full ? "text-emerald-400" : "text-violet-400/80"}`}
                                                >
                                                    {n}
                                                    <span className="text-muted-foreground/50">/{t}</span>
                                                </span>
                                            </div>
                                        );
                                    })()
                                ) : (
                                    <span className="text-muted-foreground/50 text-sm">—</span>
                                )}
                            </div>
                            {/* Offers */}
                            <div className="px-4 py-2.5 flex items-center gap-3">
                                <Tag className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                                <span className="text-sm flex-1 text-foreground/80">Offers</span>
                                <span className="text-sm font-semibold tabular-nums">{pts.offers ?? 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* History */}
                    {(pts.thisMonth > 0 || pts.thisYear > 0 || pts.lifetime > 0) && (
                        <div className="rounded-xl border border-border overflow-hidden">
                            <div className="bg-muted/50 px-4 py-2 flex justify-between text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                                <span>Lịch sử</span>
                                <span>Điểm</span>
                            </div>
                            <div className="divide-y divide-border text-sm">
                                {pts.thisMonth > 0 && (
                                    <div className="px-4 py-2.5 flex justify-between">
                                        <span className="text-foreground/80">Tháng này</span>
                                        <span className="font-mono font-medium tabular-nums">
                                            {pts.thisMonth.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {pts.thisYear > 0 && (
                                    <div className="px-4 py-2.5 flex justify-between">
                                        <span className="text-foreground/80">Năm nay</span>
                                        <span className="font-mono font-medium tabular-nums">
                                            {pts.thisYear.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {pts.lifetime > 0 && (
                                    <div className="px-4 py-2.5 flex justify-between">
                                        <span className="text-foreground/80">Tổng cộng</span>
                                        <span className="font-mono font-medium tabular-nums">
                                            {pts.lifetime.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-5 pb-5">
                    <Button variant="outline" className="w-full" onClick={onClose}>
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
}
