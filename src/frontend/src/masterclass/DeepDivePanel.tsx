/**
 * SpicyAI deep-dive panel — lesson-scoped tutoring (does not affect quiz scores).
 */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  chatErrorToString,
  getSpicyAiActor,
  toSpicyAiMessage,
} from "@/lib/spicyai-idl";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { MC_CARD } from "./MasterclassShell";

export function DeepDivePanel({
  lessonId,
  lessonTitle,
  moduleTitle,
}: {
  lessonId: string;
  lessonTitle: string;
  moduleTitle: string;
}) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    const spicy = getSpicyAiActor();
    if (!spicy || !question.trim()) return;
    setLoading(true);
    setReply(null);
    try {
      const scoped = [
        `Masterclass deep dive for lesson ${lessonId} — "${lessonTitle}".`,
        `Module: ${moduleTitle}.`,
        `Scope: IC SPICY regenerative chili growing, soil biology, KNF/JADAM, Florida nursery context.`,
        `Answer in plain grower English, under 200 words unless the question needs a short list.`,
        `Question: ${question.trim()}`,
      ].join("\n");
      const res = await spicy.chatWithLlm({
        messages: [toSpicyAiMessage({ role: "user", content: scoped })],
      });
      if (res.ok) setReply(res.ok.response);
      else if (res.err) setReply(chatErrorToString(res.err));
    } catch (e) {
      setReply(e instanceof Error ? e.message : "Deep dive failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={`${MC_CARD} p-5`} data-ocid="masterclass-deep-dive">
      <h2 className="font-display text-base font-semibold text-foreground">
        Ask SpicyAI about this lesson
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Open-ended tutoring — does not affect checkpoint scores or badges.
      </p>
      <Textarea
        className="mt-3 border-white/10 bg-black/30"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={3}
        placeholder="What would you like to go deeper on?"
      />
      <Button
        size="sm"
        className="mt-2 gap-1.5 bg-primary hover:bg-primary/90"
        disabled={loading || !question.trim()}
        onClick={() => void ask()}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        Ask SpicyAI
      </Button>
      {reply ? (
        <p className="mt-4 whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-black/25 p-4 text-sm leading-relaxed text-muted-foreground">
          {reply}
        </p>
      ) : null}
    </section>
  );
}
