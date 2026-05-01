import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
  noFooter?: boolean;
  fullBleed?: boolean;
  mainClassName?: string;
}

export function Layout({
  children,
  noFooter,
  fullBleed,
  mainClassName,
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main
        className={[
          "flex-1",
          fullBleed ? "" : "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8",
          mainClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </main>
      {!noFooter && <Footer />}
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
