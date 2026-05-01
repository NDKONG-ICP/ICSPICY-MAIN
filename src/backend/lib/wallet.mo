import WalletTypes "../types/wallet";
import Map "mo:core/Map";
import List "mo:core/List";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";

module {
  // Default simulated balances (realistic values):
  //   ICP  ~12.50  ICP  = 1_250_000_000 e8s
  //   ckBTC ~0.0025 BTC = 250_000 satoshis
  //   ckETH ~0.15  ETH  = 150_000_000_000_000 wei (1e14)
  //   ckUSDC ~45.00 USDC = 45_000_000 micro-USDC
  //   ckUSDT ~45.00 USDT = 45_000_000 micro-USDT
  let DEFAULT_ICP   : Nat = 1_250_000_000;
  let DEFAULT_CKBTC : Nat = 250_000;
  let DEFAULT_CKETH : Nat = 150_000_000_000_000;
  let DEFAULT_CKUSDC: Nat = 45_000_000;
  let DEFAULT_CKUSDT: Nat = 45_000_000;

  // Approximate USD prices (simulated)
  let PRICE_ICP   : Float = 12.50;
  let PRICE_CKBTC : Float = 65_000.00;
  let PRICE_CKETH : Float = 3_200.00;
  let PRICE_CKUSDC: Float = 1.00;
  let PRICE_CKUSDT: Float = 1.00;

  public func initWallet() : WalletTypes.WalletState {
    {
      var icp    = DEFAULT_ICP;
      var ckbtc  = DEFAULT_CKBTC;
      var cketh  = DEFAULT_CKETH;
      var ckusdc = DEFAULT_CKUSDC;
      var ckusdt = DEFAULT_CKUSDT;
    };
  };

  public func getBalances(state : WalletTypes.WalletState) : [WalletTypes.WalletToken] {
    let icpBalance   = state.icp.toFloat() / 100_000_000.0;
    let ckbtcBalance = state.ckbtc.toFloat() / 100_000_000.0;
    let ckethBalance = state.cketh.toFloat() / 1_000_000_000_000_000_000.0;
    let ckusdcBalance= state.ckusdc.toFloat() / 1_000_000.0;
    let ckusdtBalance= state.ckusdt.toFloat() / 1_000_000.0;
    [
      {
        symbol   = "ICP";
        name     = "Internet Computer";
        balance  = state.icp;
        decimals = 8;
        usdValue = icpBalance * PRICE_ICP;
      },
      {
        symbol   = "ckBTC";
        name     = "Chain-Key Bitcoin";
        balance  = state.ckbtc;
        decimals = 8;
        usdValue = ckbtcBalance * PRICE_CKBTC;
      },
      {
        symbol   = "ckETH";
        name     = "Chain-Key Ethereum";
        balance  = state.cketh;
        decimals = 18;
        usdValue = ckethBalance * PRICE_CKETH;
      },
      {
        symbol   = "ckUSDC";
        name     = "Chain-Key USD Coin";
        balance  = state.ckusdc;
        decimals = 6;
        usdValue = ckusdcBalance * PRICE_CKUSDC;
      },
      {
        symbol   = "ckUSDT";
        name     = "Chain-Key Tether";
        balance  = state.ckusdt;
        decimals = 6;
        usdValue = ckusdtBalance * PRICE_CKUSDT;
      },
    ];
  };

  func balanceFor(state : WalletTypes.WalletState, symbol : Text) : Nat {
    if (symbol == "ICP")         { state.icp }
    else if (symbol == "ckBTC")  { state.ckbtc }
    else if (symbol == "ckETH")  { state.cketh }
    else if (symbol == "ckUSDC") { state.ckusdc }
    else if (symbol == "ckUSDT") { state.ckusdt }
    else { Runtime.trap("Unknown token: " # symbol) };
  };

  func setBalance(state : WalletTypes.WalletState, symbol : Text, amount : Nat) {
    if (symbol == "ICP")         { state.icp    := amount }
    else if (symbol == "ckBTC")  { state.ckbtc  := amount }
    else if (symbol == "ckETH")  { state.cketh  := amount }
    else if (symbol == "ckUSDC") { state.ckusdc := amount }
    else if (symbol == "ckUSDT") { state.ckusdt := amount }
    else { Runtime.trap("Unknown token: " # symbol) };
  };

  public func send(
    wallets : Map.Map<Principal, WalletTypes.WalletState>,
    txLog   : List.List<WalletTypes.WalletTransaction>,
    caller  : Principal,
    input   : WalletTypes.SendTokenInput,
  ) : { #ok : Text; #err : Text } {
    if (input.amount == 0) {
      return #err("Amount must be greater than zero");
    };
    if (input.recipientAddress.isEmpty()) {
      return #err("Recipient address cannot be empty");
    };

    // Initialise sender wallet on first use
    let state = switch (wallets.get(caller)) {
      case (?s) { s };
      case null {
        let s = initWallet();
        wallets.add(caller, s);
        s;
      };
    };

    let current = balanceFor(state, input.tokenSymbol);
    if (input.amount > current) {
      return #err("Insufficient balance");
    };

    setBalance(state, input.tokenSymbol, current - input.amount);

    // Record transaction
    let txId = "tx-" # caller.toText() # "-" # Time.now().toText();
    let tx : WalletTypes.WalletTransaction = {
      id           = txId;
      tokenSymbol  = input.tokenSymbol;
      txType       = #send;
      amount       = input.amount;
      counterparty = input.recipientAddress;
      timestamp    = Time.now();
      status       = #completed;
    };
    txLog.add(tx);
    #ok(txId);
  };

  public func getTransactions(
    txLog  : List.List<WalletTypes.WalletTransaction>,
    caller : Principal,
  ) : [WalletTypes.WalletTransaction] {
    // Filter to caller's transactions (sent from or received by caller address)
    let callerText = caller.toText();
    let filtered = txLog.filter(func(tx : WalletTypes.WalletTransaction) : Bool {
      tx.counterparty == callerText or tx.id.contains(#text callerText)
    });
    // Return newest first — reverse the filtered list and take 20
    filtered.reverse().toArray().sliceToArray(0, 20);
  };
};
