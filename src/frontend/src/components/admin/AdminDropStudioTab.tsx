import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchStudioStatus, saveStudioCeiling, type StudioStatus } from "@/lib/drop-studio";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TOKEN_KEY = "drop_studio_admin_token";

export function AdminDropStudioTab() {
  const [status, setStatus] = useState<StudioStatus | null>(null);
  const [cap, setCap] = useState("200");
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchStudioStatus().then((row) => {
      setStatus(row);
      if (row) setCap(String(row.siteCap));
    });
  }, []);

  async function onSave() {
    const next = Math.floor(Number(cap));
    if (!token.trim()) {
      toast.error("Paste the worker admin token for this session");
      return;
    }
    setSaving(true);
    try {
      sessionStorage.setItem(TOKEN_KEY, token.trim());
      const row = await saveStudioCeiling(next, token.trim());
      setStatus(row);
      setCap(String(row.siteCap));
      toast.success(`Studio ceiling is ${row.siteCap} a day`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the ceiling");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hedera drop studio</CardTitle>
        <CardDescription>
          Holders get 10 MiniRouter images per NFT each 24 hours. The site ceiling starts at 200
          images a day and can be raised here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-w-md">
        <p className="text-sm text-muted-foreground">
          {status
            ? `${status.siteUsed} used today · ceiling ${status.siteCap} · ${status.siteRemaining} left`
            : "Studio status appears when the worker is reachable."}
        </p>
        <div className="space-y-1">
          <Label htmlFor="drop-cap">Daily ceiling</Label>
          <Input
            id="drop-cap"
            inputMode="numeric"
            value={cap}
            onChange={(event) => setCap(event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="drop-token">Worker admin token</Label>
          <Input
            id="drop-token"
            type="password"
            autoComplete="off"
            value={token}
            placeholder="Session only, not saved in the build"
            onChange={(event) => setToken(event.target.value)}
          />
        </div>
        <Button type="button" disabled={saving} onClick={() => void onSave()}>
          {saving ? "Saving…" : "Save ceiling"}
        </Button>
      </CardContent>
    </Card>
  );
}
