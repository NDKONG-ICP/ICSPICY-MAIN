export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-32 border-t border-line/60">
      <div className="container flex flex-col gap-3 py-10 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium tracking-wide">
          IC SPICY · Rare. Hot. Alive.
        </p>
        <p className="text-pretty">
          Florida-grown rare peppers. On-chain provenance on the Internet
          Computer. © {year} IC SPICY.
        </p>
      </div>
    </footer>
  );
}
