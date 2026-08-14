// mixins/weather-hub-api.mo — Phase 1 Weather Desk on-chain outlook + zip geocode.

import Array "mo:core/Array";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat64 "mo:core/Nat64";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Error "mo:core/Error";
import Blob "mo:core/Blob";
import AccessControl "../lib/access-control";
import AuditLog "../lib/audit-log";
import RateLimit "../lib/rate-limit";
import RateLimits "../lib/rate-limits";
import WeatherProvenance "../lib/weather-provenance";
import WeatherGrid "../lib/weather-grid";
import WeatherAlerts "../lib/weather-alerts";
import TropicalDesk "../lib/tropical-desk";
import TropicalNoaa "../lib/tropical-noaa";
import NwsAlerts "../lib/nws-alerts";
import WeatherBrief "../lib/weather-brief";
import WeatherCert "../lib/weather-cert";
import WeatherSourceLedger "../lib/weather-source-ledger";
import CertifiedData "mo:core/CertifiedData";
import Cert "../lib/cert";
import Hub "../types/weather-hub";
import IC "ic:aaaaa-aa";

mixin (
  accessControlState : AccessControl.AccessControlState,
  agentPrincipalState : AccessControl.AgentPrincipalState,
  rateLimits : RateLimits.Bundle,
  weatherGridCache : Map.Map<Text, Hub.WeatherOutlook>,
  weatherGridAccess : Map.Map<Text, Int>,
  userWeatherLocations : Map.Map<Principal, Hub.WeatherLocation>,
  zipCoordCache : Map.Map<Text, Hub.ZipCoord>,
  auditLog : { var value : AuditLog.AuditLog },
  zipGeocodeBudget : { var windowStart : Int; var count : Nat },
  readTropicalSummary : () -> ?Hub.TropicalSummary,
  writeTropicalSummary : (?Hub.TropicalSummary) -> (),
  selfPrincipal : () -> Principal,
  certStore : Cert.Store,
  weatherSourceLedger : WeatherSourceLedger.Store,
  tropicalAdecks : Map.Map<Text, Hub.TropicalAdeck>,
  weatherModelGusts : Map.Map<Text, Hub.ModelGustSpread>,
) {
  let ZIP_GEOCODE_MAX_PER_HOUR : Nat = 60;
  let HOUR_NS : Int = 3_600_000_000_000;

  stable var lastHubWeatherError : Text = "";
  stable var lastTropicalError : Text = "";
  stable var nwsAlertsCache : [Hub.WeatherAlert] = [];
  stable var nwsAlertsFetchedAt : Int = 0;
  stable var dailyAlmanacCurrent : ?Hub.DailyAlmanac = null;
  stable var dailyAlmanacArchive : [Hub.DailyAlmanac] = [];

  /// Strict YYYY-MM-DD check for almanac date keys.
  func isValidDateKey(k : Text) : Bool {
    if (k.size() != 10) return false;
    var i = 0;
    for (c in k.chars()) {
      if (i == 4 or i == 7) {
        if (c != '-') return false;
      } else {
        if (c < '0' or c > '9') return false;
      };
      i += 1;
    };
    true;
  };

  func logWeatherAdmin(caller : Principal, action : Text, detail : Text) {
    auditLog.value := AuditLog.append(auditLog.value, {
      ts = Time.now();
      admin = caller;
      action;
      detail;
    });
  };

  func touchAccess(key : Text) {
    weatherGridAccess.add(key, Time.now());
  };

  func putOutlook(outlook : Hub.WeatherOutlook) {
    if (weatherGridCache.size() >= WeatherGrid.MAX_GRID_CELLS) {
      // Evict oldest access among non-nursery keys.
      let nursery = WeatherGrid.nurseryGridKey();
      var oldestKey : ?Text = null;
      var oldestAt : Int = Time.now();
      for ((k, at) in weatherGridAccess.entries()) {
        if (k != nursery and at < oldestAt) {
          oldestAt := at;
          oldestKey := ?k;
        };
      };
      switch (oldestKey) {
        case (?k) {
          ignore weatherGridCache.delete(k);
          ignore weatherGridAccess.delete(k);
          ignore weatherModelGusts.delete(k);
        };
        case null {};
      };
    };
    weatherGridCache.add(outlook.gridKey, outlook);
    touchAccess(outlook.gridKey);
    let digest = WeatherCert.outlookDigest(outlook);
    WeatherCert.putDigest(certStore, WeatherCert.outlookPath(outlook.gridKey), digest);
    WeatherCert.refreshCertifiedRoot(certStore);
  };

  func recordSourceFetch(entry : {
    fetchedAt : Int;
    kind : Hub.WeatherSourceKind;
    sourceUrl : Text;
    gridKey : ?Text;
    bodyDigest : Text;
    httpStatus : Nat;
    status : Hub.WeatherFreshnessStatus;
  }) {
    WeatherSourceLedger.append(weatherSourceLedger, entry);
  };

  func certifyTropical(summary : Hub.TropicalSummary) {
    let digest = WeatherCert.tropicalDigest(summary);
    WeatherCert.putDigest(certStore, WeatherCert.tropicalPath(), digest);
    WeatherCert.refreshCertifiedRoot(certStore);
  };

  func certifyNws(fetchedAt : Int, alertCount : Nat) {
    let digest = WeatherCert.nwsDigest(fetchedAt, alertCount);
    WeatherCert.putDigest(certStore, WeatherCert.nwsPath(), digest);
    WeatherCert.refreshCertifiedRoot(certStore);
  };

  func certifyAlmanac(almanac : Hub.DailyAlmanac) {
    let digest = WeatherCert.almanacDigest(almanac);
    WeatherCert.putDigest(certStore, WeatherCert.almanacPath(almanac.dateKey), digest);
    WeatherCert.refreshCertifiedRoot(certStore);
  };

  func getCachedOutlook(lat : Float, lng : Float) : ?Hub.WeatherOutlook {
    let key = WeatherGrid.gridKey(lat, lng);
    switch (weatherGridCache.get(key)) {
      case null null;
      case (?o) {
        touchAccess(key);
        ?WeatherGrid.withStaleFlag(o, Time.now());
      };
    };
  };

  public query func weatherOutlookTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = WeatherProvenance.canonicalOutlookBody(response.body);
    };
  };

  public query func weatherAirQualityTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = WeatherProvenance.canonicalAirQualityBody(response.body);
    };
  };

  public query func weatherGeocodeTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = WeatherProvenance.canonicalGeocodeBody(response.body);
    };
  };

  public query func weatherModelTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = WeatherProvenance.canonicalModelBody(response.body);
    };
  };

  public query func weatherTropicalTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = TropicalDesk.canonicalCurrentStormsBody(response.body);
    };
  };

  public query func weatherNoaaForecastTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = TropicalNoaa.canonicalForecastBody(response.body);
    };
  };

  public query func weatherNoaaOutlookTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = TropicalNoaa.canonicalOutlookBody(response.body);
    };
  };

  public query func weatherNoaaPastTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = TropicalNoaa.canonicalPastBody(response.body);
    };
  };

  public query func weatherNwsAlertsTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = NwsAlerts.canonicalAlertsBody(response.body);
    };
  };

  public query func weatherEnsembleTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    {
      response with
      headers = [];
      body = WeatherProvenance.canonicalEnsembleBody(response.body);
    };
  };

  /// A-deck files are static gzip archives — identical bytes on every
  /// replica, so the body passes through untouched (headers stripped).
  public query func weatherAdeckTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    ignore context;
    { response with headers = [] };
  };

  func fetchNoaaLayer(
    url : Text,
    host : Text,
    transform : shared query ({ context : Blob; response : IC.http_request_result }) -> async IC.http_request_result,
    maxBytes : Nat64,
  ) : async ?Blob {
    try {
      let httpResponse = await (with cycles = 2_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?maxBytes;
        headers = [
          { name = "Host"; value = host },
          { name = "Accept"; value = "application/json" },
          {
            name = "User-Agent";
            value = "ICSpicyWeatherHub/2.0 (+https://www.icspicy.app; weather-desk)";
          },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = transform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status < 200 or httpResponse.status >= 300) { null }
      else { ?httpResponse.body };
    } catch (_) { null };
  };

  func fetchEonetStorms(now : Int) : async ?[Hub.TropicalStorm] {
    try {
      let httpResponse = await (with cycles = 2_000_000_000) IC.http_request({
        url = TropicalDesk.EONET_STORMS_URL;
        max_response_bytes = ?(150_000 : Nat64);
        headers = [
          { name = "Host"; value = "eonet.gsfc.nasa.gov" },
          { name = "Accept"; value = "application/json" },
          {
            name = "User-Agent";
            value = "ICSpicyWeatherHub/1.0 (+https://www.icspicy.app; weather-desk)";
          },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = weatherTropicalTransform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status < 200 or httpResponse.status >= 300) { return null };
      switch (TropicalDesk.parseCurrentStorms(httpResponse.body, now)) {
        case (#err(_)) null;
        case (#ok(storms)) ?storms;
      };
    } catch (_) { null };
  };

  let ADECK_FRESH_NS : Int = 3 * HOUR_NS;
  let ADECK_MAX_STORMS : Nat = 4;
  let ADECK_MAX_BYTES : Nat64 = 600_000;

  func fetchAdeck(wallet : Text, stormName : Text, now : Int) : async Bool {
    let url = TropicalNoaa.adeckUrl(wallet);
    try {
      let httpResponse = await (with cycles = 8_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?ADECK_MAX_BYTES;
        headers = [
          { name = "Host"; value = "ftp.nhc.noaa.gov" },
          { name = "Accept"; value = "*/*" },
          {
            name = "User-Agent";
            value = "ICSpicyWeatherHub/2.0 (+https://www.icspicy.app; weather-desk)";
          },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = weatherAdeckTransform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status < 200 or httpResponse.status >= 300) { return false };
      tropicalAdecks.add(wallet, {
        wallet;
        stormName;
        fetchedAt = now;
        gz = httpResponse.body;
      });
      recordSourceFetch({
        fetchedAt = now;
        kind = #tropical;
        sourceUrl = url;
        gridKey = null;
        bodyDigest = "adeck-bytes:" # Nat.toText(httpResponse.body.size());
        httpStatus = httpResponse.status;
        status = #fresh;
      });
      true;
    } catch (_) { false };
  };

  /// Refresh a-decks for active wallets; prune wallets no longer active.
  func refreshTropicalAdecks(wallets : [(Text, Text)], now : Int) : async () {
    // Prune inactive storms so stale spaghetti never renders.
    var toDelete : [Text] = [];
    label scan for ((key, _) in tropicalAdecks.entries()) {
      for ((w, _) in wallets.vals()) {
        if (w == key) continue scan;
      };
      toDelete := Array.concat(toDelete, [key]);
    };
    for (key in toDelete.vals()) {
      ignore tropicalAdecks.delete(key);
    };
    var fetched : Nat = 0;
    for ((wallet, name) in wallets.vals()) {
      if (fetched < ADECK_MAX_STORMS) {
        let fresh = switch (tropicalAdecks.get(wallet)) {
          case (?a) (now - a.fetchedAt) < ADECK_FRESH_NS;
          case null false;
        };
        if (not fresh) {
          ignore await fetchAdeck(wallet, name, now);
        };
        fetched += 1;
      };
    };
  };

  func fetchTropicalSummary() : async ?Hub.TropicalSummary {
    let now = Time.now();
    var dataSource = "eonet";
    var storms : [Hub.TropicalStorm] = [];
    var outlooks : [Hub.DevelopmentOutlook] = [];
    var adeckWallets : [(Text, Text)] = [];

    switch (await fetchNoaaLayer(
      TropicalNoaa.forecastPointsUrl(),
      "mapservices.weather.noaa.gov",
      weatherNoaaForecastTransform,
      80_000,
    )) {
      case (?body) {
        adeckWallets := TropicalNoaa.extractWallets(body);
        switch (TropicalNoaa.parseForecastStorms(body, now)) {
          case (#ok(parsed)) {
            if (parsed.size() > 0) {
              dataSource := "noaa-gis";
              storms := parsed;
              lastTropicalError := "";
            };
          };
          case (#err(e)) { lastTropicalError := "noaa forecast: " # e };
        };
      };
      case null { lastTropicalError := "noaa forecast HTTP failed" };
    };

    switch (await fetchNoaaLayer(
      TropicalNoaa.outlookRegionsUrl(),
      "mapservices.weather.noaa.gov",
      weatherNoaaOutlookTransform,
      40_000,
    )) {
      case (?body) {
        switch (TropicalNoaa.parseDevelopmentOutlooks(body)) {
          case (#ok(o)) outlooks := o;
          case (#err(_)) {};
        };
      };
      case null {};
    };

    switch (await fetchNoaaLayer(
      TropicalNoaa.pastPointsUrl(),
      "mapservices.weather.noaa.gov",
      weatherNoaaPastTransform,
      60_000,
    )) {
      case (?body) {
        switch (TropicalNoaa.parsePastTrack(body)) {
          case (#ok(past)) { storms := TropicalNoaa.mergePastTracks(storms, past) };
          case (#err(_)) {};
        };
      };
      case null {};
    };

    if (storms.size() == 0) {
      switch (await fetchEonetStorms(now)) {
        case (?eonet) {
          dataSource := "eonet";
          storms := TropicalDesk.mergeWithHistory(eonet, readTropicalSummary());
        };
        case null {
          if (lastTropicalError.size() == 0) {
            lastTropicalError := "noaa and eonet both failed";
          };
        };
      };
    } else {
      storms := TropicalDesk.mergeWithHistory(storms, readTropicalSummary());
    };

    await refreshTropicalAdecks(adeckWallets, now);

    let ace = TropicalNoaa.computeAceStats(storms, readTropicalSummary());
    let summary = TropicalDesk.buildSummary(storms, now, outlooks, ace, dataSource);
    writeTropicalSummary(?summary);
    certifyTropical(summary);
    recordSourceFetch({
      fetchedAt = now;
      kind = #tropical;
      sourceUrl = TropicalNoaa.forecastPointsUrl();
      gridKey = null;
      bodyDigest = WeatherCert.tropicalDigest(summary);
      httpStatus = 200;
      status = #fresh;
    });
    ?summary;
  };

  func alertsForCoords(lat : Float, lng : Float) : [Hub.WeatherAlert] {
    let now = Time.now();
    var out = switch (getCachedOutlook(lat, lng)) {
      case null [];
      case (?o) WeatherAlerts.evaluate(o, now);
    };
    switch (readTropicalSummary()) {
      case (?s) {
        out := Array.concat(
          out,
          TropicalDesk.tropicalThreatAlerts(s, lat, lng, now),
        );
      };
      case null {};
    };
    // NWS official alerts (refreshed every 6h with timer).
    if (nwsAlertsCache.size() > 0) {
      out := Array.concat(out, nwsAlertsCache);
    };
    out;
  };

  func refreshNwsAlerts() : async Bool {
    let body = await fetchNoaaLayer(
      NwsAlerts.NWS_ALERTS_FL_URL,
      "api.weather.gov",
      weatherNwsAlertsTransform,
      120_000,
    );
    switch (body) {
      case null false;
      case (?b) {
        let now = Time.now();
        nwsAlertsCache := NwsAlerts.parseAlerts(b, now, "FL");
        nwsAlertsFetchedAt := now;
        certifyNws(now, nwsAlertsCache.size());
        recordSourceFetch({
          fetchedAt = now;
          kind = #nws;
          sourceUrl = NwsAlerts.NWS_ALERTS_FL_URL;
          gridKey = ?"FL";
          bodyDigest = WeatherCert.nwsDigest(now, nwsAlertsCache.size());
          httpStatus = 200;
          status = #fresh;
        });
        true;
      };
    };
  };

  func fetchAirQuality(lat : Float, lng : Float) : async ?Hub.AirQuality {
    let url = WeatherProvenance.airQualityUrl(lat, lng);
    try {
      let httpResponse = await (with cycles = 1_600_000_000) IC.http_request({
        url;
        max_response_bytes = ?(4_000 : Nat64);
        headers = [
          { name = "Accept"; value = "application/json" },
          { name = "User-Agent"; value = "ic-spicy-weather-hub" },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = weatherAirQualityTransform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status != 200) { return null };
      switch (WeatherProvenance.parseAirQualityResponse(httpResponse.body)) {
        case (#ok(aq)) ?aq;
        case (#err(_)) null;
      };
    } catch (_) {
      null;
    };
  };

  func fetchModelDays(lat : Float, lng : Float, model : Text) : async ?{
    days : [Hub.ModelDay];
    gusts : [Hub.ModelGustDay];
  } {
    let url = WeatherProvenance.modelOutlookUrl(lat, lng, model);
    try {
      let httpResponse = await (with cycles = 1_800_000_000) IC.http_request({
        url;
        max_response_bytes = ?(14_000 : Nat64);
        headers = [
          { name = "Accept"; value = "application/json" },
          { name = "User-Agent"; value = "ic-spicy-weather-hub" },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = weatherModelTransform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status != 200) { return null };
      switch (WeatherProvenance.parseModelDaysResponse(httpResponse.body)) {
        case (#ok(days)) ?{
          days;
          gusts = WeatherProvenance.parseModelGustDays(httpResponse.body);
        };
        case (#err(_)) null;
      };
    } catch (_) {
      null;
    };
  };

  func fetchModelSpread(lat : Float, lng : Float) : async ?Hub.ModelSpread {
    let gfs = await fetchModelDays(lat, lng, WeatherProvenance.MODEL_GFS);
    let ecmwf = await fetchModelDays(lat, lng, WeatherProvenance.MODEL_ECMWF);
    let icon = await fetchModelDays(lat, lng, WeatherProvenance.MODEL_ICON);
    let gem = await fetchModelDays(lat, lng, WeatherProvenance.MODEL_GEM);
    let ensemble = await fetchEnsemblePlume(lat, lng);
    let g = switch (gfs) { case (?v) v.days; case null [] };
    let e = switch (ecmwf) { case (?v) v.days; case null [] };
    let i = switch (icon) { case (?v) v.days; case null [] };
    let ge = switch (gem) { case (?v) v.days; case null [] };
    if (g.size() == 0 and e.size() == 0 and i.size() == 0 and ge.size() == 0) {
      return null;
    };
    // Wind gusts live in a side map so stored WeatherOutlook stays
    // stable-compatible across upgrades.
    let gridKey = WeatherGrid.gridKey(lat, lng);
    weatherModelGusts.add(gridKey, {
      gridKey;
      fetchedAt = Time.now();
      gfs = switch (gfs) { case (?v) v.gusts; case null [] };
      ecmwf = switch (ecmwf) { case (?v) v.gusts; case null [] };
      icon = switch (icon) { case (?v) v.gusts; case null [] };
      gem = switch (gem) { case (?v) v.gusts; case null [] };
    });
    let score = WeatherProvenance.computeAgreementScore(g, e, i, ge);
    ?{
      gfs = g;
      ecmwf = e;
      icon = i;
      gem = ge;
      ensemble;
      agreementScore = score;
    };
  };

  func fetchEnsemblePlume(lat : Float, lng : Float) : async ?Hub.EnsemblePlume {
    let url = WeatherProvenance.ensembleUrl(lat, lng);
    try {
      let httpResponse = await (with cycles = 2_400_000_000) IC.http_request({
        url;
        max_response_bytes = ?(80_000 : Nat64);
        headers = [
          { name = "Accept"; value = "application/json" },
          { name = "User-Agent"; value = "ic-spicy-weather-hub" },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = weatherEnsembleTransform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status != 200) return null;
      switch (WeatherProvenance.parseEnsemblePlume(httpResponse.body)) {
        case (#ok(p)) ?p;
        case (#err(_)) null;
      };
    } catch (_) { null };
  };

  func fetchOutlook(lat : Float, lng : Float) : async ?Hub.WeatherOutlook {
    let url = WeatherProvenance.outlookUrl(lat, lng);
    try {
      let httpResponse = await (with cycles = 2_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?(20_000 : Nat64);
        headers = [
          { name = "Accept"; value = "application/json" },
          { name = "User-Agent"; value = "ic-spicy-weather-hub" },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = weatherOutlookTransform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status != 200) {
        lastHubWeatherError := "outlook HTTP " # Nat.toText(httpResponse.status);
        return null;
      };
      let aq = await fetchAirQuality(lat, lng);
      switch (WeatherProvenance.parseOutlookResponse(httpResponse.body, lat, lng, aq)) {
        case (#err(e)) {
          lastHubWeatherError := "outlook parse: " # e;
          null;
        };
        case (#ok(outlook)) {
          let models = await fetchModelSpread(lat, lng);
          let withModels : Hub.WeatherOutlook = { outlook with models };
          lastHubWeatherError := "";
          putOutlook(withModels);
          recordSourceFetch({
            fetchedAt = withModels.fetchedAt;
            kind = #outlook;
            sourceUrl = url;
            gridKey = ?withModels.gridKey;
            bodyDigest = WeatherCert.outlookDigest(withModels);
            httpStatus = 200;
            status = #fresh;
          });
          ?WeatherGrid.withStaleFlag(withModels, Time.now());
        };
      };
    } catch (e) {
      lastHubWeatherError := Error.message(e);
      null;
    };
  };

  func allowZipGeocodeBudget() : Bool {
    let now = Time.now();
    if ((now - zipGeocodeBudget.windowStart) > HOUR_NS) {
      zipGeocodeBudget.windowStart := now;
      zipGeocodeBudget.count := 0;
    };
    if (zipGeocodeBudget.count >= ZIP_GEOCODE_MAX_PER_HOUR) {
      false;
    } else {
      zipGeocodeBudget.count += 1;
      true;
    };
  };

  /// Public query: cached outlook for coords (defaults to nursery).
  public query func getWeatherOutlook(lat : ?Float, lng : ?Float) : async ?Hub.WeatherOutlook {
    let useLat = switch (lat) { case (?v) v; case null WeatherGrid.NURSERY_LAT };
    let useLng = switch (lng) { case (?v) v; case null WeatherGrid.NURSERY_LNG };
    getCachedOutlook(useLat, useLng);
  };

  /// Public query: nursery desk package (same as outlook at nursery grid).
  public query func getNurseryWeatherDesk() : async ?Hub.WeatherOutlook {
    getCachedOutlook(WeatherGrid.NURSERY_LAT, WeatherGrid.NURSERY_LNG);
  };

  /// Grower alerts from cached outlook + tropical desk (no outcall).
  public query func getGrowerAlerts(lat : ?Float, lng : ?Float) : async [Hub.WeatherAlert] {
    let useLat = switch (lat) { case (?v) v; case null WeatherGrid.NURSERY_LAT };
    let useLng = switch (lng) { case (?v) v; case null WeatherGrid.NURSERY_LNG };
    alertsForCoords(useLat, useLng);
  };

  public query ({ caller }) func getMyWeatherAlerts() : async [Hub.WeatherAlert] {
    AccessControl.requireAuthenticated(caller);
    let (lat, lng) = switch (userWeatherLocations.get(caller)) {
      case (?loc) (loc.lat, loc.lng);
      case null (WeatherGrid.NURSERY_LAT, WeatherGrid.NURSERY_LNG);
    };
    alertsForCoords(lat, lng);
  };

  public query func getTropicalSummary() : async ?Hub.TropicalSummary {
    readTropicalSummary();
  };

  /// Raw gzipped ATCF a-decks for active storms (client decompresses/parses).
  public query func getTropicalAdecks() : async [Hub.TropicalAdeck] {
    var out : [Hub.TropicalAdeck] = [];
    for ((_, a) in tropicalAdecks.entries()) {
      out := Array.concat(out, [a]);
    };
    out;
  };

  /// Per-model daily wind gusts for a grid cell (defaults to nursery).
  public query func getModelGusts(lat : ?Float, lng : ?Float) : async ?Hub.ModelGustSpread {
    let useLat = switch (lat) { case (?v) v; case null WeatherGrid.NURSERY_LAT };
    let useLng = switch (lng) { case (?v) v; case null WeatherGrid.NURSERY_LNG };
    weatherModelGusts.get(WeatherGrid.gridKey(useLat, useLng));
  };

  /// Deterministic grower brief from cache only (SpicyAi / MCP). No outcall.
  public query func getWeatherBrief(lat : ?Float, lng : ?Float) : async ?Hub.WeatherBrief {
    let useLat = switch (lat) { case (?v) v; case null WeatherGrid.NURSERY_LAT };
    let useLng = switch (lng) { case (?v) v; case null WeatherGrid.NURSERY_LNG };
    let almanacKey = switch (dailyAlmanacCurrent) {
      case (?a) if (not a.retracted) ?a.dateKey else null;
      case null null;
    };
    WeatherBrief.build(
      getCachedOutlook(useLat, useLng),
      readTropicalSummary(),
      Time.now(),
      almanacKey,
    );
  };

  public query func getStormTrack(stormId : Text) : async ?[Hub.StormTrackPoint] {
    switch (readTropicalSummary()) {
      case null null;
      case (?s) {
        for (st in s.storms.vals()) {
          if (st.id == stormId) return ?st.track;
        };
        null;
      };
    };
  };

  public query func getWeatherHubDebug() : async {
    lastError : Text;
    lastTropicalError : Text;
    gridCount : Nat;
    zipCount : Nat;
    zipBudgetRemaining : Nat;
    tropicalStormCount : Nat;
    seasonActive : Bool;
  } {
    let remaining = if (zipGeocodeBudget.count >= ZIP_GEOCODE_MAX_PER_HOUR) {
      0;
    } else {
      ZIP_GEOCODE_MAX_PER_HOUR - zipGeocodeBudget.count;
    };
    let (stormCount, season) = switch (readTropicalSummary()) {
      case (?s) (s.storms.size(), s.seasonActive);
      case null (0, TropicalDesk.seasonActive(Time.now()));
    };
    {
      lastError = lastHubWeatherError;
      lastTropicalError;
      gridCount = weatherGridCache.size();
      zipCount = zipCoordCache.size();
      zipBudgetRemaining = remaining;
      tropicalStormCount = stormCount;
      seasonActive = season;
    };
  };

  /// Update: return fresh outlook, fetching if missing or stale.
  /// Anonymous allowed (inspect) with rate limit when an outcall is needed.
  public shared ({ caller }) func ensureWeatherOutlook(lat : Float, lng : Float) : async ?Hub.WeatherOutlook {
    switch (getCachedOutlook(lat, lng)) {
      case (?o) {
        if (not o.stale) { return ?o };
      };
      case null {};
    };
    RateLimit.trapIfLimited(
      rateLimits.weatherOutlook,
      caller,
      "Weather outlook rate limit — try again later",
    );
    await fetchOutlook(lat, lng);
  };

  /// Timer / internal / ops only — triggers paid HTTPS outcalls.
  /// Self-calls (timer) pass; admins and registered agents may trigger manually.
  func requireTimerOrOps(caller : Principal) {
    if (
      caller != selfPrincipal() and
      not AccessControl.isAdminOrAgent(accessControlState, agentPrincipalState, caller)
    ) {
      Runtime.trap("Unauthorized: timer/admin/agent only");
    };
  };

  /// Timer / internal: refresh nursery grid (no rate limit).
  public shared ({ caller }) func refreshNurseryWeatherHub() : async Bool {
    requireTimerOrOps(caller);
    switch (await fetchOutlook(WeatherGrid.NURSERY_LAT, WeatherGrid.NURSERY_LNG)) {
      case null false;
      case (?_) true;
    };
  };

  /// Timer / internal: refresh NHC tropical summary + NWS alerts (no rate limit).
  public shared ({ caller }) func refreshTropicalDesk() : async Bool {
    requireTimerOrOps(caller);
    ignore await refreshNwsAlerts();
    switch (await fetchTropicalSummary()) {
      case null false;
      case (?_) true;
    };
  };

  /// Anonymous allowed (inspect) via Nat arg. Cache hit is free when fresh.
  /// forceFlag: 0 = use fresh cache; non-zero = force outcall.
  public shared ({ caller }) func ensureTropicalSummary(forceFlag : Nat) : async ?Hub.TropicalSummary {
    let now = Time.now();
    let force = forceFlag != 0;
    if (not force) {
      switch (readTropicalSummary()) {
        case (?s) {
          if (TropicalDesk.isFresh(s, now)) { return ?s };
        };
        case null {};
      };
    };
    RateLimit.trapIfLimited(
      rateLimits.weatherTropical,
      caller,
      "Tropical desk rate limit — try again later",
    );
    await fetchTropicalSummary();
  };

  public shared ({ caller }) func adminRefreshWeatherGrid(lat : Float, lng : Float) : async ?Hub.WeatherOutlook {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let result = await fetchOutlook(lat, lng);
    logWeatherAdmin(
      caller,
      "weather_hub_refresh",
      WeatherGrid.gridKey(lat, lng),
    );
    result;
  };

  public shared ({ caller }) func adminRefreshTropical() : async ?Hub.TropicalSummary {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };
    let result = await fetchTropicalSummary();
    let detail = switch (result) {
      case (?s) Nat.toText(s.storms.size()) # " storms";
      case null ("err: " # lastTropicalError);
    };
    logWeatherAdmin(caller, "weather_tropical_refresh", detail);
    result;
  };

  public query func lookupCachedZip(zip : Text) : async ?Hub.ZipCoord {
    switch (WeatherGrid.normalizeZip(zip)) {
      case null null;
      case (?z) zipCoordCache.get(z);
    };
  };

  /// Anonymous allowed (inspect). Cache hit is free; miss uses global + per-caller limits.
  public shared ({ caller }) func resolveZip(zip : Text) : async Hub.ZipCoord {
    let z = switch (WeatherGrid.normalizeZip(zip)) {
      case (?v) v;
      case null Runtime.trap("ZIP must be 5 digits");
    };
    switch (zipCoordCache.get(z)) {
      case (?cached) return cached;
      case null {};
    };
    RateLimit.trapIfLimited(
      rateLimits.weatherZip,
      caller,
      "ZIP resolve rate limit — try again later",
    );
    if (not allowZipGeocodeBudget()) {
      Runtime.trap("ZIP geocode budget exhausted this hour — try a cached ZIP or retry later");
    };
    let url = WeatherProvenance.geocodeZipUrl(z);
    try {
      let httpResponse = await (with cycles = 1_600_000_000) IC.http_request({
        url;
        max_response_bytes = ?(8_000 : Nat64);
        headers = [
          { name = "Accept"; value = "application/json" },
          { name = "User-Agent"; value = "ic-spicy-weather-hub" },
        ];
        body = null;
        method = #get;
        transform = ?{
          function = weatherGeocodeTransform;
          context = Blob.fromArray([]);
        };
        is_replicated = null;
      });
      if (httpResponse.status != 200) {
        Runtime.trap("Geocode HTTP " # Nat.toText(httpResponse.status));
      };
      switch (WeatherProvenance.parseGeocodeResponse(httpResponse.body)) {
        case (#err(e)) Runtime.trap("Geocode parse: " # e);
        case (#ok(g)) {
          let displayLabel = if (g.admin1.size() > 0) {
            g.name # ", " # g.admin1;
          } else {
            g.name;
          };
          let entry : Hub.ZipCoord = {
            zip = z;
            lat = WeatherGrid.roundToTenth(g.lat);
            lng = WeatherGrid.roundToTenth(g.lng);
            displayLabel = if (displayLabel.size() > 0) displayLabel else ("ZIP " # z);
            fetchedAt = Time.now();
          };
          if (zipCoordCache.size() >= WeatherGrid.MAX_ZIP_CACHE) {
            // Drop an arbitrary oldest by fetchedAt.
            var oldestZip : ?Text = null;
            var oldestAt : Int = Time.now();
            for ((k, v) in zipCoordCache.entries()) {
              if (v.fetchedAt < oldestAt) {
                oldestAt := v.fetchedAt;
                oldestZip := ?k;
              };
            };
            switch (oldestZip) {
              case (?k) { ignore zipCoordCache.delete(k) };
              case null {};
            };
          };
          zipCoordCache.add(z, entry);
          entry;
        };
      };
    } catch (e) {
      Runtime.trap("Geocode failed: " # Error.message(e));
    };
  };

  public shared ({ caller }) func setMyWeatherLocation(
    kind : Hub.WeatherLocationKind,
    zip : ?Text,
    lat : Float,
    lng : Float,
    displayLabel : Text,
  ) : async Hub.WeatherLocation {
    AccessControl.requireAuthenticated(caller);
    let rLat = WeatherGrid.roundToTenth(lat);
    let rLng = WeatherGrid.roundToTenth(lng);
    let loc : Hub.WeatherLocation = {
      kind;
      zip;
      lat = rLat;
      lng = rLng;
      displayLabel = if (displayLabel.size() > 0) displayLabel else WeatherGrid.gridKey(rLat, rLng);
      updatedAt = Time.now();
    };
    userWeatherLocations.add(caller, loc);
    loc;
  };

  public query ({ caller }) func getMyWeatherLocation() : async ?Hub.WeatherLocation {
    AccessControl.requireAuthenticated(caller);
    userWeatherLocations.get(caller);
  };

  public query func getDailyAlmanac(dateKey : ?Text) : async ?Hub.DailyAlmanac {
    switch (dateKey) {
      case (?k) {
        switch (dailyAlmanacCurrent) {
          case (?cur) if (cur.dateKey == k and not cur.retracted) return ?cur;
          case _ {};
        };
        for (a in dailyAlmanacArchive.vals()) {
          if (a.dateKey == k and not a.retracted) return ?a;
        };
        null;
      };
      case null {
        switch (dailyAlmanacCurrent) {
          case (?cur) if (not cur.retracted) ?cur else null;
          case null null;
        };
      };
    };
  };

  public query func listDailyAlmanacArchive(limit : Nat) : async [Hub.DailyAlmanac] {
    let n = if (limit > dailyAlmanacArchive.size()) {
      dailyAlmanacArchive.size();
    } else {
      limit;
    };
    if (n == 0) { [] } else {
      var out : [Hub.DailyAlmanac] = [];
      var i = dailyAlmanacArchive.size() - n;
      while (i < dailyAlmanacArchive.size()) {
        out := Array.concat(out, [dailyAlmanacArchive[i]]);
        i += 1;
      };
      out;
    };
  };

  /// Agent or admin: auto-publish daily almanac (Weather Concierge).
  public shared ({ caller }) func publishDailyAlmanac(
    dateKey : Text,
    title : Text,
    body : Text,
    recipeSlug : ?Text,
    varietyIds : [Nat],
  ) : async () {
    AccessControl.requireAdminOrAgent(accessControlState, agentPrincipalState, caller);
    if (not isValidDateKey(dateKey)) {
      Runtime.trap("dateKey must be YYYY-MM-DD");
    };
    if (title.size() == 0 or title.size() > 200) {
      Runtime.trap("title must be 1-200 chars");
    };
    if (body.size() == 0 or body.size() > 12_000) {
      Runtime.trap("body must be 1-12000 chars");
    };
    switch (recipeSlug) {
      case (?s) if (s.size() > 120) Runtime.trap("recipeSlug too long");
      case null {};
    };
    if (varietyIds.size() > 5) {
      Runtime.trap("max 5 varietyIds");
    };
    let entry : Hub.DailyAlmanac = {
      dateKey;
      publishedAt = Time.now();
      title;
      body;
      recipeSlug;
      varietyIds;
      retracted = false;
    };
    dailyAlmanacCurrent := ?entry;
    dailyAlmanacArchive := dailyAlmanacArchive.concat([entry]);
    if (dailyAlmanacArchive.size() > 30) {
      let start = dailyAlmanacArchive.size() - 30 : Nat;
      dailyAlmanacArchive := dailyAlmanacArchive.sliceToArray(start, dailyAlmanacArchive.size());
    };
    certifyAlmanac(entry);
    recordSourceFetch({
      fetchedAt = entry.publishedAt;
      kind = #almanac;
      sourceUrl = "on-chain://daily-almanac";
      gridKey = null;
      bodyDigest = WeatherCert.almanacDigest(entry);
      httpStatus = 200;
      status = #fresh;
    });
    logWeatherAdmin(caller, "publish_daily_almanac", dateKey);
  };

  public shared ({ caller }) func adminRetractAlmanac(dateKey : Text) : async () {
    AccessControl.requireAdmin(accessControlState, caller);
    switch (dailyAlmanacCurrent) {
      case (?cur) {
        if (cur.dateKey == dateKey) {
          dailyAlmanacCurrent := ?{ cur with retracted = true };
        };
      };
      case null {};
    };
    dailyAlmanacArchive := Array.map<Hub.DailyAlmanac, Hub.DailyAlmanac>(
      dailyAlmanacArchive,
      func(a) = if (a.dateKey == dateKey) { { a with retracted = true } } else a,
    );
    logWeatherAdmin(caller, "retract_daily_almanac", dateKey);
  };

  /// Public audit trail of recent weather source fetches (newest last).
  public query func getWeatherSourceLedger(limit : Nat) : async [Hub.WeatherSourceLedgerEntry] {
    WeatherSourceLedger.list(weatherSourceLedger, limit);
  };

  public query func getWeatherOutlookCertified(lat : ?Float, lng : ?Float) : async Hub.CertifiedWeather<Hub.WeatherOutlook> {
    let useLat = switch (lat) { case (?v) v; case null WeatherGrid.NURSERY_LAT };
    let useLng = switch (lng) { case (?v) v; case null WeatherGrid.NURSERY_LNG };
    switch (getCachedOutlook(useLat, useLng)) {
      case null {
        {
          value = null;
          certificate = CertifiedData.getCertificate();
          witness = Blob.fromArray([]);
          bodyDigest = "";
        };
      };
      case (?o) {
        let digest = WeatherCert.outlookDigest(o);
        {
          value = ?o;
          certificate = CertifiedData.getCertificate();
          witness = WeatherCert.witness(certStore, WeatherCert.outlookPath(o.gridKey));
          bodyDigest = digest;
        };
      };
    };
  };

  public query func getTropicalSummaryCertified() : async Hub.CertifiedWeather<Hub.TropicalSummary> {
    switch (readTropicalSummary()) {
      case null {
        {
          value = null;
          certificate = CertifiedData.getCertificate();
          witness = Blob.fromArray([]);
          bodyDigest = "";
        };
      };
      case (?s) {
        let digest = WeatherCert.tropicalDigest(s);
        {
          value = ?s;
          certificate = CertifiedData.getCertificate();
          witness = WeatherCert.witness(certStore, WeatherCert.tropicalPath());
          bodyDigest = digest;
        };
      };
    };
  };

  public query func getNwsAlertsCertified() : async Hub.CertifiedWeather<[Hub.WeatherAlert]> {
    let digest = WeatherCert.nwsDigest(nwsAlertsFetchedAt, nwsAlertsCache.size());
    {
      value = if (nwsAlertsCache.size() > 0) ?nwsAlertsCache else null;
      certificate = CertifiedData.getCertificate();
      witness = WeatherCert.witness(certStore, WeatherCert.nwsPath());
      bodyDigest = digest;
    };
  };

  func findAlmanac(dateKey : Text) : ?Hub.DailyAlmanac {
    switch (dailyAlmanacCurrent) {
      case (?cur) {
        if (cur.dateKey == dateKey and not cur.retracted) return ?cur;
      };
      case null {};
    };
    for (a in dailyAlmanacArchive.vals()) {
      if (a.dateKey == dateKey and not a.retracted) return ?a;
    };
    null;
  };

  public query func getDailyAlmanacCertified(dateKey : Text) : async Hub.CertifiedWeather<Hub.DailyAlmanac> {
    let almanac = findAlmanac(dateKey);
    switch (almanac) {
      case null {
        {
          value = null;
          certificate = CertifiedData.getCertificate();
          witness = Blob.fromArray([]);
          bodyDigest = "";
        };
      };
      case (?a) {
        let digest = WeatherCert.almanacDigest(a);
        {
          value = ?a;
          certificate = CertifiedData.getCertificate();
          witness = WeatherCert.witness(certStore, WeatherCert.almanacPath(dateKey));
          bodyDigest = digest;
        };
      };
    };
  };
};
