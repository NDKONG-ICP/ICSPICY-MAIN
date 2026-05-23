import RateLimit "rate-limit";

module {
  public type Bundle = {
    payment : RateLimit.Limiter;
    icpay : RateLimit.Limiter;
    upload : RateLimit.Limiter;
    communityPost : RateLimit.Limiter;
    communityComment : RateLimit.Limiter;
    order : RateLimit.Limiter;
    vote : RateLimit.Limiter;
    withdrawal : RateLimit.Limiter;
  };

  let MINUTE : Int = 60_000_000_000;
  let HOUR : Int = 3_600_000_000_000;

  public func init() : Bundle {
    {
      payment = RateLimit.init({ maxCallsPerWindow = 5; windowSizeNanos = MINUTE });
      icpay = RateLimit.init({ maxCallsPerWindow = 3; windowSizeNanos = MINUTE });
      upload = RateLimit.init({ maxCallsPerWindow = 10; windowSizeNanos = MINUTE });
      communityPost = RateLimit.init({ maxCallsPerWindow = 5; windowSizeNanos = MINUTE });
      communityComment = RateLimit.init({ maxCallsPerWindow = 10; windowSizeNanos = MINUTE });
      order = RateLimit.init({ maxCallsPerWindow = 5; windowSizeNanos = MINUTE });
      vote = RateLimit.init({ maxCallsPerWindow = 3; windowSizeNanos = MINUTE });
      withdrawal = RateLimit.init({ maxCallsPerWindow = 3; windowSizeNanos = HOUR });
    };
  };

  public func cleanupAll(bundle : Bundle) {
    RateLimit.cleanup(bundle.payment);
    RateLimit.cleanup(bundle.icpay);
    RateLimit.cleanup(bundle.upload);
    RateLimit.cleanup(bundle.communityPost);
    RateLimit.cleanup(bundle.communityComment);
    RateLimit.cleanup(bundle.order);
    RateLimit.cleanup(bundle.vote);
    RateLimit.cleanup(bundle.withdrawal);
  };
};
