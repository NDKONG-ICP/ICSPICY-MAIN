import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownViewProps {
  body: string;
  className?: string;
}

export function MarkdownView({ body, className }: MarkdownViewProps) {
  return (
    <article className={cn("reading-column", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-semibold tracking-tight text-ink">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-10 text-xl font-semibold tracking-tight text-ink">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 text-base font-semibold uppercase tracking-[0.18em] text-muted">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mt-4 text-[15px] leading-relaxed text-ink/85">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-ink/85">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink/85">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mt-6 border-l-2 border-gold pl-4 italic text-muted">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-ember underline decoration-1 underline-offset-4 hover:text-gold"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
        }}
      >
        {body}
      </ReactMarkdown>
    </article>
  );
}
