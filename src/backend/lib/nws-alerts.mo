/// NWS official alerts ingest (api.weather.gov) for Florida + national hazards.

import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Result "mo:core/Result";
import Text "mo:core/Text";
import Hub "../types/weather-hub";
import ICRC7 "../types/icrc7";
import JsonMini "json-mini";

module {
  public let NWS_ALERTS_FL_URL : Text =
    "https://api.weather.gov/alerts/active?area=FL";

  public let NWS_ALERTS_US_URL : Text =
    "https://api.weather.gov/alerts/active?status=actual&message_type=alert";

  public func canonicalAlertsBody(body : Blob) : Blob {
    switch (JsonMini.parse(body)) {
      case (#err(e)) {
        Text.encodeUtf8("{\"features\":[],\"err\":\"" # jsonEscape(e) # "\"}");
      };
      case (#ok(#Map(root))) {
        switch (mapField(root, "features")) {
          case (?#Array(arr)) {
            var parts : [Text] = [];
            var i : Nat = 0;
            let n = if (arr.size() > 30) 30 else arr.size();
            while (i < n) {
              switch (arr[i]) {
                case (#Map(f)) {
                  switch (compactAlert(f)) {
                    case (?obj) parts := Array.concat(parts, [obj]);
                    case null {};
                  };
                };
                case _ {};
              };
              i += 1;
            };
            var joined = "";
            var j : Nat = 0;
            while (j < parts.size()) {
              if (j > 0) { joined := joined # "," };
              joined := joined # parts[j];
              j += 1;
            };
            Text.encodeUtf8("{\"features\":[" # joined # "]}");
          };
          case _ Text.encodeUtf8("{\"features\":[],\"err\":\"no_features\"}");
        };
      };
      case (#ok(_)) Text.encodeUtf8("{\"features\":[],\"err\":\"not_object\"}");
    };
  };

  func compactAlert(f : [(Text, ICRC7.Value)]) : ?Text {
    switch (mapField(f, "properties")) {
      case (?#Map(p)) {
        let event = textOrEmpty(p, "event");
        if (event.size() == 0) return null;
        let headline = textOrEmpty(p, "headline");
        let desc = truncate(textOrEmpty(p, "description"), 280);
        let sev = textOrEmpty(p, "severity");
        ?("{"
          # "\"event\":\"" # jsonEscape(event) # "\","
          # "\"headline\":\"" # jsonEscape(headline) # "\","
          # "\"description\":\"" # jsonEscape(desc) # "\","
          # "\"severity\":\"" # jsonEscape(sev) # "\""
          # "}");
      };
      case _ null;
    };
  };

  public func parseAlerts(body : Blob, now : Int, gridKey : Text) : [Hub.WeatherAlert] {
    switch (JsonMini.parse(body)) {
      case (#err(_)) [];
      case (#ok(#Map(root))) {
        let arr = switch (mapField(root, "features")) {
          case (?#Array(a)) a;
          case _ return [];
        };
        var out : [Hub.WeatherAlert] = [];
        var idx : Nat = 100;
        for (v in arr.vals()) {
          switch (v) {
            case (#Map(f)) {
              switch (mapField(f, "properties")) {
                case (?#Map(p)) {
                  let event = textOrEmpty(p, "event");
                  if (event.size() == 0) continue;
                  let headline = textOrEmpty(p, "headline");
                  let desc = truncate(textOrEmpty(p, "description"), 320);
                  let sevText = textOrEmpty(p, "severity");
                  let sev = if (Text.contains(sevText, #text "Extreme") or Text.contains(sevText, #text "Severe")) {
                    #warning;
                  } else if (Text.contains(sevText, #text "Moderate")) {
                    #watch;
                  } else {
                    #info;
                  };
                  out := Array.concat(out, [{
                    id = idx;
                    kind = #nwsOfficial;
                    title = if (headline.size() > 0) headline else event;
                    body = if (desc.size() > 0) desc else event;
                    severity = sev;
                    createdAt = now;
                    expiresAt = now + 86_400_000_000_000;
                    gridKey;
                  }]);
                  idx += 1;
                };
                case _ {};
              };
            };
            case _ {};
          };
        };
        out;
      };
      case (#ok(_)) [];
    };
  };

  func truncate(t : Text, max : Nat) : Text {
    if (t.size() <= max) t else {
      var out = "";
      var n : Nat = 0;
      for (c in t.toIter()) {
        if (n >= max) return out # "…";
        out := out # Text.fromChar(c);
        n += 1;
      };
      out;
    };
  };

  func mapField(entries : [(Text, ICRC7.Value)], key : Text) : ?ICRC7.Value {
    for ((k, v) in entries.vals()) {
      if (k == key) return ?v;
    };
    null;
  };

  func textOrEmpty(entries : [(Text, ICRC7.Value)], key : Text) : Text {
    switch (mapField(entries, key)) {
      case (?#Text t) if (t == "null") "" else t;
      case _ "";
    };
  };

  func jsonEscape(t : Text) : Text {
    var out = "";
    for (c in t.toIter()) {
      if (c == '\"') { out := out # "\\\"" }
      else if (c == '\\') { out := out # "\\\\" }
      else if (c == '\n') { out := out # " " }
      else { out := out # Text.fromChar(c) };
    };
    out;
  };
};
