import RateLimit "rate-limit";

module {
  public type Bundle = {
    payment : RateLimit.Limiter;
    icpay : RateLimit.Limiter;
    paypal : RateLimit.Limiter;
    upload : RateLimit.Limiter;
    videoUpload : RateLimit.Limiter;
    communityPost : RateLimit.Limiter;
    communityComment : RateLimit.Limiter;
    order : RateLimit.Limiter;
    vote : RateLimit.Limiter;
    withdrawal : RateLimit.Limiter;
    adminNotify : RateLimit.Limiter;
    gameScore : RateLimit.Limiter;
    gameSession : RateLimit.Limiter;
    masterclassQuiz : RateLimit.Limiter;
  };

  let MINUTE : Int = 60_000_000_000;
  let HOUR : Int = 3_600_000_000_000;

  public func init() : Bundle {
    {
      payment = RateLimit.init({ maxCallsPerWindow = 5; windowSizeNanos = MINUTE });
      icpay = RateLimit.init({ maxCallsPerWindow = 3; windowSizeNanos = MINUTE });
      paypal = RateLimit.init({ maxCallsPerWindow = 3; windowSizeNanos = MINUTE });
      upload = RateLimit.init({ maxCallsPerWindow = 10; windowSizeNanos = MINUTE });
      videoUpload = RateLimit.init({ maxCallsPerWindow = 2; windowSizeNanos = 10 * MINUTE });
      communityPost = RateLimit.init({ maxCallsPerWindow = 5; windowSizeNanos = MINUTE });
      communityComment = RateLimit.init({ maxCallsPerWindow = 10; windowSizeNanos = MINUTE });
      order = RateLimit.init({ maxCallsPerWindow = 5; windowSizeNanos = MINUTE });
      vote = RateLimit.init({ maxCallsPerWindow = 3; windowSizeNanos = MINUTE });
      withdrawal = RateLimit.init({ maxCallsPerWindow = 3; windowSizeNanos = HOUR });
      adminNotify = RateLimit.init({ maxCallsPerWindow = 20; windowSizeNanos = HOUR });
      gameScore = RateLimit.init({ maxCallsPerWindow = 30; windowSizeNanos = MINUTE });
      gameSession = RateLimit.init({ maxCallsPerWindow = 10; windowSizeNanos = MINUTE });
      masterclassQuiz = RateLimit.init({ maxCallsPerWindow = 20; windowSizeNanos = MINUTE });
    };
  };

  public func cleanupAll(bundle : Bundle) {
    RateLimit.cleanup(bundle.payment);
    RateLimit.cleanup(bundle.icpay);
    RateLimit.cleanup(bundle.paypal);
    RateLimit.cleanup(bundle.upload);
    RateLimit.cleanup(bundle.videoUpload);
    RateLimit.cleanup(bundle.communityPost);
    RateLimit.cleanup(bundle.communityComment);
    RateLimit.cleanup(bundle.order);
    RateLimit.cleanup(bundle.vote);
    RateLimit.cleanup(bundle.withdrawal);
    RateLimit.cleanup(bundle.adminNotify);
    RateLimit.cleanup(bundle.gameScore);
    RateLimit.cleanup(bundle.gameSession);
    RateLimit.cleanup(bundle.masterclassQuiz);
  };
};
