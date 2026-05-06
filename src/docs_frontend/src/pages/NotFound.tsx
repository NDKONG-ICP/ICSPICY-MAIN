import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-xs uppercase tracking-[0.32em] text-muted">404</p>
      <h1 className="display max-w-xl text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        That document is somewhere else in the library.
      </h1>
      <Link
        to="/library"
        className="rounded-full bg-gradient-to-r from-ember to-gold px-5 py-2 text-sm font-medium text-bg shadow-ember transition-transform hover:-translate-y-0.5"
      >
        Back to the library
      </Link>
    </div>
  );
}
