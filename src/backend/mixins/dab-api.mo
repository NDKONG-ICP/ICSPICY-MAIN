import Runtime "mo:core/Runtime";
import AccessControl "mo:caffeineai-authorization/access-control";
import OutCall "mo:caffeineai-http-outcalls/outcall";

mixin (
  accessControlState : AccessControl.AccessControlState,
) {
  // Transform callback required by IC HTTP outcalls
  public query func dabTransform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
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
    let headers : [OutCall.Header] = [
      { name = "Content-Type"; value = "application/json" },
      { name = "Accept";       value = "application/json" },
    ];

    try {
      let responseBody = await OutCall.httpPostRequest(url, headers, payload, dabTransform);
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
