import PriceOracleTypes "../types/price-oracle";
import Common "../types/common";
import Array "mo:core/Array";
import Nat "mo:core/Nat";

module {
  /// Return the cached ICP-equivalent price for a given token (in e8s).
  /// ICP always returns 1 ICP = 1e8 e8s (i.e., 100_000_000).
  /// Falls back to a safe default if no price is cached yet.
  public func getPriceInIcp(
    state : PriceOracleTypes.PriceOracleState,
    token : PriceOracleTypes.OracleToken,
  ) : Nat {
    switch (token) {
      case (#ICP) { 100_000_000 }; // 1 ICP = 1e8 e8s
      case _ {
        let tokenText = tokenToText(token);
        switch (state.prices.find(func p = tokenToText(p.token) == tokenText)) {
          case (?entry) { entry.price_in_icp_e8s };
          case null { defaultPrice(token) };
        };
      };
    };
  };

  /// Convert a token amount to its ICP equivalent using cached prices.
  public func toIcpEquivalent(
    state  : PriceOracleTypes.PriceOracleState,
    token  : PriceOracleTypes.OracleToken,
    amount : Nat,
  ) : Nat {
    let pricePerUnit = getPriceInIcp(state, token);
    // pricePerUnit is "how many ICP e8s equal 1 base unit of this token"
    // amount is in base units → result in ICP e8s
    (amount * pricePerUnit) / 100_000_000;
  };

  /// Convert USD cents to token base units using cached ICP cross-rates (via ckUSDC).
  public func usdCentsToTokenBase(
    state : PriceOracleTypes.PriceOracleState,
    token : PriceOracleTypes.OracleToken,
    cents : Nat,
  ) : Nat {
    switch (token) {
      case (#ckUSDC or #ckUSDT) {
        cents * 10_000;
      };
      case (_) {
        let icpPerUsdcBase = getPriceInIcp(state, #ckUSDC);
        if (icpPerUsdcBase == 0 or cents == 0) return 0;
        let icpE8sNeeded = cents * icpPerUsdcBase * 10_000;
        let tokenPricePerBase = getPriceInIcp(state, token);
        if (tokenPricePerBase == 0) return 0;
        (icpE8sNeeded * 100_000_000) / tokenPricePerBase;
      };
    };
  };

  /// Stablecoins: exact match. Volatile: amount >= expected * 95%.
  public func isPaymentAmountSufficient(
    state : PriceOracleTypes.PriceOracleState,
    token : PriceOracleTypes.OracleToken,
    cents : Nat,
    amount : Nat,
  ) : Bool {
    let expected = usdCentsToTokenBase(state, token, cents);
    switch (token) {
      case (#ckUSDC or #ckUSDT) amount == expected;
      case (_) {
        if (expected == 0) false else amount * 100 >= expected * 95;
      };
    };
  };

  /// Convert $25 USD (membership / PepperHead) to token base units.
  public func membershipPriceInToken(
    state : PriceOracleTypes.PriceOracleState,
    token : PriceOracleTypes.OracleToken,
  ) : Nat {
    usdCentsToTokenBase(state, token, 2500);
  };

  /// Update the cached price for a single token (called after HTTP outcall).
  public func updatePrice(
    state            : PriceOracleTypes.PriceOracleState,
    token            : PriceOracleTypes.OracleToken,
    price_in_icp_e8s : Nat,
    now              : Common.Timestamp,
  ) {
    let tokenText = tokenToText(token);
    let newEntry : PriceOracleTypes.TokenPrice = {
      token;
      price_in_icp_e8s;
      last_updated = now;
    };
    // Replace if exists, otherwise append
    let existing = state.prices.filter(func p = tokenToText(p.token) != tokenText);
    state.prices := existing.concat([newEntry]);
  };

  /// Replace the full price snapshot (called after a full refresh from ICPSwap).
  public func replaceAllPrices(
    state  : PriceOracleTypes.PriceOracleState,
    prices : [PriceOracleTypes.TokenPrice],
    now    : Common.Timestamp,
  ) {
    state.prices := prices;
    state.last_full_refresh := now;
  };

  /// Return all cached prices as an array.
  public func getAllPrices(
    state : PriceOracleTypes.PriceOracleState,
  ) : [PriceOracleTypes.TokenPrice] {
    state.prices
  };

  // ── helpers ──

  func tokenToText(token : PriceOracleTypes.OracleToken) : Text {
    switch (token) {
      case (#ICP)    "ICP";
      case (#ckBTC)  "ckBTC";
      case (#ckETH)  "ckETH";
      case (#ckUSDC) "ckUSDC";
      case (#ckUSDT) "ckUSDT";
    };
  };

  // Conservative hard-coded fallback prices (ICP e8s per 1 base unit).
  // These are only used if ICPSwap has never been queried yet.
  func defaultPrice(token : PriceOracleTypes.OracleToken) : Nat {
    switch (token) {
      case (#ICP)    { 100_000_000 };           // 1 ICP
      case (#ckBTC)  { 1_800_000_000_000 };     // ~18,000 ICP per BTC (fallback)
      case (#ckETH)  { 100_000_000_000 };       // ~1,000 ICP per ETH (fallback)
      case (#ckUSDC) { 8_000_000 };             // ~0.08 ICP per USDC (fallback)
      case (#ckUSDT) { 8_000_000 };             // ~0.08 ICP per USDT (fallback)
    };
  };
};
