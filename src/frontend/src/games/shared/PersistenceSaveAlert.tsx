export function PersistenceSaveAlert({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss?: () => void;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mx-2 mb-2 shrink-0 rounded-lg border border-red-500/40 bg-red-950/45 px-3 py-2 text-xs text-red-100"
    >
      <p className="font-semibold">Save failed</p>
      <p className="mt-1 text-red-100/90">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          className="mt-1.5 text-[10px] font-semibold underline text-red-200/90"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
