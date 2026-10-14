import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type LicenseStatusResponse } from "@/api";
import {
    KeyRound,
    Copy,
    Check,
    CheckCircle2,
    Laptop,
    Users,
    Activity,
    Calendar,
    Sparkles,
    ShieldAlert,
    RefreshCw,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LicenseModalProps {
    open: boolean;
    onClose: () => void;
}

export function LicenseModal({ open, onClose }: LicenseModalProps) {
    const queryClient = useQueryClient();
    const [keyInput, setKeyInput] = useState("");
    const [copiedHwid, setCopiedHwid] = useState(false);
    const [mounted, setMounted] = useState(false);

    // Đảm bảo portal chỉ mount ở client (tránh SSR issues)
    useEffect(() => {
        setMounted(true);
    }, []);

    // ESC để đóng
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    const { data: licenseData, isLoading } = useQuery<LicenseStatusResponse>({
        queryKey: ["license"],
        queryFn: api.getLicense,
        enabled: open,
    });

    const activateMutation = useMutation({
        mutationFn: (key: string) => api.activateLicense(key),
        onSuccess: () => {
            toast.success("Kích hoạt bản quyền thành công!");
            setKeyInput("");
            queryClient.invalidateQueries({ queryKey: ["license"] });
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.error || err?.message || "Kích hoạt thất bại";
            toast.error(msg);
        },
    });

    const handleCopyHwid = () => {
        if (!licenseData?.machineId) return;
        navigator.clipboard.writeText(licenseData.machineId);
        setCopiedHwid(true);
        toast.info("Đã copy Mã máy (HWID) vào bộ nhớ tạm");
        setTimeout(() => setCopiedHwid(false), 2000);
    };

    const handleActivate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyInput.trim()) {
            toast.warning("Vui lòng nhập mã key!");
            return;
        }
        activateMutation.mutate(keyInput.trim());
    };

    const lic = licenseData?.license;
    const isValid = lic?.valid === true;

    const UNLIMITED = 999999;
    const totalRuns = lic?.total_runs ?? 0;
    const usedRuns = lic?.used_runs ?? 0;
    const remainingRuns = lic?.remaining_runs ?? 0;
    const isRunsUnlimited = totalRuns >= UNLIMITED;
    const usagePercent =
        isRunsUnlimited || totalRuns === 0
            ? 0
            : Math.min(100, Math.round((usedRuns / totalRuns) * 100));

    // Không render gì nếu chưa mount hoặc đóng
    if (!mounted || !open) return null;

    const modalContent = (
        // Backdrop: portal thẳng vào body, thoát hoàn toàn khỏi mọi stacking context
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
            onMouseDown={(e) => {
                // Click ra ngoài để đóng
                if (e.target === e.currentTarget) onClose();
            }}
        >
            {/* Modal card */}
            <div
                className="relative w-full max-w-lg rounded-xl border border-border bg-card text-card-foreground shadow-2xl overflow-hidden animate-slide-up"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold">Quản lý Bản quyền</h2>
                            <p className="text-xs text-muted-foreground">Kích hoạt và theo dõi lượt sử dụng</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="p-5 space-y-4 max-h-[calc(100vh-160px)] overflow-y-auto scrollbar-thin">

                    {/* Trạng thái bản quyền */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang kiểm tra bản quyền...
                        </div>
                    ) : isValid ? (
                        <div className="p-4 space-y-3 border rounded-xl bg-emerald-500/5 border-emerald-500/20">
                            {/* Dòng trạng thái */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="font-semibold text-sm">Bản quyền đang hoạt động</span>
                                </div>
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                                    {lic?.customer_name ? `Khách: ${lic.customer_name}` : "VIP Active"}
                                </span>
                            </div>

                            {/* Mã Key */}
                            <div className="flex items-center justify-between p-2 rounded-lg bg-background/70 border border-border/50">
                                <div>
                                    <span className="text-[10px] text-muted-foreground block">Mã Key đang dùng:</span>
                                    <span className="font-mono font-bold text-xs text-foreground tracking-wider">
                                        {lic?.key_code}
                                    </span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (lic?.key_code) {
                                            navigator.clipboard.writeText(lic.key_code);
                                            toast.info("Đã chép mã Key vào bộ nhớ tạm");
                                        }
                                    }}
                                    className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                    <Copy className="w-3 h-3" /> Chép
                                </button>
                            </div>

                            {/* Quota 3 cột */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="p-2 rounded-lg bg-background/70 border border-border/50 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-[10px]">
                                        <Users className="w-3 h-3 text-primary" />
                                        <span>Max Profile</span>
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {(lic?.max_profiles ?? 0) >= UNLIMITED ? "∞" : `${lic?.max_profiles ?? 5}`} nick
                                    </div>
                                </div>

                                <div className="p-2 rounded-lg bg-background/70 border border-border/50 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-[10px]">
                                        <Activity className="w-3 h-3 text-primary" />
                                        <span>Quota Còn</span>
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {isRunsUnlimited ? "∞" : `${remainingRuns} / ${totalRuns}`}
                                    </div>
                                </div>

                                <div className="p-2 rounded-lg bg-background/70 border border-border/50 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-[10px]">
                                        <Laptop className="w-3 h-3 text-primary" />
                                        <span>Thiết bị</span>
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {(lic?.max_activations ?? 0) >= UNLIMITED
                                            ? `${lic?.activations_count ?? 1} / ∞`
                                            : `${lic?.activations_count ?? 1} / ${lic?.max_activations ?? 1}`} máy
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            {!isRunsUnlimited && (
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                        <span>Đã dùng: {usedRuns} runs ({usagePercent}%)</span>
                                        <span>Còn lại: {remainingRuns} runs</span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 rounded-full ${
                                                usagePercent > 85 ? "bg-destructive" : "bg-emerald-500"
                                            }`}
                                            style={{ width: `${usagePercent}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Hạn dùng */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    Hạn dùng:
                                </span>
                                <strong className="text-foreground">
                                    {lic?.expires_at
                                        ? new Date(lic.expires_at).toLocaleDateString("vi-VN")
                                        : "Vĩnh viễn"}
                                </strong>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2 border rounded-xl bg-destructive/10 border-destructive/20">
                            <div className="flex items-center gap-2 text-destructive">
                                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                                <span className="font-semibold text-sm">Chưa có bản quyền hợp lệ</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {lic?.error || "Vui lòng nhập Key được cấp bởi Admin để kích hoạt tool."}
                            </p>
                        </div>
                    )}

                    {/* HWID */}
                    <div className="p-3 border rounded-xl bg-muted/30 border-border/60 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Laptop className="w-3.5 h-3.5" />
                                Mã máy tính của bạn (HWID):
                            </span>
                            <button
                                onClick={handleCopyHwid}
                                className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                {copiedHwid ? (
                                    <>
                                        <Check className="w-3 h-3 text-emerald-500" /> Đã chép
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3" /> Sao chép
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="px-2.5 py-2 font-mono text-xs select-all rounded-lg bg-background border border-border/60 text-muted-foreground break-all leading-relaxed">
                            {licenseData?.machineId || "Đang lấy..."}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            * Gửi mã này cho Admin nếu cần hỗ trợ gán máy hoặc cấp bản quyền.
                        </p>
                    </div>

                    {/* Form nhập Key */}
                    <form onSubmit={handleActivate} className="space-y-2">
                        <label className="block text-xs font-medium text-foreground">
                            {isValid ? "Thay thế bằng Key mới:" : "Nhập mã Key bản quyền:"}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="VD: REW-VIP-8F2A-9K10"
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                                className="flex-1 px-3 py-2 text-xs font-mono uppercase border rounded-lg bg-background border-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                                disabled={activateMutation.isPending}
                                autoFocus={!isValid}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={activateMutation.isPending || !keyInput.trim()}
                                className="gap-1.5 text-xs font-semibold shrink-0"
                            >
                                {activateMutation.isPending ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                )}
                                Kích hoạt
                            </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            ⚠️{" "}
                            <em>Lưu ý: Khi kích hoạt key mới, key cũ trên máy này sẽ tự động bị thay thế.</em>
                        </p>
                    </form>
                </div>

                {/* ── Footer ── */}
                <div className="flex justify-end px-5 py-3 border-t border-border bg-muted/20">
                    <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );

    // Portal ra ngoài body, thoát khỏi stacking context của Header
    return createPortal(modalContent, document.body);
}
