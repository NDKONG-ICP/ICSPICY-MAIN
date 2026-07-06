import { Link } from "@tanstack/react-router";
import { Seo } from "./Seo";

/** Minimal noindex head for auth-only / private routes. */
export function NoIndexSeo({
  title,
  path,
  description = "",
}: {
  title: string;
  path: string;
  description?: string;
}) {
  return (
    <Seo title={title} description={description} path={path} noIndex />
  );
}

/** Crawlable 404 page content for prerender (mirrors NotFound.tsx). */
export function notFoundCrawlHtml() {
  return `      <main>
      <h1>Page not found</h1>
      <p>This page doesn't exist on IC SPICY. Try the home page, growing guides, or NIMS plant tracker.</p>
      <nav><ul>
        <li><a href="/">Home</a></li>
        <li><a href="/guides">Growing Guides</a></li>
        <li><a href="/cookbook">CookBook</a></li>
        <li><a href="/nims">NIMS</a></li>
      </ul></nav>
      </main>`;
}
