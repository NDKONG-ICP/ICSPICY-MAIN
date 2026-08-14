// lib/weather-cert.mo — certified weather reads via shared CertTree store.

import Blob "mo:core/Blob";
import Float "mo:core/Float";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Sha256 "mo:sha2/Sha256";
import Cert "../lib/cert";
import CertTree "mo:ic-certification/CertTree";
import Types "../types/weather-hub";

module {
  public func outlookPath(gridKey : Text) : Cert.Path {
    [Text.encodeUtf8("weather"), Text.encodeUtf8("outlook"), Text.encodeUtf8(gridKey)];
  };

  public func tropicalPath() : Cert.Path {
    [Text.encodeUtf8("weather"), Text.encodeUtf8("tropical")];
  };

  public func nwsPath() : Cert.Path {
    [Text.encodeUtf8("weather"), Text.encodeUtf8("nws")];
  };

  public func almanacPath(dateKey : Text) : Cert.Path {
    [Text.encodeUtf8("weather"), Text.encodeUtf8("almanac"), Text.encodeUtf8(dateKey)];
  };

  let HEX : [Text] = [
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f",
  ];

  func hexDigit(n : Nat) : Text {
    if (n < HEX.size()) HEX[n] else "0";
  };

  func digestHex(parts : [Text]) : Text {
    var joined = "";
    var i = 0;
    for (p in parts.vals()) {
      if (i > 0) joined #= "|";
      joined #= p;
      i += 1;
    };
    let hash = Sha256.fromBlob(#sha256, Text.encodeUtf8(joined));
    let bytes = Blob.toArray(hash);
    var hex = "";
    for (b in bytes.vals()) {
      let n = Nat8.toNat(b);
      hex #= hexDigit(n / 16) # hexDigit(n % 16);
    };
    hex;
  };

  public func outlookDigest(o : Types.WeatherOutlook) : Text {
    digestHex([
      o.gridKey,
      Int.toText(o.fetchedAt),
      o.source,
      Nat.toText(o.daily.size()),
      Float.toText(o.lat),
      Float.toText(o.lng),
    ]);
  };

  public func tropicalDigest(s : Types.TropicalSummary) : Text {
    digestHex([
      Int.toText(s.fetchedAt),
      s.dataSource,
      Nat.toText(s.storms.size()),
      if (s.seasonActive) "1" else "0",
    ]);
  };

  public func nwsDigest(fetchedAt : Int, alertCount : Nat) : Text {
    digestHex([Int.toText(fetchedAt), Nat.toText(alertCount), "nws-fl"]);
  };

  public func almanacDigest(a : Types.DailyAlmanac) : Text {
    digestHex([
      a.dateKey,
      Int.toText(a.publishedAt),
      a.title,
      if (a.retracted) "1" else "0",
    ]);
  };

  public func putDigest(store : Cert.Store, path : Cert.Path, digestHex : Text) {
    CertTree.Ops(store).put(path, Text.encodeUtf8(digestHex));
  };

  public func witness(store : Cert.Store, path : Cert.Path) : Blob {
    let ops = CertTree.Ops(store);
    ops.encodeWitness(ops.reveal(path));
  };

  public func refreshCertifiedRoot(store : Cert.Store) {
    Cert.setCertifiedData(store);
  };
};
