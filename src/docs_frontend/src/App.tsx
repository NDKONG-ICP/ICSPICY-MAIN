import { Suspense, lazy, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminGuard } from "./components/AdminGuard";
import { AnimatedBackdrop } from "./components/AnimatedBackdrop";
import { ChatWidget } from "./components/ChatWidget";
import { CommandPalette } from "./components/CommandPalette";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { useCatalog } from "./hooks/useCatalog";
import { getPrincipal } from "./lib/auth";

const HomePage = lazy(() =>
  import("./pages/Home").then((m) => ({ default: m.HomePage })),
);
const LibraryPage = lazy(() =>
  import("./pages/Library").then((m) => ({ default: m.LibraryPage })),
);
const DocumentDetailPage = lazy(() =>
  import("./pages/DocumentDetail").then((m) => ({
    default: m.DocumentDetailPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFound").then((m) => ({ default: m.NotFoundPage })),
);
const AdminLoginPage = lazy(() =>
  import("./pages/AdminLogin").then((m) => ({ default: m.AdminLoginPage })),
);
const AdminDocumentsPage = lazy(() =>
  import("./pages/AdminDocuments").then((m) => ({
    default: m.AdminDocumentsPage,
  })),
);
const AdminChatbotPage = lazy(() =>
  import("./pages/AdminChatbot").then((m) => ({ default: m.AdminChatbotPage })),
);
const ChatPage = lazy(() =>
  import("./pages/Chat").then((m) => ({ default: m.ChatPage })),
);

function PageFallback() {
  return (
    <div className="container flex min-h-[40vh] items-center justify-center">
      <div className="h-1 w-32 overflow-hidden rounded-full bg-line/40">
        <div className="h-full w-1/2 animate-shimmer rounded-full bg-gradient-to-r from-ember via-gold to-ember bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

export default function App() {
  const { data } = useCatalog();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isChatRoute = location.pathname === "/chat";

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen flex-col">
      <AnimatedBackdrop />
      {!isAdminRoute && <Header onOpenCommand={() => setPaletteOpen(true)} />}
      {isAdminRoute && <AdminHeader />}
      <main className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:slug" element={<DocumentDetailPage />} />
            <Route
              path="/documents"
              element={<Navigate to="/library" replace />}
            />
            <Route
              path="/documents/:slug"
              element={<Navigate to="/library/:slug" replace />}
            />
            <Route path="/chat" element={<ChatPage />} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/documents"
              element={
                <AdminGuard>
                  <AdminDocumentsPage />
                </AdminGuard>
              }
            />
            <Route
              path="/admin/chatbot"
              element={
                <AdminGuard>
                  <AdminChatbotPage />
                </AdminGuard>
              }
            />
            <Route path="/admin" element={<AdminLoginPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      {!isAdminRoute && <Footer />}

      {/* Chat widget — shown on all public pages except /chat itself */}
      {!isAdminRoute && !isChatRoute && <ChatWidget />}

      {!isAdminRoute && (
        <CommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          documents={data?.documents ?? []}
        />
      )}
    </div>
  );
}

function AdminHeader() {
  const [principal, setPrincipal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getPrincipal().then((p) => setPrincipal(p));
  }, []);

  const copy = () => {
    if (!principal) return;
    navigator.clipboard.writeText(principal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 backdrop-blur-xl">
      <div className="absolute inset-0 -z-10 bg-bg/70" />
      <div className="container flex h-14 items-center gap-3 flex-wrap">
        <a
          href="/"
          className="text-sm text-muted hover:text-ink transition-colors shrink-0"
        >
          ← Back to Library
        </a>
        <span className="text-muted/40">/</span>
        <span className="text-sm font-medium text-ink shrink-0">
          IC <span className="text-ember">SPICY</span> Admin
        </span>
        {principal && (
          <button
            type="button"
            onClick={copy}
            title="Click to copy full principal ID"
            className="ml-auto flex items-center gap-2 rounded-lg border border-line/60 bg-elevated/40 px-3 py-1.5 transition-colors hover:border-ember/60 hover:bg-elevated/70"
          >
            <span className="text-xs text-muted shrink-0">Principal:</span>
            <span className="font-mono text-xs text-ink break-all">
              {principal}
            </span>
            <span className="shrink-0 text-xs text-muted">
              {copied ? "✓ copied" : "copy"}
            </span>
          </button>
        )}
      </div>
    </header>
  );
}
