import { cn } from "@/lib/utils";
import { Wifi, WifiOff, Moon, Sun } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";

export function Header() {
    const wsConnected = useAppStore((s) => s.wsConnected);
    const theme = useAppStore((s) => s.theme);
    const setTheme = useAppStore((s) => s.setTheme);

    return (
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
                    R
                </div>
                <div>
                    <h1 className="font-semibold text-sm text-foreground">Bing Rewards Auto Search</h1>
                    <p className="text-xs text-muted-foreground">v9.0 · Multi-Profile</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div
                    className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        wsConnected ? "text-green-500" : "text-muted-foreground",
                    )}
                >
                    {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                    {wsConnected ? "Kết nối" : "Mất kết nối"}
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    title={theme === "dark" ? "Chuyển sang sáng" : "Chuyển sang tối"}
                >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
            </div>
        </header>
    );
}
