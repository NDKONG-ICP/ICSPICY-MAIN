import { SocialIcons } from "./SocialLinks";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-line/60">
      <div className="container flex flex-col items-center gap-4 py-10">
        {/* Social icons — always visible, centered */}
        <SocialIcons />

        <div className="flex w-full flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium tracking-wide">
            IC SPICY · Rare. Hot. Alive.
          </p>
          <p className="text-pretty text-center sm:text-left">
            Florida-grown rare peppers. On-chain provenance on the Internet
            Computer. © {year} IC SPICY.
          </p>
          <a
            href="/admin"
            className="opacity-40 transition-opacity hover:opacity-100"
          >
            Admin
          </a>
        </div>
      </div>
    </footer>
  );
}
