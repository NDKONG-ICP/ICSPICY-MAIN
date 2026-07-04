import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  /// In-flight chunked video upload. Held in TRANSIENT state — sessions do
  /// not survive upgrades (users simply restart the upload).
  public type VideoUploadSession = {
    owner : Principal;
    contentType : Text;
    totalSize : Nat;
    startedAt : Int;
    chunks : Map.Map<Nat, Blob>;
    var receivedBytes : Nat;
  };

  public type FinishVideoUploadResult = {
    videoKey : Text;
    posterKey : ?Text;
  };
};
