import { cn } from "@/lib/utils";
import { Moon, Sun, Power, BookOpen, House, KeyRound } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { api, type LicenseStatusResponse } from "@/api";
import { useQuery } from "@tanstack/react-query";
import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import { LicenseModal } from "./LicenseModal";
import {
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export function Header() {
    const theme = useAppStore((s) => s.theme);
    const setTheme = useAppStore((s) => s.setTheme);
    const [exiting, setExiting] = useState(false);
    const [version, setVersion] = useState("9.0.7");
    const [licenseOpen, setLicenseOpen] = useState(false);

    const { data: licenseData } = useQuery<LicenseStatusResponse>({
        queryKey: ["license"],
        queryFn: api.getLicense,
        refetchInterval: 30000, // Cập nhật lại mỗi 30s
    });

    const isLicValid = licenseData?.license?.valid === true;

    useEffect(() => {
        fetch("/api/status")
            .then((r) => r.json())
            .then((data) => {
                if (data.version) setVersion(data.version);
            })
            .catch(() => {});
    }, []);

    const handleExit = async () => {
        setExiting(true);
        try {
            await api.shutdown();
        } catch {
            // Server đã tắt, fetch thất bại là bình thường
        }
        window.close();
    };

    return (
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md shadow-primary/25">
                    R
                </div>
                <div>
                    <h1 className="font-semibold text-sm text-foreground">Bing Rewards Auto Search</h1>
                    <p className="text-xs text-muted-foreground">v{version} · Multi-Profile</p>
                </div>
            </div>
            <div className="flex items-center gap-2.5">
                {/* Nút Bản quyền */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLicenseOpen(true)}
                    className={cn(
                        "h-8 px-2.5 text-xs font-medium gap-1.5 border transition-all cursor-pointer",
                        isLicValid
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20 animate-pulse"
                    )}
                    title="Bản quyền & Lượt chạy"
                >
                    <KeyRound className="w-3.5 h-3.5" />
                    {isLicValid ? (
                        <span>Còn {licenseData?.license?.remaining_runs ?? 0} runs</span>
                    ) : (
                        <span>Kích hoạt Key</span>
                    )}
                </Button>

                <div className="w-px h-5 bg-border" />

                <NavLink
                    to="/"
                    end
                    className={({ isActive }: NavLinkRenderProps) =>
                        cn(
                            "inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors",
                            isActive ? "text-primary bg-primary/10" : "text-muted-foreground",
                        )
                    }
                    title="Trang chính"
                >
                    <House className="w-4 h-4" />
                </NavLink>
                <NavLink
                    to="/guide"
                    className={({ isActive }: NavLinkRenderProps) =>
                        cn(
                            "inline-flex items-center justify-center rounded-md h-8 w-8 hover:bg-accent hover:text-accent-foreground transition-colors",
                            isActive ? "text-primary bg-primary/10" : "text-muted-foreground",
                        )
                    }
                    title="Hướng dẫn sử dụng"
                >
                    <BookOpen className="w-4 h-4" />
                </NavLink>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
                >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <div className="w-px h-5 bg-border" />
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                            title="Thoát ứng dụng"
                            disabled={exiting}
                        >
                            <Power className="w-4 h-4" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Thoát ứng dụng?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Server sẽ dừng hoàn toàn. Nếu có task đang chạy, nó sẽ bị huỷ ngay lập tức.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Huỷ</AlertDialogCancel>
                            <AlertDialogAction onClick={handleExit} disabled={exiting}>
                                {exiting ? "Đang thoát..." : "Thoát"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Dialog quản lý bản quyền */}
                <LicenseModal open={licenseOpen} onClose={() => setLicenseOpen(false)} />
            </div>
        </header>
    );
}
