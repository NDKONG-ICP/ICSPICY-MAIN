import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import AccessControl "../lib/access-control";
import IC "ic:aaaaa-aa";
import Blob "mo:core/Blob";

mixin (
  accessControlState : AccessControl.AccessControlState,
) {
  // Transform callback required by IC HTTP outcalls — strips headers for replica consensus
  public query func dabTransform({
    context : Blob;
    response : IC.http_request_result;
  }) : async IC.http_request_result {
    { response with headers = [] };
  };

  /// Admin: manually submit the NFT collection to the DAB registry.
  /// Sends a POST to the DAB registry API with the canister's collection metadata.
  /// Returns #ok(responseBody) on success, #err(message) on failure.
  public shared ({ caller }) func adminSubmitToDAB(
    collectionName        : Text,
    collectionDescription : Text,
    standard              : Text, // e.g. "ICRC-7" or "EXT"
    canisterIdOverride    : ?Text, // optional — provide the deployed canister ID
  ) : async { #ok : Text; #err : Text } {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Admin only");
    };

    // Use the provided canister ID override, or fall back to the placeholder.
    // The real canister ID is only known post-deployment and must be supplied here.
    let canisterId = switch canisterIdOverride {
      case (?id) id;
      case null  "REPLACE_WITH_DEPLOYED_CANISTER_ID";
    };

    let payload = buildDABPayload(canisterId, collectionName, collectionDescription, standard);

    let url = "https://dab-ooo.vercel.app/api/submit";

    try {
      let httpResponse = await (with cycles = 231_000_000_000) IC.http_request({
        url;
        max_response_bytes = ?(10_000 : Nat64);
        headers = [
          { name = "Content-Type";    value = "application/json" },
          { name = "Accept";          value = "application/json" },
          { name = "User-Agent";      value = "ic-canister" },
          { name = "Idempotency-Key"; value = "dab-submit" },
        ];
        body = ?payload.encodeUtf8();
        method = #post;
        transform = ?{ function = dabTransform; context = Blob.fromArray([]) };
        is_replicated = null;
      });
      let responseBody = switch (httpResponse.body.decodeUtf8()) {
        case null Runtime.trap("empty HTTP response");
        case (?text) text;
      };
      #ok(responseBody)
    } catch (_) {
      #err("DAB registry submission failed. Verify the canister ID and retry.")
    };
  };

  // Build the JSON payload for the DAB registry submission.
  func buildDABPayload(
    canisterId  : Text,
    name        : Text,
    description : Text,
    standard    : Text,
  ) : Text {
    "{" #
    "\"canister_id\":\"" # canisterId # "\"," #
    "\"name\":\"" # name # "\"," #
    "\"description\":\"" # description # "\"," #
    "\"standard\":\"" # standard # "\"," #
    "\"logo\":\"\"," #
    "\"website\":\"https://icspicy.app\"" #
    "}"
  };
};
