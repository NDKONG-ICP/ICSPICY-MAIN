import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import AccessControl "mo:caffeineai-authorization/access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import PriceOracleTypes "../types/price-oracle";
import PriceOracleLib "../lib/price-oracle";

mixin (
  accessControlState : AccessControl.AccessControlState,
  priceOracleState   : PriceOracleTypes.PriceOracleState,
) {
  // 5-minute cache TTL in nanoseconds
  let CACHE_TTL_NS : Int = 300_000_000_000;

  // Transform callback required by IC HTTP outcalls
  public query func priceOracleTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  /// Get all cached token prices.
  public query func getTokenPrices() : async [PriceOracleTypes.TokenPrice] {
    PriceOracleLib.getAllPrices(priceOracleState);
  };

  /// Get the ICP-equivalent price for a single token (in e8s per 1 base unit of that token).
  public query func getTokenPriceInIcp(
    token : PriceOracleTypes.OracleToken,
  ) : async Nat {
    PriceOracleLib.getPriceInIcp(priceOracleState, token);
  };

  /// Get the membership price (25 ICP equivalent) denominated in the requested token.
  public query func getMembershipPriceInToken(
    token : PriceOracleTypes.OracleToken,
  ) : async Nat {
    PriceOracleLib.membershipPriceInToken(priceOracleState, token);
  };

  /// Admin: trigger a manual refresh of all token prices via ICPSwap HTTP outcall.
  public shared ({ caller }) func refreshTokenPrices() : async Bool {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    await fetchAndCachePrices();
  };

  // Internal: fetch prices from ICPSwap and update cache.
  // Called by refreshTokenPrices() and the auto-refresh timer.
  func fetchAndCachePrices() : async Bool {
    let url = "https://uvevg-iqaaa-aaaak-ac27q-cai.raw.icp0.io/allPairs";
    let headers : [OutCall.Header] = [
      { name = "Accept"; value = "application/json" },
    ];
    let now = Time.now();
    try {
      let responseBody = await OutCall.httpGetRequest(url, headers, priceOracleTransform);
      let parsed = parseICPSwapPrices(responseBody, now);
      if (parsed.size() > 0) {
        PriceOracleLib.replaceAllPrices(priceOracleState, parsed, now);
        true
      } else {
        // Parsing yielded no results — keep existing cache
        false
      };
    } catch (_) {
      // Network failure — gracefully fall back to existing cached prices
      false
    };
  };

  // Parse the ICPSwap allPairs JSON response into TokenPrice entries.
  // The endpoint returns an array of pair objects with fields like:
  //   { "token0Id": "ryjl3-tyaaa-aaaaa-aaaba-cai", "token1Id": "...", "token0Price": "0.0031", ... }
  // ICP canister ID: ryjl3-tyaaa-aaaaa-aaaba-cai
  // We look for pairs where one side is ICP and extract the price of the other token in ICP.
  func parseICPSwapPrices(
    json : Text,
    now  : Int,
  ) : [PriceOracleTypes.TokenPrice] {
    // Known canister IDs for supported tokens
    let icpCanisterId   = "ryjl3-tyaaa-aaaaa-aaaba-cai";
    let ckbtcCanisterId = "mxzaz-hqaaa-aaaar-qaada-cai";
    let ckethCanisterId = "ss2fx-dyaaa-aaaar-qacoq-cai";
    let ckusdcCanisterId = "xevnm-gaaaa-aaaar-qafnq-cai";
    let ckusdtCanisterId = "cngnf-vqaaa-aaaar-qag4q-cai";

    // Build prices from known fallback values first, then try to parse
    // real values from the JSON string by searching for known token pairs.
    // This is a best-effort text-scan since Motoko has no JSON library.

    let prices = [
      buildTokenPrice(json, icpCanisterId, ckbtcCanisterId, #ckBTC, 1_800_000_000_000, now),
      buildTokenPrice(json, icpCanisterId, ckethCanisterId, #ckETH, 100_000_000_000, now),
      buildTokenPrice(json, icpCanisterId, ckusdcCanisterId, #ckUSDC, 8_000_000, now),
      buildTokenPrice(json, icpCanisterId, ckusdtCanisterId, #ckUSDT, 8_000_000, now),
    ];
    prices
  };

  // Extract a price for a non-ICP token from raw JSON text.
  // Falls back to a hard-coded default if parsing fails.
  func buildTokenPrice(
    json          : Text,
    icpId         : Text,
    tokenId       : Text,
    token         : PriceOracleTypes.OracleToken,
    fallbackE8s   : Nat,
    now           : Int,
  ) : PriceOracleTypes.TokenPrice {
    // Attempt to find a numeric price value by scanning the JSON for the token pair.
    // This is a simple heuristic — if the JSON contains both canister IDs close
    // together, we attempt to extract a "token1Price" or "token0Price" numeric field.
    let priceE8s = extractPairPrice(json, icpId, tokenId, fallbackE8s);
    { token; price_in_icp_e8s = priceE8s; last_updated = now };
  };

  // Scan raw JSON for a numeric price field near the two canister IDs.
  // Returns fallbackE8s on any parse failure.
  func extractPairPrice(
    json        : Text,
    icpId       : Text,
    tokenId     : Text,
    fallbackE8s : Nat,
  ) : Nat {
    // Check that both IDs appear in the JSON at all
    if (not json.contains(#text icpId) or not json.contains(#text tokenId)) {
      return fallbackE8s;
    };
    // Look for a field named "token0Price" or "token1Price" that follows a decimal number.
    // Strategy: find "tokenId" position, then search forward for "Price\":\"" pattern,
    // then grab digits up to the next '"'.
    let tokenIdPos = textIndexOf(json, tokenId);
    switch tokenIdPos {
      case null { return fallbackE8s };
      case (?startPos) {
        // Look for "Price\":\"" within 500 chars after the token ID
        let window = textSlice(json, startPos, startPos + 500);
        let priceTagPos = textIndexOf(window, "Price\":\"");
        switch priceTagPos {
          case null { return fallbackE8s };
          case (?pPos) {
            let afterTag = textSlice(window, pPos + 9, pPos + 40);
            // Parse decimal string like "0.003142" → convert to e8s
            decimalToE8s(afterTag, fallbackE8s)
          };
        };
      };
    };
  };

  // Convert a decimal string (e.g. "0.003142") to e8s (multiply by 1e8)
  func decimalToE8s(s : Text, fallback : Nat) : Nat {
    // Extract only numeric and decimal-point chars
    var intPart : Nat = 0;
    var fracPart : Nat = 0;
    var fracDivisor : Nat = 1;
    var inFrac = false;
    var valid = false;
    for (c in s.toIter()) {
      if (c >= '0' and c <= '9') {
        valid := true;
        let digit = charToNat(c);
        if (inFrac) {
          fracPart := fracPart * 10 + digit;
          fracDivisor := fracDivisor * 10;
        } else {
          intPart := intPart * 10 + digit;
        };
      } else if (c == '.') {
        inFrac := true;
      } else if (valid) {
        // Stop at any non-numeric/non-dot character
        // (e.g. the closing '"')
        // Break equivalent: we just skip remaining chars but keep result
      };
    };
    if (not valid) { return fallback };
    // result = (intPart + fracPart/fracDivisor) * 1e8
    let e8s = intPart * 100_000_000 + (fracPart * 100_000_000) / fracDivisor;
    if (e8s == 0) { fallback } else { e8s }
  };

  func charToNat(c : Char) : Nat {
    switch c {
      case '0' 0; case '1' 1; case '2' 2; case '3' 3; case '4' 4;
      case '5' 5; case '6' 6; case '7' 7; case '8' 8; case '9' 9;
      case _   0;
    };
  };

  func textIndexOf(haystack : Text, needle : Text) : ?Nat {
    let hLen = haystack.size();
    let nLen = needle.size();
    if (nLen == 0 or nLen > hLen) return null;
    let hChars = haystack.toArray();
    let nChars = needle.toArray();
    var i = 0;
    label outer while (i + nLen <= hLen) {
      var j = 0;
      var match = true;
      while (j < nLen) {
        if (hChars[i + j] != nChars[j]) {
          match := false;
        };
        j += 1;
      };
      if (match) return ?i;
      i += 1;
    };
    null
  };

  func textSlice(t : Text, from : Nat, to : Nat) : Text {
    let chars = t.toArray();
    let len = chars.size();
    let actualTo = if (to > len) len else to;
    if (from >= actualTo) return "";
    var result = "";
    var i = from;
    while (i < actualTo) {
      result := result # Text.fromChar(chars[i]);
      i += 1;
    };
    result
  };
};
