import React, { useState } from "react";
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

    const {
        data: licenseData,
        isLoading,
    } = useQuery<LicenseStatusResponse>({
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

    if (!open) return null;

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

    // Tính phần trăm lượt dùng
    const totalRuns = lic?.total_runs ?? 0;
    const usedRuns = lic?.used_runs ?? 0;
    const remainingRuns = lic?.remaining_runs ?? 0;
    const usagePercent = totalRuns > 0 ? Math.min(100, Math.round((usedRuns / totalRuns) * 100)) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-200">
            <div className="relative w-full max-w-lg overflow-hidden border rounded-xl bg-card text-card-foreground shadow-2xl border-border animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <KeyRound className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold">Quản lý Bản quyền</h2>
                            <p className="text-xs text-muted-foreground">Kích hoạt và theo dõi lượt sử dụng</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-full"
                        onClick={onClose}
                    >
                        ✕
                    </Button>
                </div>

                <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
                    {/* Trạng thái hiện tại */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Đang kiểm tra bản quyền...
                        </div>
                    ) : isValid ? (
                        <div className="p-4 space-y-3.5 border rounded-lg bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    <span className="font-semibold text-sm">Bản quyền đang hoạt động</span>
                                </div>
                                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 border border-emerald-500/30">
                                    {lic?.customer_name ? `Khách: ${lic.customer_name}` : "VIP Active"}
                                </span>
                            </div>

                            {/* Mã Key đang dùng */}
                            <div className="p-2.5 rounded-md bg-background/60 border border-border/50 flex items-center justify-between">
                                <div>
                                    <span className="text-[11px] text-muted-foreground block">Mã Key đang sử dụng:</span>
                                    <span className="font-mono font-bold text-xs text-foreground tracking-wider">{lic?.key_code}</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs"
                                    onClick={() => {
                                        if (lic?.key_code) {
                                            navigator.clipboard.writeText(lic.key_code);
                                            toast.info("Đã chép mã Key vào bộ nhớ tạm");
                                        }
                                    }}
                                >
                                    <Copy className="w-3.5 h-3.5 mr-1" /> Chép Key
                                </Button>
                            </div>

                            {/* Thông số Quota & Thiết bị */}
                            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                                <div className="p-2 rounded-md bg-background/60 border border-border/50 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-[11px]">
                                        <Users className="w-3 h-3 text-primary" />
                                        <span>Max Profile</span>
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {lic?.max_profiles ?? 5} nick
                                    </div>
                                </div>

                                <div className="p-2 rounded-md bg-background/60 border border-border/50 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-[11px]">
                                        <Activity className="w-3 h-3 text-primary" />
                                        <span>Quota Còn</span>
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {remainingRuns} / {totalRuns}
                                    </div>
                                </div>

                                <div className="p-2 rounded-md bg-background/60 border border-border/50 text-center">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1 text-[11px]">
                                        <Laptop className="w-3 h-3 text-primary" />
                                        <span>Thiết bị</span>
                                    </div>
                                    <div className="text-xs font-bold text-foreground">
                                        {lic?.activations_count ?? 1} / {lic?.max_activations ?? 1} máy
                                    </div>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                    <span>Đã dùng: {usedRuns} runs ({usagePercent}%)</span>
                                    <span>Còn lại: {remainingRuns} runs</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ${
                                            usagePercent > 85 ? "bg-destructive" : "bg-emerald-500"
                                        }`}
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Hạn dùng */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                                <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    <span>Hạn dùng:</span>
                                </span>
                                <strong className="text-foreground">
                                    {lic?.expires_at ? new Date(lic.expires_at).toLocaleDateString("vi-VN") : "Vĩnh viễn"}
                                </strong>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2 border rounded-lg bg-destructive/10 border-destructive/20 text-destructive">
                            <div className="flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                                <span className="font-semibold text-sm">Chưa có bản quyền hợp lệ</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {lic?.error || "Vui lòng nhập Key được cấp bởi Admin để kích hoạt tool."}
                            </p>
                        </div>
                    )}

                    {/* Mã máy (Hardware ID) */}
                    <div className="p-3 border rounded-lg bg-muted/30 border-border/70 space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Laptop className="w-3.5 h-3.5" /> Mã máy tính của bạn (HWID):
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={handleCopyHwid}
                            >
                                {copiedHwid ? (
                                    <>
                                        <Check className="w-3 h-3 mr-1 text-emerald-500" /> Đã chép
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3 h-3 mr-1" /> Sao chép
                                    </>
                                )}
                            </Button>
                        </div>
                        <div className="p-2 font-mono text-xs select-all rounded bg-background border border-border/60 text-muted-foreground break-all">
                            {licenseData?.machineId || "Đang lấy..."}
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            * Gửi mã này cho Admin nếu cần hỗ trợ gán máy hoặc cấp bản quyền.
                        </p>
                    </div>

                    {/* Form nhập Key */}
                    <form onSubmit={handleActivate} className="space-y-3 pt-1">
                        <label className="block text-xs font-medium text-foreground">
                            {isValid ? "Thay thế bằng Key mới:" : "Nhập mã Key bản quyền:"}
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="VD: REW-VIP-8F2A-9K10"
                                value={keyInput}
                                onChange={(e) => setKeyInput(e.target.value.toUpperCase())}
                                className="flex-1 px-3 py-2 text-xs font-mono uppercase border rounded-md bg-background border-input focus:outline-none focus:ring-1 focus:ring-ring"
                                disabled={activateMutation.isPending}
                            />
                            <Button
                                type="submit"
                                size="sm"
                                disabled={activateMutation.isPending || !keyInput.trim()}
                                className="gap-1.5 text-xs font-semibold"
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
                            ⚠️ <em>Lưu ý: Khi kích hoạt key mới, key cũ trên máy này sẽ tự động bị thay thế.</em>
                        </p>
                    </form>
                </div>

                <div className="flex justify-end px-6 py-3 border-t border-border bg-muted/20">
                    <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                        Đóng
                    </Button>
                </div>
            </div>
        </div>
    );
}
