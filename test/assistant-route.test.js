import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/assistant/route.js";

const profile = { city: "Pune", commute: "Bus", cooking: "LPG", heating: "None", airCleaning: "None", household: "Children under 12", pm25: 140 };

function request(body, headers = {}) {
  return new Request("http://localhost:3000/api/assistant", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

test("keeps AI optional and validates profile input", async () => {
  const previousKey = process.env.AI_API_KEY;
  delete process.env.AI_API_KEY;
  try {
    assert.equal((await POST(request({ action: "plan", profile }))).status, 503);
    assert.equal((await POST(request({ action: "plan", profile: { ...profile, pm25: 900 } }))).status, 400);
  } finally {
    if (previousKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousKey;
  }
});

test("rejects cross-origin calls before contacting the provider", async () => {
  const response = await POST(request({ action: "plan", profile }, { origin: "https://untrusted.example" }));
  assert.equal(response.status, 403);
});

test("sends safety policy as a system message and returns a bounded plan", async () => {
  const previousKey = process.env.AI_API_KEY;
  const previousFetch = globalThis.fetch;
  let sent;
  process.env.AI_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ summary: "A practical plan", sections: [{ title: "Indoor air", items: [{ action: "Use a cleaner room", why: "Reduce indoor sources", impact: "Can help reduce exposure" }] }] }) } }] }), { status: 200 });
  };
  try {
    const response = await POST(request({ action: "plan", profile }));
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.source, "ai");
    assert.equal(result.plan.sections[0].items[0].action, "Use a cleaner room");
    assert.deepEqual(sent.response_format, { type: "json_object" });
    assert.equal(sent.messages[0].role, "system");
    assert.match(sent.messages[0].content, /Do not diagnose/);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousKey;
  }
});

test("keeps chat policy separate and accepts bounded follow-up context", async () => {
  const previousKey = process.env.AI_API_KEY;
  const previousFetch = globalThis.fetch;
  let sent;
  process.env.AI_API_KEY = "test-key";
  globalThis.fetch = async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify({ choices: [{ message: { content: "Keep one room cleaner." } }] }), { status: 200 });
  };
  try {
    const response = await POST(request({ action: "ask", profile, history: [{ role: "user", content: "We have a child at home." }, { role: "assistant", content: "I will keep that in mind." }], question: "What about the bedroom?" }));
    assert.equal(response.status, 200);
    assert.deepEqual(sent.messages.map(message => message.role), ["system", "user", "assistant", "user"]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.AI_API_KEY;
    else process.env.AI_API_KEY = previousKey;
  }
});