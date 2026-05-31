import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
    Download,
    UserPlus,
    Gift,
    PlayCircle,
    Monitor,
    Smartphone,
    BarChart2,
    ExternalLink,
    Copy,
    CheckCircle2,
    ChevronRight,
    ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const REFERRAL_URL = import.meta.env.VITE_REFERRAL_URL as string;

/* ──────────────────────────── helpers ──────────────────────────── */

function FadeUp({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
            className={className}
        >
            {children}
        </motion.div>
    );
}

function StaggerList({ children, delay = 0 }: { children: React.ReactNode[]; delay?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    return (
        <div ref={ref} className="flex flex-col gap-3">
            {children.map((child, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={inView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.45, delay: delay + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                    {child}
                </motion.div>
            ))}
        </div>
    );
}

/* ──────────────────────────── section wrapper ──────────────────── */

function Section({
    id,
    icon: Icon,
    step,
    title,
    children,
}: {
    id: string;
    icon: React.ElementType;
    step: number;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section id={id} className="scroll-mt-20">
            <FadeUp>
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary shrink-0">
                        <span className="text-xs font-bold">{step}</span>
                    </div>
                    <Icon className="w-5 h-5 text-primary shrink-0" />
                    <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                </div>
            </FadeUp>
            {children}
        </section>
    );
}

/* ──────────────────────────── step card ────────────────────────── */

function StepCard({ num, title, desc }: { num: number; title: string; desc: string }) {
    return (
        <div className="flex gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/50">
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {num}
            </div>
            <div>
                <div className="text-sm font-medium text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground/80 mt-0.5 leading-relaxed">{desc}</div>
            </div>
        </div>
    );
}

/* ──────────────────────────── TOC ──────────────────────────────── */

const TOC_ITEMS = [
    { id: "edge", label: "Cài Edge" },
    { id: "profile", label: "Tạo Profile" },
    { id: "rewards", label: "Đăng ký Rewards" },
    { id: "app", label: "Dùng App" },
];

function Toc({ active }: { active: string }) {
    return (
        <nav className="flex flex-col gap-1">
            {TOC_ITEMS.map((item) => (
                <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={cn(
                        "text-xs px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                        active === item.id
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                    )}
                >
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    {item.label}
                </a>
            ))}
        </nav>
    );
}

/* ──────────────────────────── referral card ────────────────────── */

function ReferralCard() {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(REFERRAL_URL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-5"
        >
            {/* glow */}
            <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 rounded-full blur-2xl pointer-events-none"
            />
            <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Chưa có tài khoản Rewards?</span>
                </div>
                <p className="text-xs text-muted-foreground/80 mb-4 leading-relaxed">
                    Dùng link mời bên dưới để đăng ký — bạn sẽ nhận được điểm bonus khi bắt đầu.
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/60 border border-border/60 mb-3">
                    <span className="text-[10px] text-muted-foreground/60 truncate flex-1 font-mono">
                        {REFERRAL_URL}
                    </span>
                    <button
                        onClick={copy}
                        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        title="Copy link"
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
                <a
                    href={REFERRAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                    Mở link đăng ký <ExternalLink className="w-3 h-3" />
                </a>
            </div>
        </motion.div>
    );
}

/* ──────────────────────────── app step card ────────────────────── */

function AppStep({
    icon: Icon,
    title,
    desc,
    color,
}: {
    icon: React.ElementType;
    title: string;
    desc: string;
    color: string;
}) {
    return (
        <div className="flex gap-3.5 p-4 rounded-xl bg-muted/20 border border-border/40">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", color)}>
                <Icon className="w-4.5 h-4.5" />
            </div>
            <div>
                <div className="text-sm font-semibold text-foreground mb-0.5">{title}</div>
                <div className="text-xs text-muted-foreground/80 leading-relaxed">{desc}</div>
            </div>
        </div>
    );
}

/* ──────────────────────────── main page ────────────────────────── */

export function GuidePage() {
    const [activeSection, setActiveSection] = useState("edge");

    useEffect(() => {
        const observers: IntersectionObserver[] = [];
        TOC_ITEMS.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (!el) return;
            const obs = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) setActiveSection(id);
                },
                { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
            );
            obs.observe(el);
            observers.push(obs);
        });
        return () => observers.forEach((o) => o.disconnect());
    }, []);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-5xl mx-auto px-4 py-10">
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="mb-12 text-center"
                >
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground transition-colors mb-6"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Quay về trang chính
                    </Link>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary font-medium mb-4">
                        <Gift className="w-3.5 h-3.5" />
                        Hướng dẫn từ A đến Z
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-3">Bắt đầu với Bing Rewards</h1>
                    <p className="text-muted-foreground/80 text-sm max-w-md mx-auto leading-relaxed">
                        Từ cài đặt Edge, tạo profile, đăng ký Rewards đến dùng app tự động — chỉ mất 10 phút setup.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
                    {/* Sticky TOC */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-20">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/40 font-medium mb-3 px-3">
                                Nội dung
                            </p>
                            <Toc active={activeSection} />
                        </div>
                    </aside>

                    {/* Content */}
                    <div className="flex flex-col gap-12">
                        {/* Section 1: Cài Edge */}
                        <Section id="edge" icon={Download} step={1} title="Cài Microsoft Edge">
                            <StaggerList delay={0.05}>
                                {[
                                    <StepCard
                                        num={1}
                                        title="Tải Microsoft Edge"
                                        desc="Truy cập microsoft.com/edge và tải bản ổn định mới nhất cho Windows."
                                    />,
                                    <StepCard
                                        num={2}
                                        title="Chạy file cài đặt"
                                        desc="Mở file .exe vừa tải, nhấn Next và chờ quá trình cài đặt hoàn tất (khoảng 1-2 phút)."
                                    />,
                                    <StepCard
                                        num={3}
                                        title="Đặt Edge làm trình duyệt mặc định (tùy chọn)"
                                        desc="Khi Edge mở lần đầu, nó sẽ hỏi có muốn đặt làm mặc định không — bạn có thể bỏ qua."
                                    />,
                                ]}
                            </StaggerList>
                            <FadeUp delay={0.3} className="mt-4">
                                <a
                                    href="https://www.microsoft.com/edge"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 transition-colors px-3 py-2 rounded-lg border border-primary/20"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Tải Microsoft Edge
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </FadeUp>
                        </Section>

                        {/* Divider */}
                        <FadeUp>
                            <div className="border-t border-border/40" />
                        </FadeUp>

                        {/* Section 2: Tạo Profile */}
                        <Section id="profile" icon={UserPlus} step={2} title="Tạo nhiều Profile Edge">
                            <FadeUp delay={0.05}>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed mb-4">
                                    Mỗi tài khoản Microsoft cần một Profile riêng trong Edge. App sẽ tự nhận diện và
                                    quản lý tất cả.
                                </p>
                            </FadeUp>
                            <StaggerList delay={0.1}>
                                {[
                                    <StepCard
                                        num={1}
                                        title="Nhấp vào avatar góc trên phải Edge"
                                        desc="Trong Edge, nhấp vào ảnh đại diện ở góc trên bên phải thanh địa chỉ."
                                    />,
                                    <StepCard
                                        num={2}
                                        title='"Add profile" → "Add"'
                                        desc='Chọn "Add profile" từ menu dropdown rồi nhấn "Add" để tạo profile mới.'
                                    />,
                                    <StepCard
                                        num={3}
                                        title="Đăng nhập tài khoản Microsoft"
                                        desc='Trong cửa sổ mới mở ra, nhấn "Sign in" và đăng nhập tài khoản Microsoft tương ứng. Lặp lại cho mỗi tài khoản.'
                                    />,
                                    <StepCard
                                        num={4}
                                        title="Thêm bao nhiêu profile tùy thích"
                                        desc="Lặp lại các bước trên cho mỗi tài khoản Microsoft. Không có giới hạn số profile."
                                    />,
                                ]}
                            </StaggerList>
                        </Section>

                        {/* Divider */}
                        <FadeUp>
                            <div className="border-t border-border/40" />
                        </FadeUp>

                        {/* Section 3: Đăng ký Rewards */}
                        <Section id="rewards" icon={Gift} step={3} title="Đăng ký Microsoft Rewards">
                            <FadeUp delay={0.05}>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed mb-4">
                                    Mỗi tài khoản Microsoft cần kích hoạt Rewards riêng. Làm trên từng profile.
                                </p>
                            </FadeUp>
                            <StaggerList delay={0.1}>
                                {[
                                    <StepCard
                                        num={1}
                                        title="Mở profile cần kích hoạt"
                                        desc="Chuyển sang profile trong Edge bằng cách nhấp avatar và chọn đúng profile."
                                    />,
                                    <StepCard
                                        num={2}
                                        title="Truy cập rewards.bing.com"
                                        desc="Vào địa chỉ rewards.bing.com trong thanh địa chỉ của profile đó."
                                    />,
                                    <StepCard
                                        num={3}
                                        title='Nhấn "Join now" / "Sign in"'
                                        desc="Nếu tài khoản chưa kích hoạt Rewards, nhấn Join/Sign in và làm theo hướng dẫn."
                                    />,
                                    <StepCard
                                        num={4}
                                        title="Lặp lại cho tất cả profile"
                                        desc="Mỗi tài khoản phải được kích hoạt ít nhất một lần trước khi app chạy."
                                    />,
                                ]}
                            </StaggerList>
                            <FadeUp delay={0.5} className="mt-5">
                                <ReferralCard />
                            </FadeUp>
                        </Section>

                        {/* Divider */}
                        <FadeUp>
                            <div className="border-t border-border/40" />
                        </FadeUp>

                        {/* Section 4: Dùng App */}
                        <Section id="app" icon={PlayCircle} step={4} title="Dùng App">
                            <FadeUp delay={0.05}>
                                <p className="text-xs text-muted-foreground/80 leading-relaxed mb-5">
                                    Sau khi setup xong, mỗi ngày chỉ cần mở app và nhấn Start — phần còn lại tự động
                                    hoàn toàn.
                                </p>
                            </FadeUp>
                            <StaggerList delay={0.1}>
                                {[
                                    <AppStep
                                        icon={UserPlus}
                                        color="bg-sky-500/15 text-sky-400"
                                        title="Thêm Profile vào App"
                                        desc='Nhấn nút "Thêm Profile" ở cột trái, app sẽ tự quét và liệt kê tất cả profile Edge đã đăng nhập.'
                                    />,
                                    <AppStep
                                        icon={Monitor}
                                        color="bg-violet-500/15 text-violet-400"
                                        title="Chọn loại Search"
                                        desc='Chọn "Desktop" (90 lượt), "Mobile" (60 lượt) hoặc "Cả hai". Mỗi loại cho điểm riêng, nên dùng "Cả hai" để tối đa điểm.'
                                    />,
                                    <AppStep
                                        icon={Smartphone}
                                        color="bg-emerald-500/15 text-emerald-400"
                                        title='Nhấn "Bắt đầu"'
                                        desc="App sẽ tự mở Edge, thực hiện search, đóng lại và chuyển sang profile tiếp theo. Không cần làm gì."
                                    />,
                                    <AppStep
                                        icon={BarChart2}
                                        color="bg-amber-500/15 text-amber-400"
                                        title="Xem điểm & tiến độ"
                                        desc="Cột phải hiển thị tiến độ realtime và điểm tích lũy của từng profile. Nhấn vào từng profile để xem chi tiết desktop/mobile/offers."
                                    />,
                                ]}
                            </StaggerList>

                            {/* Tips box */}
                            <FadeUp delay={0.5} className="mt-5">
                                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
                                    <p className="text-xs font-semibold text-amber-400/90 mb-2">💡 Tips</p>
                                    <ul className="text-xs text-muted-foreground/75 space-y-1.5 leading-relaxed list-disc list-inside">
                                        <li>
                                            Chạy app vào buổi sáng — điểm sẽ reset lúc 00:00 theo giờ múi giờ tài khoản.
                                        </li>
                                        <li>Không cần để màn hình bật — app chạy nền tự động.</li>
                                        <li>Nhấn "Kiểm tra điểm" để cập nhật điểm mà không cần search.</li>
                                        <li>
                                            Profile lỗi sẽ hiển thị thông báo đỏ trong log — kiểm tra lại đăng nhập
                                            Edge.
                                        </li>
                                    </ul>
                                </div>
                            </FadeUp>
                        </Section>

                        {/* Bottom spacer */}
                        <div className="h-8" />
                    </div>
                </div>
            </div>
        </div>
    );
}
