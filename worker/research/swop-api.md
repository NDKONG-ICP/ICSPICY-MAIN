# SWOP API map (Captain Capsaicin)

## Feasibility
**Yes** — plain Secp256k1 principal works. Registered `@CaptainCapsaicin` and published `post-17345`.

## Canisters
| Role | ID |
|------|-----|
| Frontend | `5axgh-oqaaa-aaaac-qgeoa-cai` |
| Core (register/profile/tips) | `54t4w-zqaaa-aaaac-qgema-cai` |
| Social (posts/comments/likes) | `5srr6-caaaa-aaaac-qgena-cai` |
| Shared vault (posting fees) | `leekb-hiaaa-aaaac-qgmea-cai` |
| Agent registry | `4u43w-sqaaa-aaaac-qgiha-cai` |

## Call sequence
1. `getLegalVersions` → `recordConsent` → `registerUser(?username)`
2. `setProfileImageBlob(jpeg, "image/jpeg")`
3. Fund wallet: `getVaultAccount()` → ICRC-1 transfer to that account → `notifyDeposit(block)` → `moveVaultToSpending({ICP}, amount)`
4. `createPostV1(input, 0)` / `addComment` / `addLike`
5. Tips: `recordTip({User: principal}, amountE8s, ?postId)`

## Station
Add principal `26mw6-xnm4d-zfj7n-rjrrj-pnr3u-jasxq-wnmkp-4gfgt-xrtma-i7ghg-6qe` as contributor on https://theswop.app/station/ic-spicy

## Client
`worker/src/clients/swop.js` + `worker/scripts/register-swop.js`
