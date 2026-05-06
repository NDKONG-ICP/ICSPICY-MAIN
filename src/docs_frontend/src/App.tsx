import { Suspense, lazy, useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AnimatedBackdrop } from "./components/AnimatedBackdrop";
import { CommandPalette } from "./components/CommandPalette";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ChatWidget } from "./components/ChatWidget";
import { AdminGuard } from "./components/AdminGuard";
import { useCatalog } from "./hooks/useCatalog";

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
  import("./pages/AdminDocuments").then((m) => ({ default: m.AdminDocumentsPage })),
);
const AdminChatbotPage = lazy(() =>
  import("./pages/AdminChatbot").then((m) => ({ default: m.AdminChatbotPage })),
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

      {/* Chat widget — shown on all public pages */}
      {!isAdminRoute && <ChatWidget />}

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
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 backdrop-blur-xl">
      <div className="absolute inset-0 -z-10 bg-bg/70" />
      <div className="container flex h-14 items-center gap-3">
        <a href="/" className="text-sm text-muted hover:text-ink transition-colors">
          ← Back to Library
        </a>
        <span className="text-muted/40">/</span>
        <span className="text-sm font-medium text-ink">
          IC <span className="text-ember">SPICY</span> Admin
        </span>
      </div>
    </header>
  );
}
