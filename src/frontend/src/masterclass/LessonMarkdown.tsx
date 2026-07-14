/**
 * Markdown-lite renderer for masterclass lessons — adapted from VarietyGuideCard GuideMarkdown.
 * Resolves internal [/cookbook/slug] and [/variety/id/guide] links to TanStack Router Links.
 */
import { Link } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Sprout } from "lucide-react";
import { Fragment } from "react";

const INTERNAL_LINK =
  /\[([^\]]+)\]\((\/cookbook\/[^)]+|\/variety\/\d+\/guide|\/games\/[^)]+|\/masterclass[^)]*)\)/g;
const EXTERNAL_LINK = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const BOLD_SPLIT = /(\*\*[^*]+\*\*)/g;

function renderBold(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(BOLD_SPLIT).map((part, j) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-b${j}`} className="font-semibold text-foreground">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={`${keyPrefix}-t${j}`}>{part.replace(/\*([^*]+)\*/g, "$1")}</Fragment>
    ),
  );
}

function renderInlineRich(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  const combined = new RegExp(
    `${INTERNAL_LINK.source}|${EXTERNAL_LINK.source}`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = combined.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(...renderBold(text.slice(last, m.index), `${keyPrefix}-pre${m.index}`));
    }
    const label = m[1]!;
    const href = m[2]!;
    if (href.startsWith("http")) {
      nodes.push(
        <a
          key={`${keyPrefix}-ext${m.index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-orange-300 underline decoration-orange-500/40 underline-offset-2 hover:text-orange-200"
        >
          {label}
          <ExternalLink className="inline h-3 w-3 opacity-70" aria-hidden />
        </a>,
      );
    } else if (href.startsWith("/cookbook/")) {
      const slug = href.replace("/cookbook/", "");
      nodes.push(
        <Link
          key={`${keyPrefix}-cb${m.index}`}
          to="/cookbook/$slug"
          params={{ slug }}
          className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
        >
          <BookOpen className="size-3" aria-hidden />
          {label}
        </Link>,
      );
    } else if (href.startsWith("/variety/")) {
      const varietyId = href.match(/\/variety\/(\d+)\/guide/)?.[1] ?? "";
      nodes.push(
        <Link
          key={`${keyPrefix}-var${m.index}`}
          to="/variety/$varietyId/guide"
          params={{ varietyId }}
          className="mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-200 transition hover:bg-orange-500/20"
        >
          <Sprout className="size-3" aria-hidden />
          {label}
        </Link>,
      );
    } else {
      nodes.push(
        <Link
          key={`${keyPrefix}-int${m.index}`}
          to={href}
          className="text-orange-300 underline decoration-orange-500/40 underline-offset-2 hover:text-orange-200"
        >
          {label}
        </Link>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(...renderBold(text.slice(last), `${keyPrefix}-tail`));
  }
  return nodes.length ? nodes : renderBold(text, keyPrefix);
}

function MarkdownTable({ block }: { block: string }) {
  const lines = block.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return null;
  const headerCells = lines[0]!
    .split("|")
    .map((c) => c.trim())
    .filter(Boolean);
  const bodyRows = lines.slice(2).map((line) =>
    line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean),
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/30">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-xs uppercase tracking-wider text-muted-foreground">
            {headerCells.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className="border-b border-white/[0.04] last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-3 text-muted-foreground">
                  {renderInlineRich(cell, `t${ri}c${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownBlock({ block, index }: { block: string; index: number }) {
  const trimmed = block.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("### ")) {
    const lines = trimmed.split("\n");
    const heading = lines[0]!.replace(/^###\s+/, "");
    const body = lines.slice(1).join("\n").trim();
    return (
      <div key={index}>
        <h4 className="mb-2 font-display text-base font-semibold text-orange-100/90">
          {heading}
        </h4>
        {body ? <MarkdownBody content={body} /> : null}
      </div>
    );
  }

  if (trimmed.startsWith("|")) {
    return (
      <div key={index}>
        <MarkdownTable block={trimmed} />
      </div>
    );
  }

  const lines = trimmed.split("\n");
  const isBulletBlock = lines.every(
    (l) => l.trim().startsWith("- ") || l.trim() === "",
  );
  if (isBulletBlock && lines.some((l) => l.trim().startsWith("- "))) {
    return (
      <ul key={index} className="space-y-2 pl-5">
        {lines
          .filter((l) => l.trim().startsWith("- "))
          .map((l, j) => (
            <li key={j} className="list-disc marker:text-emerald-500/70 leading-relaxed">
              {renderInlineRich(l.trim().slice(2), `li${index}-${j}`)}
            </li>
          ))}
      </ul>
    );
  }

  if (trimmed.startsWith("**") && trimmed.includes(":**")) {
    return (
      <p key={index} className="leading-relaxed">
        {renderInlineRich(trimmed, `p${index}`)}
      </p>
    );
  }

  return (
    <p key={index} className="leading-relaxed">
      {renderInlineRich(trimmed, `p${index}`)}
    </p>
  );
}

export function MarkdownBody({ content }: { content: string }) {
  const blocks = content.split(/\n{2,}/);
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} index={i} />
      ))}
    </div>
  );
}

export function LessonMarkdown({ content }: { content: string }) {
  return <MarkdownBody content={content} />;
}
