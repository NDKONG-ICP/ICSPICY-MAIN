import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAgentHubActor } from "@/lib/agent-hub-idl";
import { Flame, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function FooterNewsletterSignup() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const hub = await getAgentHubActor();
      if (!hub) {
        toast.error("Newsletter service is not configured yet.");
        return;
      }
      const result = await hub.subscribeNewsletter(email.trim());
      if (result.success) {
        toast.success(result.message);
        setEmail("");
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Subscribe failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mt-6 space-y-2"
      data-ocid="footer-newsletter"
    >
      <p className="text-sm font-semibold flex items-center gap-2">
        <Mail className="w-4 h-4 text-primary" />
        Weekly Natural Farming newsletter
      </p>
      <p className="text-xs text-muted-foreground">
        Recipes from the CookBook, nursery updates, and Zone 10a weather notes.
      </p>
      <div className="flex gap-2 max-w-sm">
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-9"
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "…" : "Join"}
        </Button>
      </div>
    </form>
  );
}
