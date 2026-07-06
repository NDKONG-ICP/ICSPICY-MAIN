// SpicyAi chatbot prompt assembly and LLM integration.
//
// Responsibilities:
//   - Build the system prompt from brand-voice persona + retrieved chunks
//   - Call the LLM canister via mo:llm 2.1.0
//   - Zero-log policy: NEVER log question text, user content, or answers

import LLM   "mo:llm";
import Types  "../types";
import Array  "mo:core/Array";
import Text   "mo:core/Text";

module {

  // ── Persona descriptions ──────────────────────────────────────────────────

  func personaBlurb(p : Types.PersonaPreset) : Text {
    switch (p) {
      case (#charming) {
        "You are charming, confident, fiery, and a little rebellious — like the peppers. " #
        "You love food, farming, and honest craft. You are never salesy. " #
        "Keep answers punchy, warm, and occasionally witty."
      };
      case (#spec) {
        "You are precise and informational. Answer factually from the documents. " #
        "Minimal prose. Use bullet points where appropriate."
      };
      case (#founder) {
        "You speak as the IC SPICY founder — passionate, direct, and personal. " #
        "Use 'we' and 'our farm'. Share genuine enthusiasm for rare peppers and on-chain provenance."
      };
      case (#gardener) {
        "You are a master natural farmer deeply versed in Korean Natural Farming (KNF) " #
        "and JADAM Organic Farming. You respect the teachings of Master Han-Kyu Cho (CGNF), " #
        "Youngsang Cho (JADAM), and educators like Chris Trump and Matt Powers. " #
        "Give precise, practical advice on soil biology, fermented inputs (IMO, LAB, FPJ, FAA, OHN, " #
        "WCA, WCP, seawater, BRV), JADAM preparations (JMS, JS, JWA, JHS), " #
        "and growing rare Capsicum peppers in Florida's Zone 10a/10b climate. " #
        "Always cite the specific input, dilution ratio, and growth stage where relevant. " #
        "Be warm and encouraging — natural farming is joyful, not intimidating."
      };
    }
  };

  // ── System prompt builder ─────────────────────────────────────────────────

  // Assembles the full system prompt from retrieved document chunks.
  // docTitles: [(slug, title)] for labelling excerpt headers.
  public func buildSystemPrompt(
    config     : Types.ChatbotConfig,
    chunks     : [Text],
    docTitles  : [(Text, Text)],
    slugsRef   : [Text],
  ) : Text {
    let persona = personaBlurb(config.persona);

    var excerptBlock = "";
    var i = 0;
    for (chunk in chunks.vals()) {
      let header = if (i < slugsRef.size()) {
        let slug = slugsRef[i];
        let title = switch (Array.find<(Text, Text)>(docTitles, func((s, _)) { s == slug })) {
          case (?(_, t)) { t };
          case null       { slug };
        };
        "From \"" # title # "\":\n"
      } else { "" };
      excerptBlock #= "---\n" # header # chunk # "\n";
      i += 1;
    };

    let noChunks = if (chunks.size() == 0) {
      "No specific document excerpts were retrieved. " #
      "Answer based on general IC SPICY brand knowledge if confident, or admit uncertainty.\n"
    } else { "" };

    let extra = if (config.systemPromptExtra.size() > 0) {
      "\n\nAdditional guidance:\n" # config.systemPromptExtra
    } else { "" };

    "You are SpicyAi — IC SPICY's brand concierge, natural farming guide, and knowledge assistant. " #
    "IC SPICY is a premium Florida rare-pepper nursery and artisan seasoning brand " #
    "with on-chain provenance on the Internet Computer (ICP). Tagline: Rare. Hot. Alive.\n\n" #
    "Persona: " # persona # "\n\n" #
    "BRAND DOCUMENT EXCERPTS:\n" # noChunks # excerptBlock # "\n" #
    "RULES:\n" #
    "1. Answer ONLY from the excerpts above or established IC SPICY brand facts.\n" #
    "2. If the answer is not in the excerpts: " #
    "\"That is not in my current briefing — you might find it in [document name].\"\n" #
    "3. Never fabricate product prices, canister IDs, or financial figures.\n" #
    "4. Keep answers under 250 words unless the user asks for more.\n" #
    "5. Do not reveal that you are an AI or LLM unless directly asked.\n" #
    "6. When a user asks about a specific pepper or plant variety, answer from VARIETY knowledge documents " #
    "(Pepperpedia entries beginning with \"VARIETY:\"). Always credit the breeder when known. " #
    "Offer the in-app growing guide link (/variety/{id}/guide) and mention the variety can be tracked in NIMS. " #
    "If the variety is not in the knowledge base, say so honestly — do NOT invent Scoville numbers or breeder credits.\n" #
    extra
  };

  // ── LLM call ─────────────────────────────────────────────────────────────

  // Calls the LLM canister. Returns the assistant response text.
  // ZERO-LOG: this function never logs any message content.
  public func callLLM(
    systemPrompt : Text,
    history      : [Types.ChatMessage],
  ) : async Types.ChatResponse {
    // Convert our Types.ChatMessage to mo:llm's ChatMessage variant.
    var msgs : [LLM.ChatMessage] = [
      #system_({ content = systemPrompt }),
    ];
    for (m in history.vals()) {
      let llmMsg : LLM.ChatMessage = switch (m.role) {
        case (#user)      { #user({ content = m.content }) };
        case (#assistant) { #assistant({ content = ?m.content; tool_calls = [] }) };
      };
      msgs := Array.concat(msgs, [llmMsg]);
    };

    try {
      let resp = await LLM.chat(#Llama4Scout).withMessages(msgs).send();
      switch (resp.message.content) {
        case (?txt) {
          if (txt.size() == 0) { #err(#noContent) }
          else                 { #ok({ response = txt; docsReferenced = [] }) }
        };
        case null { #err(#noContent) };
      }
    } catch (_) {
      // Generic error — no user content in the message.
      #err(#llmError("LLM service unavailable. Please try again."))
    }
  };
};
