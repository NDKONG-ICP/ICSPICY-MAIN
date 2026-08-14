import { Button } from "@/components/ui/button";
import { getAgentHubActor } from "@/lib/agent-hub-idl";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Link, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Flame, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function NewsletterConfirmPage() {
  usePageTitle("Confirm Newsletter");
  const search = useSearch({ from: "/newsletter/confirm" }) as { token?: string };
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [message, setMessage] = useState("Confirming your subscription…");

  useEffect(() => {
    const token = search.token?.trim();
    if (!token) {
      setStatus("err");
      setMessage("Missing confirmation token.");
      return;
    }
    void (async () => {
      try {
        const hub = await getAgentHubActor();
        if (!hub) {
          setStatus("err");
          setMessage("Newsletter service is not configured.");
          return;
        }
        const result = await hub.confirmSubscription(token);
        setStatus(result.success ? "ok" : "err");
        setMessage(result.message);
      } catch (e) {
        setStatus("err");
        setMessage(e instanceof Error ? e.message : "Confirmation failed");
      }
    })();
  }, [search.token]);

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
        <Flame className="w-7 h-7 text-primary" />
      </div>
      {status === "loading" && (
        <p className="text-muted-foreground">{message}</p>
      )}
      {status === "ok" && (
        <>
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <h1 className="font-display font-bold text-2xl">You&apos;re in!</h1>
          <p className="text-muted-foreground">{message}</p>
        </>
      )}
      {status === "err" && (
        <>
          <XCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="font-display font-bold text-2xl">Could not confirm</h1>
          <p className="text-muted-foreground">{message}</p>
        </>
      )}
      <Button asChild variant="outline">
        <Link to="/">Back to IC SPICY</Link>
      </Button>
    </div>
  );
}

export default NewsletterConfirmPage;
