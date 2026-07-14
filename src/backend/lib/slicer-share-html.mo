/// Static HTML for /s/slicer/{principal} — crawler-friendly OG tags at share time.
import Char "mo:core/Char";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import Text "mo:core/Text";

module {
  public type TierSlug = {
    #mild;
    #craft;
    #reserve;
    #legendary;
  };

  let SITE_ORIGIN : Text = "https://www.icspicy.app";

  public func tierFromScore(score : Nat) : TierSlug {
    if (score >= 100_000) return #legendary;
    if (score >= 50_000) return #reserve;
    if (score >= 10_000) return #craft;
    #mild;
  };

  public func tierSlugText(tier : TierSlug) : Text {
    switch (tier) {
      case (#mild) "mild";
      case (#craft) "craft";
      case (#reserve) "reserve";
      case (#legendary) "legendary";
    };
  };

  public func formatScore(score : Nat) : Text {
    Nat.toText(score);
  };

  public func taunt(score : Nat, tier : TierSlug) : Text {
    let s = formatScore(score);
    switch (tier) {
      case (#mild) {
        "Step right up — " # s # " SHU and climbing. Bet you can't beat it.";
      };
      case (#craft) {
        s # " SHU — Craft Batch certified. Replay-validated on the Internet Computer. Screenshots don't count here.";
      };
      case (#reserve) {
        s # " SHU Reserve Batch. The chain remembers — do you?";
      };
      case (#legendary) {
        s # " SHU LEGENDARY. Verified on-chain. No screenshots. No excuses. Just heat.";
      };
    };
  };

  public func ogTitle(username : Text, score : Nat) : Text {
    "@" # username # " scored " # formatScore(score) # " SHU in ICSPICY Slicer 🔥";
  };

  func escapeHtml(text : Text) : Text {
    var out : Text = "";
    for (c in text.chars()) {
      if (c == '&') { out := out # "&amp;" }
      else if (c == '<') { out := out # "&lt;" }
      else if (c == '>') { out := out # "&gt;" }
      else { out := out # Char.toText(c) };
    };
    out;
  };

  public func shareUrl(principalText : Text, lastPlayedNs : Nat) : Text {
    SITE_ORIGIN # "/s/slicer/" # principalText # "?v=" # Nat.toText(lastPlayedNs);
  };

  public func assetPath(principalText : Text) : Text {
    "s/slicer/" # principalText # "/index.html";
  };

  public func shareOgAssetPath(principalText : Text) : Text {
    "slicer-share-og/" # principalText # ".png";
  };

  public func shareOgPublicUrl(uploadsCanisterId : Text, principalText : Text) : Text {
    "https://" # uploadsCanisterId # ".raw.icp0.io/" # shareOgAssetPath(principalText);
  };

  public func tierOgImageUrl(tierSlug : Text) : Text {
    SITE_ORIGIN # "/og/slicer/" # tierSlug # ".png";
  };

  public func resolveOgImageUrl(tierSlug : Text, customUrl : ?Text) : Text {
    switch (customUrl) {
      case (?url) {
        if (Text.size(url) > 0 and Text.startsWith(url, #text "https://")) {
          url;
        } else {
          tierOgImageUrl(tierSlug);
        };
      };
      case null tierOgImageUrl(tierSlug);
    };
  };

  let maxPublishHtmlBytes : Nat = 250_000;

  /// Client-built SPA shell (current dist/index.html + injected OG meta).
  public func validatePublishHtml(html : Text) : ?Text {
    if (Text.size(html) == 0) {
      return ?"HTML payload required";
    };
    if (Text.size(html) > maxPublishHtmlBytes) {
      return ?"HTML payload too large";
    };
    if (not Text.contains(html, #text "<div id=\"root\">")) {
      return ?"Missing SPA root mount";
    };
    if (not Text.contains(html, #text "type=\"module\"")) {
      return ?"Missing SPA module script";
    };
    if (not Text.contains(html, #text "/assets/")) {
      return ?"Missing hashed asset references";
    };
    if (not Text.contains(html, #text "property=\"og:image\"")) {
      return ?"Missing og:image meta tag";
    };
    null;
  };

  public func displayUsername(profileUsername : Text, principal : Principal) : Text {
    if (profileUsername != "") return profileUsername;
    let t = principal.toText();
    if (t.size() >= 12) {
      Text.fromIter(Iter.take(t.chars(), 12));
    } else {
      t;
    };
  };

  public func lastPlayedNs(lastPlayed : Int) : Nat {
    Int.abs(lastPlayed);
  };
};
