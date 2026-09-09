# IC SPICY Plant NFC Tag System

**Program NTAG215 stickers, tag pots, and hand off on-chain provenance at checkout.**

*For nursery staff tagging plants and confirming customer claims.*

---

## What You Are Building

Every sale-ready plant gets an NFC sticker on its pot. A tap opens that plant's live page — photos, lifecycle, feedings, weather history, and its on-chain NFT.

At checkout, the buyer taps the tag, signs in with Internet Identity, and requests the plant's provenance NFT. You approve the request from the Admin claim queue and the NFT transfers to them on-chain. Nothing moves without your approval.

- The tag holds only a public URL: https://www.icspicy.app/plant/PLANT_ID?src=nfc — the plant ID is not a secret. Your admin approval at the register is the security gate.

## Shopping List

- NTAG215 NFC stickers (25 mm round works well on pots; buy blanks, not pre-encoded).

- Your iPhone with the free NFC Tools app installed (App Store, by wakdev).

- Admin sign-in on icspicy.app (Internet Identity).

- Optional: an Android phone with Chrome writes tags directly from the site — no extra app.

- Plants must have an NFT to be claimable. The assign wizard mints one automatically when you (admin) create the plant.

## Step 1 — Open the Assign Wizard

- On your iPhone or MacBook, go to icspicy.app/admin/nfc-assign (sign in as admin).

- Also reachable from Admin -> NIMS -> Assign NFC.

- First visit on iPhone shows a built-in tutorial dialog. Reopen it anytime with icspicy.app/admin/nfc-assign?tutorial=1

## Step 2 — Create the Plant Record

- Photo: snap the plant with the rear camera (optional — you can skip and add later).

- Plant: pick the variety, stage (Seedling or Mature), and container. Optionally list it for sale with a price.

- Saving creates the plant, uploads the photo, snapshots today's nursery weather, and mints its NFT. The toast shows Plant #ID and NFT #ID — the wizard then shows the tag URL and a QR code.

## Step 3 — Program the Tag (iPhone)

Safari cannot write NFC stickers, so use the NFC Tools app:

- 1. Tap Copy URL on the wizard screen.

- 2. Open NFC Tools -> Write -> Add a record -> URL.

- 3. Paste the plant link and tap OK, then tap Write.

- 4. Hold the iPhone's top edge on the blank NTAG215 sticker (~3 seconds) until it confirms.

- 5. Peel and stick the tag on the pot. Tap it once with your own phone to test — Safari should open the plant page.

## Step 3B — Android or Bulk

- Android Chrome: the wizard shows a Write to NFC tag button — tap it, hold the phone to the sticker, done. No extra app.

- Bulk prep: Admin -> NIMS -> Generate tag links (CSV) exports every plant's URL so you can program batches of tags at the potting bench.

- You can also re-open any plant's page later: owners/admins get an NFC tag quick action with the same write/copy/QR options.

## Step 4 — Customer Tap & Claim

- Customer taps the pot with any modern phone — the plant page opens with a Claim banner (shown while the plant has an NFT and is unsold).

- They tap Request claim, sign in with Internet Identity (one tap with passkey), optionally add a note (e.g. receipt number), and submit.

- Their screen shows: Claim requested — awaiting nursery confirmation. They can cancel it themselves before you approve.

## Step 5 — Approve at Checkout

- Admin -> NIMS -> Pending provenance claims.

- Each request shows the variety, NFT ID, time, requester principal, and their note. Match it to the customer in front of you.

- Tap Approve: the NFT transfers to the buyer, the plant is marked sold to them, and any other pending requests for that plant are auto-rejected.

- Tap Reject for anything that doesn't match a real purchase.

- The buyer's plant page now shows Provenance verified on-chain.

## Nursery Day Checklist

- 1. Stickers + iPhone with NFC Tools charged.

- 2. Sign in as admin, open /admin/nfc-assign.

- 3. Per plant: photo -> details -> save -> copy URL -> write tag -> stick on pot -> test tap.

- 4. At the register: buyer taps + requests, you approve in the claim queue.

- 5. End of day: glance at the claim queue for stragglers; reject anything unmatched.

## Troubleshooting

- Tag won't write: confirm it is NTAG215 (not NTAG213 pre-locked or Mifare Classic), hold still 3+ seconds, and keep it off metal shelving while writing.

- Tap opens nothing: re-write the tag; moisture or metal pots weaken the read. Test with the pot in hand, not on a metal rack.

- No claim banner on the page: the plant has no NFT (created by a non-admin), or it is already sold or marked dead.

- Claim button says sign in: the customer must authenticate with Internet Identity first — anonymous browsing can view but not claim.

- Duplicate requests: each person can only have one pending request per plant; approving one automatically rejects the rest.

- Wrote the wrong URL: NTAG215 tags are re-writable — just write again unless you locked the tag (don't lock).

## Security Notes

- The tag URL is public — anyone can view the plant page. That's by design (marketing + provenance).

- Any signed-in visitor can request a claim; the NFT only moves when an admin approves. Approve only for customers physically at checkout.

- Approvals and rejections are audit-logged on-chain.

- The NFT must be held by the nursery to transfer — already-transferred plants cannot be re-claimed.
