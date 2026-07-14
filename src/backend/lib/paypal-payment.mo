// lib/paypal-payment.mo — PayPal Orders v2 verify/capture helpers (HTTPS outcalls from mixins).

import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Nat32 "mo:core/Nat32";
import Result "mo:core/Result";
import Text "mo:core/Text";
import ICRC7 "../types/icrc7";
import JsonMini "json-mini";

module {
  public type PayPalConfig = {
    clientId : Text;
    clientSecret : Text;
    sandbox : Bool;
  };

  public type VerifiedOrder = {
    paypalOrderId : Text;
    customId : Text;
    amountCents : Nat;
    currency : Text;
  };

  func apiHost(sandbox : Bool) : Text {
    if (sandbox) "https://api-m.sandbox.paypal.com" else "https://api-m.paypal.com";
  };

  func b64Char(n : Nat) : Char {
    switch (n) {
      case (0) 'A'; case (1) 'B'; case (2) 'C'; case (3) 'D'; case (4) 'E';
      case (5) 'F'; case (6) 'G'; case (7) 'H'; case (8) 'I'; case (9) 'J';
      case (10) 'K'; case (11) 'L'; case (12) 'M'; case (13) 'N'; case (14) 'O';
      case (15) 'P'; case (16) 'Q'; case (17) 'R'; case (18) 'S'; case (19) 'T';
      case (20) 'U'; case (21) 'V'; case (22) 'W'; case (23) 'X'; case (24) 'Y';
      case (25) 'Z'; case (26) 'a'; case (27) 'b'; case (28) 'c'; case (29) 'd';
      case (30) 'e'; case (31) 'f'; case (32) 'g'; case (33) 'h'; case (34) 'i';
      case (35) 'j'; case (36) 'k'; case (37) 'l'; case (38) 'm'; case (39) 'n';
      case (40) 'o'; case (41) 'p'; case (42) 'q'; case (43) 'r'; case (44) 's';
      case (45) 't'; case (46) 'u'; case (47) 'v'; case (48) 'w'; case (49) 'x';
      case (50) 'y'; case (51) 'z'; case (52) '0'; case (53) '1'; case (54) '2';
      case (55) '3'; case (56) '4'; case (57) '5'; case (58) '6'; case (59) '7';
      case (60) '8'; case (61) '9'; case (62) '+'; case (_) '/';
    };
  };

  public func base64Encode(bytes : [Nat8]) : Text {
    if (bytes.size() == 0) return "";
    var out = "";
    var i = 0;
    while (i < bytes.size()) {
      let b0 = Nat8.toNat(bytes[i]);
      let b1 = if (i + 1 < bytes.size()) Nat8.toNat(bytes[i + 1]) else 0;
      let b2 = if (i + 2 < bytes.size()) Nat8.toNat(bytes[i + 2]) else 0;
      let n = (Nat32.fromNat(b0) << 16) | (Nat32.fromNat(b1) << 8) | Nat32.fromNat(b2);
      out #= Char.toText(b64Char(Nat32.toNat((n >> 18) & 63)));
      out #= Char.toText(b64Char(Nat32.toNat((n >> 12) & 63)));
      out #= if (i + 1 < bytes.size()) Char.toText(b64Char(Nat32.toNat((n >> 6) & 63))) else "=";
      out #= if (i + 2 < bytes.size()) Char.toText(b64Char(Nat32.toNat(n & 63))) else "=";
      i += 3;
    };
    out;
  };

  public func basicAuthHeader(clientId : Text, clientSecret : Text) : Text {
    let creds = clientId # ":" # clientSecret;
    "Basic " # base64Encode(Blob.toArray(creds.encodeUtf8()));
  };

  func getTextField(entries : [(Text, ICRC7.Value)], key : Text) : ?Text {
    for ((k, v) in entries.vals()) {
      if (k == key) {
        switch v {
          case (#Text t) return ?t;
          case _ return null;
        };
      };
    };
    null;
  };

  func findMapField(entries : [(Text, ICRC7.Value)], key : Text) : ?[(Text, ICRC7.Value)] {
    for ((k, v) in entries.vals()) {
      if (k == key) {
        switch v {
          case (#Map m) return ?m;
          case _ return null;
        };
      };
    };
    null;
  };

  func findArrayField(entries : [(Text, ICRC7.Value)], key : Text) : ?[ICRC7.Value] {
    for ((k, v) in entries.vals()) {
      if (k == key) {
        switch v {
          case (#Array a) return ?a;
          case _ return null;
        };
      };
    };
    null;
  };

  /// Parse "250.00" USD string to cents (25000).
  public func parseUsdToCents(value : Text) : ?Nat {
    let t = Text.trim(value, #char ' ');
    if (t.size() == 0) return null;
    var whole = "";
    var frac = "";
    var partIdx = 0;
    for (part in Text.split(t, #char '.')) {
      if (partIdx == 0) { whole := part }
      else if (partIdx == 1) { frac := part };
      partIdx += 1;
    };
    if (partIdx == 0) return null;
    let w = switch (Nat.fromText(whole)) { case null return null; case (?n) n };
    if (frac.size() == 0) return ?(w * 100);
    let frac2 = if (frac.size() >= 2) {
      var s = "";
      var i = 0;
      for (ch in frac.chars()) {
        if (i < 2) { s #= Char.toText(ch) };
        i += 1;
      };
      s;
    } else {
      frac # "0";
    };
    let f = switch (Nat.fromText(frac2)) { case null return null; case (?n) n };
    ?(w * 100 + f);
  };

  func _centsToUsdString(cents : Nat) : Text {
    let dollars = cents / 100;
    let rem = cents % 100;
    Nat.toText(dollars) # "." #
      (if (rem < 10) "0" else "") # Nat.toText(rem);
  };

  public func customIdOrder(orderId : Nat) : Text {
    "icspicy:order:" # Nat.toText(orderId);
  };

  public func customIdPlant(plantId : Nat) : Text {
    "icspicy:plant:" # Nat.toText(plantId);
  };

  public func customIdCoop(tokenId : Nat) : Text {
    "icspicy:coop:" # Nat.toText(tokenId);
  };

  public let CUSTOM_ID_PEPPERHEAD : Text = "icspicy:pepperhead";

  public func amountMatchesCents(value : Text, expectedCents : Nat) : Bool {
    switch (parseUsdToCents(value)) {
      case null false;
      case (?c) c == expectedCents;
    };
  };

  /// Parse flattened JSON from paypalTransform (id, status, custom_id, amount).
  func parseFromTransformSubset(
    entries : [(Text, ICRC7.Value)],
    paypalOrderId : Text,
  ) : ?VerifiedOrder {
    switch (getTextField(entries, "custom_id")) {
      case null null;
      case (?customId) {
        switch (getTextField(entries, "amount")) {
          case null null;
          case (?amountStr) {
            switch (parseUsdToCents(amountStr)) {
              case null null;
              case (?amountCents) {
                ?{
                  paypalOrderId;
                  customId;
                  amountCents;
                  currency = "USD";
                };
              };
            };
          };
        };
      };
    };
  };

  /// Extract verification fields from PayPal order JSON (post-capture).
  public func parseOrderVerification(body : Blob) : Result.Result<VerifiedOrder, Text> {
    let entries = switch (JsonMini.parse(body)) {
      case (#err(e)) return #err("PayPal JSON parse: " # e);
      case (#ok(#Map(m))) m;
      case (#ok(_)) return #err("PayPal response: expected object");
    };
    let paypalOrderId = switch (getTextField(entries, "id")) {
      case null return #err("PayPal missing order id");
      case (?t) t;
    };
    let orderStatus = switch (getTextField(entries, "status")) {
      case null return #err("PayPal missing status");
      case (?t) t;
    };
    if (orderStatus != "COMPLETED" and orderStatus != "APPROVED") {
      return #err("PayPal order status: " # orderStatus);
    };
    switch (parseFromTransformSubset(entries, paypalOrderId)) {
      case (?verified) return #ok(verified);
      case null {};
    };
    let units = switch (findArrayField(entries, "purchase_units")) {
      case null return #err("PayPal missing purchase_units");
      case (?a) a;
    };
    if (units.size() == 0) return #err("PayPal empty purchase_units");
    let unit = switch (units[0]) {
      case (#Map(m)) m;
      case _ return #err("PayPal purchase_unit malformed");
    };
    let customId = switch (getTextField(unit, "custom_id")) {
      case null return #err("PayPal missing custom_id");
      case (?t) t;
    };
    var amountCents : Nat = 0;
    var currency = "USD";
    label amountSearch {
      switch (findMapField(unit, "payments")) {
        case null {};
        case (?payments) {
          switch (findArrayField(payments, "captures")) {
            case null {};
            case (?captures) {
              if (captures.size() > 0) {
                switch (captures[0]) {
                  case (#Map(cap)) {
                    let capStatus = switch (getTextField(cap, "status")) {
                      case null return #err("PayPal capture missing status");
                      case (?t) t;
                    };
                    if (capStatus != "COMPLETED") {
                      return #err("PayPal capture status: " # capStatus);
                    };
                    switch (findMapField(cap, "amount")) {
                      case null return #err("PayPal capture missing amount");
                      case (?amt) {
                        currency := switch (getTextField(amt, "currency_code")) {
                          case null "USD";
                          case (?c) c;
                        };
                        let val = switch (getTextField(amt, "value")) {
                          case null return #err("PayPal capture missing value");
                          case (?v) v;
                        };
                        amountCents := switch (parseUsdToCents(val)) {
                          case null return #err("PayPal invalid amount: " # val);
                          case (?c) c;
                        };
                        break amountSearch;
                      };
                    };
                  };
                  case _ return #err("PayPal capture malformed");
                };
              };
            };
          };
        };
      };
      switch (findMapField(unit, "amount")) {
        case null return #err("PayPal missing amount");
        case (?amt) {
          currency := switch (getTextField(amt, "currency_code")) {
            case null "USD";
            case (?c) c;
          };
          let val = switch (getTextField(amt, "value")) {
            case null return #err("PayPal amount missing value");
            case (?v) v;
          };
          amountCents := switch (parseUsdToCents(val)) {
            case null return #err("PayPal invalid amount: " # val);
            case (?c) c;
          };
        };
      };
    };
    if (currency != "USD") return #err("PayPal currency must be USD");
    #ok({ paypalOrderId; customId; amountCents; currency });
  };

  public func verifyExpected(
    verified : VerifiedOrder,
    expectedCents : Nat,
    expectedCustomId : Text,
  ) : Result.Result<(), Text> {
    if (verified.customId != expectedCustomId) {
      return #err("PayPal custom_id mismatch");
    };
    if (verified.amountCents != expectedCents) {
      return #err("PayPal amount mismatch");
    };
    #ok(());
  };

  public func oauthTokenUrl(sandbox : Bool) : Text {
    apiHost(sandbox) # "/v1/oauth2/token";
  };

  public func orderUrl(sandbox : Bool, paypalOrderId : Text) : Text {
    apiHost(sandbox) # "/v2/checkout/orders/" # paypalOrderId;
  };

  public func captureUrl(sandbox : Bool, paypalOrderId : Text) : Text {
    apiHost(sandbox) # "/v2/checkout/orders/" # paypalOrderId # "/capture";
  };

  /// Parse OAuth token response body for access_token.
  public func parseAccessToken(body : Blob) : Result.Result<Text, Text> {
    switch (JsonMini.parse(body)) {
      case (#err(e)) return #err("PayPal OAuth parse: " # e);
      case (#ok(#Map(entries))) {
        switch (getTextField(entries, "access_token")) {
          case null #err("PayPal OAuth missing access_token");
          case (?t) #ok(t);
        };
      };
      case (#ok(_)) #err("PayPal OAuth: expected object");
    };
  };

  /// Deterministic transform body for order GET/capture responses.
  public func buildDeterministicOrderBody(
    id : Text,
    status : Text,
    customId : Text,
    amount : Text,
  ) : Blob {
    func esc(t : Text) : Text {
      Text.foldLeft(t, "", func(acc, ch) {
        if (ch == '\\') acc # "\\\\"
        else if (Char.toNat32(ch) == 34) acc # "\\\""
        else acc # Char.toText(ch);
      });
    };
    (
      "{\"id\":\"" # esc(id) #
        "\",\"status\":\"" # esc(status) #
        "\",\"custom_id\":\"" # esc(customId) #
        "\",\"amount\":\"" # esc(amount) #
        "\"}"
    ).encodeUtf8();
  };

  /// Walk parsed PayPal order map and emit deterministic subset for consensus.
  public func absorbOrderFields(entries : [(Text, ICRC7.Value)], out : {
    var id : Text;
    var status : Text;
    var customId : Text;
    var amount : Text;
  }) {
    switch (getTextField(entries, "id")) { case (?t) out.id := t; case null {} };
    switch (getTextField(entries, "status")) { case (?t) out.status := t; case null {} };
    switch (findArrayField(entries, "purchase_units")) {
      case null {};
      case (?units) {
        if (units.size() > 0) {
          switch (units[0]) {
            case (#Map(unit)) {
              switch (getTextField(unit, "custom_id")) {
                case (?t) out.customId := t;
                case null {};
              };
              switch (findMapField(unit, "payments")) {
                case null {};
                case (?payments) {
                  switch (findArrayField(payments, "captures")) {
                    case null {};
                    case (?caps) {
                      if (caps.size() > 0) {
                        switch (caps[0]) {
                          case (#Map(cap)) {
                            switch (findMapField(cap, "amount")) {
                              case null {};
                              case (?amt) {
                                switch (getTextField(amt, "value")) {
                                  case (?v) out.amount := v;
                                  case null {};
                                };
                              };
                            };
                            switch (getTextField(cap, "status")) {
                              case (?t) out.status := t;
                              case null {};
                            };
                          };
                          case _ {};
                        };
                      };
                    };
                  };
                };
              };
              if (out.amount.size() == 0) {
                switch (findMapField(unit, "amount")) {
                  case null {};
                  case (?amt) {
                    switch (getTextField(amt, "value")) {
                      case (?v) out.amount := v;
                      case null {};
                    };
                  };
                };
              };
            };
            case _ {};
          };
        };
      };
    };
  };
};
