import { cn } from "@/lib/utils";
import { Moon, Sun, Power, BookOpen, House } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { api } from "@/api";
import { NavLink } from "react-router-dom";
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
                    <p className="text-xs text-muted-foreground">v9.0 · Multi-Profile</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <NavLink to="/" end>
                    {({ isActive }) => (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", isActive && "text-primary bg-primary/10")}
                            title="Trang chính"
                        >
                            <House className="w-4 h-4" />
                        </Button>
                    )}
                </NavLink>
                <NavLink to="/guide">
                    {({ isActive }) => (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={cn("h-8 w-8", isActive && "text-primary bg-primary/10")}
                            title="Hướng dẫn sử dụng"
                        >
                            <BookOpen className="w-4 h-4" />
                        </Button>
                    )}
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
            </div>
        </header>
    );
}
