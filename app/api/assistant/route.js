export const runtime = "nodejs";

const maxBodyBytes = 16_384;
const systemPrompt = "You are Clear Air, a practical assistant for families navigating urban air pollution. Give affordable, location- and lifestyle-aware suggestions. Do not diagnose or promise health outcomes. PM2.5 values supplied by the user may be estimates; do not treat them as live readings or as an AQI. Avoid unsupported precise exposure-reduction percentages. Explain likely direction of impact in plain language, say when evidence varies, prioritize official local advisories, and recommend medical care for symptoms or urgent concerns. Never claim to have checked current conditions.";
let rateWindowStart = Date.now();
let requestCount = 0;

function json(status, value) {
  return Response.json(value, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

async function readJson(request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maxBodyBytes) throw Object.assign(new Error("Request too large"), { status: 413 });
  if (!request.body) throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBodyBytes) {
      await reader.cancel();
      throw Object.assign(new Error("Request too large"), { status: 413 });
    }
    chunks.push(value);
  }
  try {
    const content = Buffer.concat(chunks).toString("utf8");
    return JSON.parse(content);
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

function normalizeInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body) || !["plan", "ask"].includes(body.action)) throw new Error("Invalid request");
  const source = body.profile;
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("Invalid profile");
  const profile = {};
  for (const key of ["city", "commute", "cooking", "heating", "airCleaning", "household"]) {
    if (typeof source[key] !== "string" || source[key].trim().length > 100) throw new Error("Invalid profile");
    profile[key] = source[key].trim();
  }
  const pm25 = Number(source.pm25);
  if (!Number.isFinite(pm25) || pm25 < 5 || pm25 > 500) throw new Error("Invalid PM2.5 value");
  profile.pm25 = pm25;
  let question = "";
  let history = [];
  if (body.action === "ask") {
    if (typeof body.question !== "string" || !body.question.trim() || body.question.length > 1200) throw new Error("Invalid question");
    question = body.question.trim();
    if (body.history !== undefined && (!Array.isArray(body.history) || body.history.length > 6)) throw new Error("Invalid conversation history");
    history = (body.history || []).map(message => {
      if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string" || !message.content.trim() || message.content.length > 1200) throw new Error("Invalid conversation history");
      return { role: message.role, content: message.content.trim() };
    });
  }
  return { action: body.action, profile, question, history };
}

function cleanPlan(value) {
  const parsed = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.sections)) throw new Error("Invalid assistant response");
  const text = (input, limit) => typeof input === "string" ? input.trim().slice(0, limit) : "";
  return {
    summary: text(parsed.summary, 500),
    sections: parsed.sections.slice(0, 4).map(section => ({
      title: text(section?.title, 60),
      items: Array.isArray(section?.items) ? section.items.slice(0, 4).map(item => ({
        action: text(item?.action, 180),
        why: text(item?.why, 220),
        impact: text(item?.impact, 140)
      })).filter(item => item.action) : []
    })).filter(section => section.title)
  };
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== request.headers.get("host")) return json(403, { error: "Cross-origin request rejected" });
    } catch {
      return json(403, { error: "Cross-origin request rejected" });
    }
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return json(415, { error: "Expected JSON" });
  const now = Date.now();
  if (now - rateWindowStart > 60_000) {
    rateWindowStart = now;
    requestCount = 0;
  }
  if (requestCount >= 40) return json(429, { error: "Please wait a moment before trying again." });
  requestCount += 1;

  try {
    const input = normalizeInput(await readJson(request));
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) return json(503, { error: "AI is not configured. Showing the offline plan instead." });
    const userContent = input.action === "plan"
      ? `Create a household plan for this profile: ${JSON.stringify(input.profile)}. Return only JSON with summary and sections. Use the section titles Daily routine, Indoor air, Sustainable swaps, and Community. Give 1-3 practical items per relevant section; each item has action, why, and impact. Keep impacts qualitative unless a well-supported number and its conditions are known.`
      : `Household profile: ${JSON.stringify(input.profile)}\nQuestion: ${input.question}\nAnswer in under 140 words.`;
    const messages = [{ role: "system", content: systemPrompt }, ...(input.action === "ask" ? input.history : []), { role: "user", content: userContent }];
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model: process.env.AI_MODEL || "gpt-4o-mini", temperature: 0.3, max_tokens: input.action === "plan" ? 1100 : 350, messages, ...(input.action === "plan" ? { response_format: { type: "json_object" } } : {}) }),
      signal: AbortSignal.timeout(20_000)
    });
    if (!upstream.ok) return json(502, { error: "The AI service is temporarily unavailable." });
    const result = await upstream.json();
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return json(502, { error: "The AI returned an empty response." });
    if (input.action === "plan") {
      try {
        return json(200, { plan: cleanPlan(content), source: "ai" });
      } catch {
        return json(502, { error: "The AI returned an unreadable plan." });
      }
    }
    return json(200, { reply: content.trim().slice(0, 4000), source: "ai" });
  } catch (error) {
    const status = error.status || (error.message.startsWith("Invalid") ? 400 : 500);
    return json(status, { error: status === 500 ? "Could not reach the assistant." : error.message });
  }
}