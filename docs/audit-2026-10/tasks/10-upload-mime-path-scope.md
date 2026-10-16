# Task 10 — Validate MIME and scope paths in user uploads (F-10, High)

## Goal
Stop authenticated users from storing arbitrary MIME (stored XSS) or overwriting other
users' files via unscoped paths.

## Files to read first
- `src/backend/mixins/artwork-upload-api.mo` (`storeCommunityImage` :225; `storeNimsPhotoFile`
  :285; the good example `adminStoreVerifiedGrowerImage` :249-272 with MIME check at :261;
  `storeAvatarFile` :199 which namespaces by caller at :205)
- `src/backend/lib/asset-upload.mo` (`storeToUploadsCanister` :90)
- path predicates `isCommunityImagePath`, `isNimsPhotoPath` (same file)

## Change description
1. Add a shared image-MIME allow-list check used by `storeCommunityImage` and
   `storeNimsPhotoFile`:
   ```motoko
   if (mimeType != "image/jpeg" and mimeType != "image/png" and mimeType != "image/webp") Runtime.trap("Invalid mime type");
   ```
2. Namespace the stored key by caller, like avatars: force the path to
   `community-images/<principal>/<sanitized-filename>` and
   `nims-photos/<principal>/<sanitized-filename>`. Reject any path containing `..`, `//`, or
   that resolves outside the per-principal prefix. Derive the prefix server-side; do not
   trust the full client path.
3. Ensure served assets carry `Content-Type` from the validated MIME and
   `X-Content-Type-Options: nosniff` (coordinate with the uploads asset canister
   `.ic-assets.json5`).
4. Audit other `store*` methods (`storeArtworkFile` :66) for the same gap and fix
   consistently.

## Acceptance criteria
- `storeCommunityImage(path, data, "text/html")` traps.
- A user cannot write to another principal's namespace or escape the prefix.
- Legitimate JPEG/PNG/WebP uploads still work and are served with a correct content type.

## Tests to add
- `scripts/audit/upload-guard.sh` (local): assert non-image MIME traps; assert a path with
  `../` traps; assert user A cannot overwrite a key under user B's prefix.

## Local verification
```bash
cd src/backend && $(mops toolchain bin moc) $(mops sources) --actor-idl system-idl main.mo --check
cd ../.. && dfx deploy --network local backend && bash scripts/audit/upload-guard.sh
```

## Mainnet deploy notes (human only)
Backend upgrade, no stable migration. Frontend must build keys the new way (or let the
backend derive the prefix and return the final key). Existing stored files keep their keys;
consider scanning the uploads canister for any non-image content already stored.

## Risks & rollback
- Risk: existing frontend code that passes full custom paths breaks → have the backend
  derive/override the prefix and return the canonical key; update the frontend to use it.
- Rollback: revert; the stored-key format change means new keys differ — keep the reader
  tolerant of both old and new prefixes.
