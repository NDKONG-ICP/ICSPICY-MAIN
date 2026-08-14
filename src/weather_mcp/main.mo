/// IC SPICY Weather Desk MCP server (Phase 5).
/// Public tools over cached backend weather hub queries — no outcalls here.

import Blob "mo:base/Blob";
import ExperimentalCycles "mo:base/ExperimentalCycles";
import Float "mo:base/Float";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Prim "mo:⛔";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import HttpTypes "mo:http-types";
import Json "mo:json";
import Map "mo:map/Map";
import { thash } "mo:map/Map";

import AuthTypes "mo:mcp-motoko-sdk/auth/Types";
import Cleanup "mo:mcp-motoko-sdk/mcp/Cleanup";
import HttpHandler "mo:mcp-motoko-sdk/mcp/HttpHandler";
import Mcp "mo:mcp-motoko-sdk/mcp/Mcp";
import McpTypes "mo:mcp-motoko-sdk/mcp/Types";
import State "mo:mcp-motoko-sdk/mcp/State";
import SrvTypes "mo:mcp-motoko-sdk/server/Types";

shared ({ caller = deployer }) persistent actor class WeatherMcp() = self {

  // ── Backend weather hub (query-only) ───────────────────────────────────────

  type CurrentConditions = {
    tempF : Float;
    feelsLikeF : Float;
    humidity : Float;
    precipInches : Float;
    uvIndex : Float;
    windMph : Float;
    windDirDeg : Float;
    weatherCode : Nat;
    pressureHpa : Float;
  };

  type DailyOutlook = {
    date : Text;
    tempHighF : Float;
    tempLowF : Float;
    precipInches : Float;
    uvIndexMax : Float;
    windMphMax : Float;
    weatherCode : Nat;
  };

  type ModelDay = {
    date : Text;
    precipInches : Float;
    tempHighF : Float;
  };

  type ModelSpread = {
    gfs : [ModelDay];
    ecmwf : [ModelDay];
  };

  type AirQuality = {
    usAqi : Nat;
    pm25 : Float;
    pm10 : Float;
  };

  type WeatherOutlook = {
    gridKey : Text;
    lat : Float;
    lng : Float;
    fetchedAt : Int;
    source : Text;
    current : CurrentConditions;
    daily : [DailyOutlook];
    airQuality : ?AirQuality;
    models : ?ModelSpread;
    stale : Bool;
  };

  type StormTrackPoint = {
    timeUtc : Text;
    lat : Float;
    lng : Float;
    maxWindKt : Nat;
  };

  type StormBasin = { #atlantic; #eastPacific };

  type TropicalStorm = {
    id : Text;
    name : Text;
    basin : StormBasin;
    classification : Text;
    advisoryNum : Nat;
    lat : Float;
    lng : Float;
    maxWindKt : Nat;
    movementText : Text;
    validAt : Int;
    track : [StormTrackPoint];
  };

  type TropicalSummary = {
    fetchedAt : Int;
    seasonActive : Bool;
    storms : [TropicalStorm];
    disclaimer : Text;
  };

  type WeatherBrief = {
    generatedAt : Int;
    gridKey : Text;
    text : Text;
    outlookFetchedAt : Int;
    tropicalFetchedAt : ?Int;
  };

  type BackendActor = actor {
    getWeatherOutlook : shared query (lat : ?Float, lng : ?Float) -> async ?WeatherOutlook;
    getNurseryWeatherDesk : shared query () -> async ?WeatherOutlook;
    getTropicalSummary : shared query () -> async ?TropicalSummary;
    getWeatherBrief : shared query (lat : ?Float, lng : ?Float) -> async ?WeatherBrief;
  };

  let NURSERY_LAT : Float = 26.9767;
  let NURSERY_LNG : Float = -82.0837;
  let HOUR_NS : Int = 3_600_000_000_000;
  let MAX_TOOL_CALLS_PER_HOUR : Nat = 200;

  var owner : Principal = deployer;
  var backendCanisterId : Text = "ghxmp-xiaaa-aaaao-ba4sq-cai";
  var toolWindowStart : Int = Time.now();
  var toolCallCount : Nat = 0;

  func backend() : BackendActor {
    actor (backendCanisterId);
  };

  func allowToolCall() : Bool {
    let now = Time.now();
    if ((now - toolWindowStart) > HOUR_NS) {
      toolWindowStart := now;
      toolCallCount := 0;
    };
    if (toolCallCount >= MAX_TOOL_CALLS_PER_HOUR) {
      false;
    } else {
      toolCallCount += 1;
      true;
    };
  };

  func rateLimitedResult(cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> ()) {
    let payload = Json.obj([("error", Json.str("Weather MCP rate limit — try again later"))]);
    cb(
      #ok({
        content = [#text({ text = Json.stringify(payload, null) })];
        isError = true;
        structuredContent = ?payload;
      })
    );
  };

  func optFloatArg(args : McpTypes.JsonValue, key : Text) : ?Float {
    switch (Result.toOption(Json.getAsFloat(args, key))) {
      case (?f) ?f;
      case null {
        switch (Result.toOption(Json.getAsInt(args, key))) {
          case (?i) ?Float.fromInt(i);
          case null null;
        };
      };
    };
  };

  func coordsFromArgs(args : McpTypes.JsonValue) : (Float, Float) {
    let lat = switch (optFloatArg(args, "lat")) {
      case (?v) v;
      case null NURSERY_LAT;
    };
    let lng = switch (optFloatArg(args, "lng")) {
      case (?v) v;
      case null NURSERY_LNG;
    };
    (lat, lng);
  };

  func fstr(x : Float) : Text { Float.toText(x) };
  func nstr(n : Nat) : Text { Nat.toText(n) };
  func istr(i : Int) : Text { Int.toText(i) };

  func jsonEsc(t : Text) : Text {
    var out = "";
    for (c in t.chars()) {
      if (c == '\"') { out #= "\\\"" } else if (c == '\\') { out #= "\\\\" } else if (c == '\n') { out #= "\\n" } else {
        out #= Text.fromChar(c);
      };
    };
    out;
  };

  func outlookToJson(o : WeatherOutlook) : Text {
    var days = "";
    var i : Nat = 0;
    while (i < o.daily.size()) {
      if (i > 0) { days #= "," };
      let d = o.daily[i];
      days #= "{\"date\":\"" # jsonEsc(d.date) # "\",\"tempHighF\":" # fstr(d.tempHighF)
        # ",\"tempLowF\":" # fstr(d.tempLowF) # ",\"precipInches\":" # fstr(d.precipInches)
        # ",\"uvIndexMax\":" # fstr(d.uvIndexMax) # ",\"windMphMax\":" # fstr(d.windMphMax)
        # ",\"weatherCode\":" # nstr(d.weatherCode) # "}";
      i += 1;
    };
    let aq = switch (o.airQuality) {
      case (?a) {
        ",\"airQuality\":{\"usAqi\":" # nstr(a.usAqi) # ",\"pm25\":" # fstr(a.pm25) # ",\"pm10\":" # fstr(a.pm10) # "}"
      };
      case null "";
    };
    "{"
    # "\"gridKey\":\"" # jsonEsc(o.gridKey) # "\","
    # "\"lat\":" # fstr(o.lat) # ","
    # "\"lng\":" # fstr(o.lng) # ","
    # "\"fetchedAt\":" # istr(o.fetchedAt) # ","
    # "\"stale\":" # (if (o.stale) "true" else "false") # ","
    # "\"source\":\"" # jsonEsc(o.source) # "\","
    # "\"current\":{\"tempF\":" # fstr(o.current.tempF) # ",\"feelsLikeF\":" # fstr(o.current.feelsLikeF)
    # ",\"humidity\":" # fstr(o.current.humidity) # ",\"precipInches\":" # fstr(o.current.precipInches)
    # ",\"uvIndex\":" # fstr(o.current.uvIndex) # ",\"windMph\":" # fstr(o.current.windMph)
    # ",\"weatherCode\":" # nstr(o.current.weatherCode) # "},"
    # "\"daily\":[" # days # "]"
    # aq
    # "}";
  };

  func modelDaysToJson(days : [ModelDay]) : Text {
    var out = "";
    var i : Nat = 0;
    while (i < days.size()) {
      if (i > 0) { out #= "," };
      let d = days[i];
      out #= "{\"date\":\"" # jsonEsc(d.date) # "\",\"precipInches\":" # fstr(d.precipInches)
        # ",\"tempHighF\":" # fstr(d.tempHighF) # "}";
      i += 1;
    };
    out;
  };

  func tropicalToJson(t : TropicalSummary) : Text {
    var storms = "";
    var i : Nat = 0;
    while (i < t.storms.size()) {
      if (i > 0) { storms #= "," };
      let s = t.storms[i];
      let basin = switch (s.basin) {
        case (#atlantic) "atlantic";
        case (#eastPacific) "eastPacific";
      };
      storms #= "{\"id\":\"" # jsonEsc(s.id) # "\",\"name\":\"" # jsonEsc(s.name)
        # "\",\"classification\":\"" # jsonEsc(s.classification) # "\",\"basin\":\"" # basin
        # "\",\"lat\":" # fstr(s.lat) # ",\"lng\":" # fstr(s.lng)
        # ",\"maxWindKt\":" # nstr(s.maxWindKt) # ",\"movementText\":\"" # jsonEsc(s.movementText)
        # "\",\"trackPoints\":" # nstr(s.track.size()) # "}";
      i += 1;
    };
    "{"
    # "\"fetchedAt\":" # istr(t.fetchedAt) # ","
    # "\"seasonActive\":" # (if (t.seasonActive) "true" else "false") # ","
    # "\"stormCount\":" # nstr(t.storms.size()) # ","
    # "\"storms\":[" # storms # "],"
    # "\"disclaimer\":\"" # jsonEsc(t.disclaimer) # "\""
    # "}";
  };

  func okJson(cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (), jsonText : Text) {
    // Prefer text content; structuredContent optional when parse fails
    let structured = switch (Json.parse(jsonText)) {
      case (#ok(v)) ?v;
      case (#err(_)) null;
    };
    cb(
      #ok({
        content = [#text({ text = jsonText })];
        isError = false;
        structuredContent = structured;
      })
    );
  };

  func errText(cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (), msg : Text) {
    let payload = Json.obj([("error", Json.str(msg))]);
    cb(
      #ok({
        content = [#text({ text = Json.stringify(payload, null) })];
        isError = true;
        structuredContent = ?payload;
      })
    );
  };

  // ── MCP resources / tools ──────────────────────────────────────────────────

  var resourceContents = [
    (
      "weather:///readme",
      "# IC SPICY Weather Desk MCP\n\nOn-chain Florida grower weather tools.\nBackend: " # backendCanisterId # "\nTools are public read-only over cached canister data.\n",
    ),
  ];

  var appContext : McpTypes.AppContext = State.init(resourceContents);
  Cleanup.startCleanupTimer<system>(appContext);

  let emptyObjectSchema = Json.obj([
    ("type", Json.str("object")),
    ("properties", Json.obj([])),
  ]);

  let latLngSchema = Json.obj([
    ("type", Json.str("object")),
    ("properties", Json.obj([
      ("lat", Json.obj([("type", Json.str("number")), ("description", Json.str("Latitude (defaults to Port Charlotte nursery)"))])),
      ("lng", Json.obj([("type", Json.str("number")), ("description", Json.str("Longitude (defaults to Port Charlotte nursery)"))])),
    ])),
  ]);

  var resources : [McpTypes.Resource] = [
    {
      uri = "weather:///readme";
      name = "readme";
      title = ?"Weather Desk MCP README";
      description = ?"How to use IC SPICY weather MCP tools";
      mimeType = ?"text/markdown";
    },
  ];

  var tools : [McpTypes.Tool] = [
    {
      name = "get_florida_outlook";
      title = ?"Florida grower outlook";
      description = ?"7-day on-chain Weather Desk outlook for a grid (default: Port Charlotte nursery)";
      payment = null;
      inputSchema = latLngSchema;
      outputSchema = null;
    },
    {
      name = "get_model_spread";
      title = ?"GFS vs ECMWF model spread";
      description = ?"Cached GFS and ECMWF daily precip/temp series for a grid";
      payment = null;
      inputSchema = latLngSchema;
      outputSchema = null;
    },
    {
      name = "get_tropical_desk";
      title = ?"Tropical desk";
      description = ?"On-chain tropical summary (EONET/JTWC-sourced positions)";
      payment = null;
      inputSchema = emptyObjectSchema;
      outputSchema = null;
    },
    {
      name = "get_grower_brief";
      title = ?"Grower weather brief";
      description = ?"Deterministic prose brief for agents (same text SpicyAi uses)";
      payment = null;
      inputSchema = latLngSchema;
      outputSchema = null;
    },
    {
      name = "get_nursery_conditions";
      title = ?"Nursery conditions";
      description = ?"IC SPICY Port Charlotte nursery Weather Desk package";
      payment = null;
      inputSchema = emptyObjectSchema;
      outputSchema = null;
    },
  ];

  func getFloridaOutlookTool(
    args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) : async () {
    if (not allowToolCall()) { return rateLimitedResult(cb) };
    let (lat, lng) = coordsFromArgs(args);
    try {
      switch (await backend().getWeatherOutlook(?lat, ?lng)) {
        case null { errText(cb, "No cached outlook for this grid — try ensureWeatherOutlook on the app first") };
        case (?o) { okJson(cb, outlookToJson(o)) };
      };
    } catch (_) { errText(cb, "Backend call failed") };
  };

  func getModelSpreadTool(
    args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) : async () {
    if (not allowToolCall()) { return rateLimitedResult(cb) };
    let (lat, lng) = coordsFromArgs(args);
    try {
      switch (await backend().getWeatherOutlook(?lat, ?lng)) {
        case null { errText(cb, "No cached outlook / models for this grid") };
        case (?o) {
          switch (o.models) {
            case null {
              okJson(cb, "{\"gridKey\":\"" # jsonEsc(o.gridKey) # "\",\"gfs\":[],\"ecmwf\":[],\"note\":\"models not yet cached\"}");
            };
            case (?m) {
              okJson(
                cb,
                "{\"gridKey\":\"" # jsonEsc(o.gridKey) # "\",\"gfs\":[" # modelDaysToJson(m.gfs)
                # "],\"ecmwf\":[" # modelDaysToJson(m.ecmwf) # "]}",
              );
            };
          };
        };
      };
    } catch (_) { errText(cb, "Backend call failed") };
  };

  func getTropicalDeskTool(
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) : async () {
    if (not allowToolCall()) { return rateLimitedResult(cb) };
    try {
      switch (await backend().getTropicalSummary()) {
        case null { errText(cb, "Tropical cache empty") };
        case (?t) { okJson(cb, tropicalToJson(t)) };
      };
    } catch (_) { errText(cb, "Backend call failed") };
  };

  func getGrowerBriefTool(
    args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) : async () {
    if (not allowToolCall()) { return rateLimitedResult(cb) };
    let (lat, lng) = coordsFromArgs(args);
    try {
      switch (await backend().getWeatherBrief(?lat, ?lng)) {
        case null { errText(cb, "No brief — outlook cache miss") };
        case (?b) {
          let trop = switch (b.tropicalFetchedAt) {
            case (?t) istr(t);
            case null "null";
          };
          okJson(
            cb,
            "{\"gridKey\":\"" # jsonEsc(b.gridKey) # "\",\"generatedAt\":" # istr(b.generatedAt)
            # ",\"outlookFetchedAt\":" # istr(b.outlookFetchedAt)
            # ",\"tropicalFetchedAt\":" # trop
            # ",\"text\":\"" # jsonEsc(b.text) # "\"}",
          );
        };
      };
    } catch (_) { errText(cb, "Backend call failed") };
  };

  func getNurseryConditionsTool(
    _args : McpTypes.JsonValue,
    _auth : ?AuthTypes.AuthInfo,
    cb : (Result.Result<McpTypes.CallToolResult, McpTypes.HandlerError>) -> (),
  ) : async () {
    if (not allowToolCall()) { return rateLimitedResult(cb) };
    try {
      switch (await backend().getNurseryWeatherDesk()) {
        case null { errText(cb, "Nursery desk cache empty") };
        case (?o) { okJson(cb, outlookToJson(o)) };
      };
    } catch (_) { errText(cb, "Backend call failed") };
  };

  transient let mcpConfig : McpTypes.McpConfig = {
    self = Principal.fromActor(self);
    allowanceUrl = null;
    serverInfo = {
      name = "ic-spicy-weather-mcp";
      title = "IC SPICY Weather Desk MCP";
      version = "0.1.0";
    };
    resources = resources;
    resourceReader = func(uri) {
      Map.get(appContext.resourceContents, thash, uri);
    };
    tools = tools;
    toolImplementations = [
      ("get_florida_outlook", getFloridaOutlookTool),
      ("get_model_spread", getModelSpreadTool),
      ("get_tropical_desk", getTropicalDeskTool),
      ("get_grower_brief", getGrowerBriefTool),
      ("get_nursery_conditions", getNurseryConditionsTool),
    ];
    beacon = null;
  };

  transient let mcpServer = Mcp.createServer(mcpConfig);

  private func _create_http_context() : HttpHandler.Context {
    {
      self = Principal.fromActor(self);
      active_streams = appContext.activeStreams;
      mcp_server = mcpServer;
      streaming_callback = http_request_streaming_callback;
      auth = null;
      http_asset_cache = null;
      mcp_path = ?"/mcp";
    };
  };

  public query func http_request(req : SrvTypes.HttpRequest) : async SrvTypes.HttpResponse {
    let ctx = _create_http_context();
    switch (HttpHandler.http_request(ctx, req)) {
      case (?mcpResponse) mcpResponse;
      case null {
        if (Text.startsWith(req.url, #text "/")) {
          {
            status_code = 200;
            headers = [("Content-Type", "text/html; charset=utf-8")];
            body = Text.encodeUtf8(
              "<!doctype html><html><body style=\"font-family:system-ui;max-width:40rem;margin:2rem auto;padding:0 1rem\">"
              # "<h1>IC SPICY Weather MCP</h1>"
              # "<p>Model Context Protocol endpoint for the on-chain Weather Desk.</p>"
              # "<p><code>MCP URL:</code> <code>/mcp</code></p>"
              # "<p>Connect with <a href=\"https://github.com/modelcontextprotocol/inspector\">MCP Inspector</a>.</p>"
              # "<p>Backend: <code>" # backendCanisterId # "</code></p>"
              # "</body></html>"
            );
            upgrade = null;
            streaming_strategy = null;
          };
        } else {
          {
            status_code = 404;
            headers = [];
            body = Blob.fromArray([]);
            upgrade = null;
            streaming_strategy = null;
          };
        };
      };
    };
  };

  public shared func http_request_update(req : SrvTypes.HttpRequest) : async SrvTypes.HttpResponse {
    let ctx = _create_http_context();
    switch (await HttpHandler.http_request_update(ctx, req)) {
      case (?res) res;
      case null {
        {
          status_code = 404;
          headers = [];
          body = Blob.fromArray([]);
          upgrade = null;
          streaming_strategy = null;
        };
      };
    };
  };

  public query func http_request_streaming_callback(token : HttpTypes.StreamingToken) : async ?HttpTypes.StreamingCallbackResponse {
    HttpHandler.http_request_streaming_callback(_create_http_context(), token);
  };

  public query func get_owner() : async Principal { owner };

  public shared ({ caller }) func set_owner(new_owner : Principal) : async () {
    if (caller != owner) { return };
    owner := new_owner;
  };

  public shared ({ caller }) func setBackendCanisterId(id : Text) : async () {
    if (caller != owner) { return };
    backendCanisterId := id;
  };

  public query func getBackendCanisterId() : async Text { backendCanisterId };

  public query func getCycleBalance() : async Nat {
    ExperimentalCycles.balance();
  };

  /// Fleet health probe — matches backend CanisterHealth.Health shape.
  public type CanisterHealthSnapshot = {
    cyclesBalance : Nat;
    memoryUsed : Nat;
    heapSize : Nat;
    isHealthy : Bool;
  };

  public query func getCanisterHealth() : async CanisterHealthSnapshot {
    let balance = Prim.cyclesBalance();
    {
      cyclesBalance = balance;
      memoryUsed = Prim.rts_memory_size();
      heapSize = Prim.rts_heap_size();
      isHealthy = balance > 500_000_000_000;
    };
  };

  public query func getMcpInfo() : async {
    backendCanisterId : Text;
    toolCallsThisHour : Nat;
    maxToolCallsPerHour : Nat;
    mcpPath : Text;
  } {
    {
      backendCanisterId;
      toolCallsThisHour = toolCallCount;
      maxToolCallsPerHour = MAX_TOOL_CALLS_PER_HOUR;
      mcpPath = "/mcp";
    };
  };
};
