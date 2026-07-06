import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Home, Sprout } from "lucide-react";
import { Seo } from "../components/Seo";

export default function NotFoundPage() {
  return (
    <div
      className="max-w-lg mx-auto py-20 px-4 text-center space-y-6"
      data-ocid="not-found-page"
    >
      <Seo
        title="Page Not Found | IC SPICY"
        description="This page doesn't exist on IC SPICY."
        path="/404"
        noIndex
      />
      <p className="text-6xl" aria-hidden>
        🌶️
      </p>
      <h1 className="font-display text-3xl font-bold text-foreground">
        Page not found
      </h1>
      <p className="text-muted-foreground text-sm leading-relaxed">
        The link may be broken or the page was moved. Try one of these instead:
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-smooth"
        >
          <Home className="w-4 h-4" />
          Home
        </Link>
        <Link
          to="/guides"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-smooth"
        >
          <BookOpen className="w-4 h-4" />
          Growing Guides
        </Link>
        <Link
          to="/nims"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-secondary transition-smooth"
        >
          <Sprout className="w-4 h-4" />
          NIMS
        </Link>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to IC SPICY home
      </Link>
    </div>
  );
}
