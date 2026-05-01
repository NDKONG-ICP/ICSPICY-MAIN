import Common "common";

module {
  // Supported tokens for price data
  public type OracleToken = {
    #ICP;
    #ckBTC;
    #ckETH;
    #ckUSDC;
    #ckUSDT;
  };

  // A single token price snapshot fetched from ICPSwap
  public type TokenPrice = {
    token             : OracleToken;
    price_in_icp_e8s  : Nat;        // how many ICP e8s equal 1 unit of this token
    last_updated      : Common.Timestamp;
  };

  // Membership base price constant — 25 ICP in e8s
  public let MEMBERSHIP_BASE_PRICE_E8S : Nat = 2_500_000_000; // 25 * 1e8

  // Full oracle state persisted in the canister
  public type PriceOracleState = {
    var prices           : [TokenPrice];  // snapshot array, replaced on each refresh
    var last_full_refresh : Common.Timestamp;
  };
};
