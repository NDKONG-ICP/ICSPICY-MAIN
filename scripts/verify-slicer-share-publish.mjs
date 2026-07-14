#!/usr/bin/env node
/**
 * End-to-end verify: dual-audience share publish + badge detail API.
 * Usage: node scripts/verify-slicer-share-publish.mjs --network ic --identity ic_deploy_plain
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { HttpAgent, Actor } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Secp256k1KeyIdentity } from '@dfinity/identity-secp256k1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return !v || v.startsWith('--') ? true : v;
}

const network = arg('network') ?? 'ic';
const identityName = arg('identity') ?? 'ic_deploy_plain';
const backendId = 'ghxmp-xiaaa-aaaao-ba4sq-cai';
const siteOrigin = 'https://www.icspicy.app';

const pem = readFileSync(
  `${process.env.HOME}/.config/dfx/identity/${identityName}/identity.pem`,
  'utf8',
);
const identity = Secp256k1KeyIdentity.fromPem(pem);
const principal = identity.getPrincipal().toText();

const idlFactory = ({ IDL: I }) => {
  const ResultText = I.Variant({ ok: I.Text, err: I.Text });
  const PublishOk = I.Record({ url: I.Text, score: I.Nat });
  const ResultPublish = I.Variant({ ok: PublishOk, err: I.Text });
  const BadgePublic = I.Record({
    tokenId: I.Nat,
    badgeType: I.Text,
    tier: I.Text,
    earnedAt: I.Int,
    owner: I.Principal,
    metadataJson: I.Text,
    source: I.Variant({ masterclass: I.Null, game: I.Null }),
  });
  return I.Service({
    storeSlicerShareOgImage: I.Func([I.Vec(I.Nat8)], [ResultText], []),
    publishSlicerSharePage: I.Func([I.Text], [ResultPublish], []),
    getBadgeByTokenId: I.Func([I.Nat], [I.Opt(BadgePublic)], ['query']),
    getSlicerSharePublic: I.Func(
      [I.Principal],
      [
        I.Opt(
          I.Record({
            principal: I.Principal,
            username: I.Text,
            bestScore: I.Nat,
            lastPlayed: I.Int,
            tierSlug: I.Text,
            displayData: I.Text,
            rank: I.Nat,
            rankedTotal: I.Nat,
          }),
        ),
      ],
      ['query'],
    ),
  });
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function injectMeta(shell, { title, description, url, ogImage }) {
  let html = shell
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '');
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${esc(description)}" />`,
  );
  const block = [
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${esc(ogImage)}" />`,
  ].join('\n    ');
  return html.replace('</head>', `    ${block}\n  </head>`);
}

async function renderTestOgPng(score, username) {
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1c0a0a"/><stop offset="100%" stop-color="#450a0a"/>
    </linearGradient></defs>
    <rect width="1200" height="630" fill="url(#g)"/>
    <text x="600" y="80" text-anchor="middle" fill="#f97316" font-size="32" font-family="Georgia,serif">ICSPICY SLICER</text>
    <text x="600" y="340" text-anchor="middle" fill="#3d2914" font-size="120" font-weight="bold" font-family="Georgia,serif">${score.toLocaleString('en-US')}</text>
    <text x="600" y="420" text-anchor="middle" fill="#3d2914" font-size="36" font-family="Georgia,serif">SHU</text>
    <text x="600" y="560" text-anchor="middle" fill="#fafafa" font-size="40" font-family="Georgia,serif">@${username}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const host = network === 'local' ? 'http://127.0.0.1:4943' : 'https://ic0.app';
const agent = await HttpAgent.create({
  identity,
  host,
  shouldFetchRootKey: network === 'local',
});
const backend = Actor.createActor(idlFactory, { agent, canisterId: backendId });

console.log('Principal:', principal);

const shareData = await backend.getSlicerSharePublic(identity.getPrincipal());
if (!shareData?.[0]) {
  console.error('FAIL: no slicer stats for identity');
  process.exit(1);
}
const stats = shareData[0];
const score = Number(stats.bestScore);
const username = stats.username;
const lastPlayedNs = BigInt(stats.lastPlayed);
const shareUrl = `${siteOrigin}/s/slicer/${principal}?v=${lastPlayedNs}`;
const title = `@${username} scored ${score.toLocaleString('en-US')} SHU in ICSPICY Slicer 🔥`;
const description = `Step right up — ${score.toLocaleString('en-US')} SHU and climbing.`;

console.log('Rendering OG PNG…');
const pngBytes = await renderTestOgPng(score, username);
const ogRes = await backend.storeSlicerShareOgImage([...pngBytes]);
if (ogRes.err) {
  console.error('FAIL storeSlicerShareOgImage:', ogRes.err);
  process.exit(1);
}
const ogImage = ogRes.ok;
console.log('OG image URL:', ogImage);

const shell = readFileSync(join(ROOT, 'src/frontend/dist/index.html'), 'utf8');
const html = injectMeta(shell, { title, description, url: shareUrl, ogImage });
const pubRes = await backend.publishSlicerSharePage(html);
if (pubRes.err) {
  console.error('FAIL publishSlicerSharePage:', pubRes.err);
  process.exit(1);
}
console.log('Published:', pubRes.ok.url);

const humanUa =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const crawlerUa = 'facebookexternalhit/1.1';

const humanRes = await fetch(pubRes.ok.url, { headers: { 'User-Agent': humanUa } });
const humanHtml = await humanRes.text();
const hasSpa =
  humanHtml.includes('<div id="root">') &&
  humanHtml.includes('type="module"') &&
  humanHtml.includes('/assets/');
console.log('\n[1] Human fetch:', humanRes.status, hasSpa ? 'SPA shell ✓' : 'SPA shell ✗');

const crawlRes = await fetch(pubRes.ok.url, { headers: { 'User-Agent': crawlerUa } });
const crawlHtml = await crawlRes.text();
const ogMatch = crawlHtml.match(/property="og:image"\s+content="([^"]+)"/);
const ogUrl = ogMatch?.[1] ?? '';
const ogOk = ogUrl.includes('slicer-share-og') && ogUrl.includes(principal);
console.log('[2] Crawler og:image:', ogUrl, ogOk ? 'plaque PNG ✓' : '✗');

const badgeId = 200014n;
const badge = await backend.getBadgeByTokenId(badgeId);
const badgeOk = badge?.[0]?.tokenId === badgeId;
console.log('[3] getBadgeByTokenId(200014):', badgeOk ? '✓' : '✗', badge?.[0]?.badgeType ?? 'missing');

console.log('\nShare URL for manual card validator:', pubRes.ok.url);
console.log('Badge detail URL:', `${siteOrigin}/nft/200014`);
