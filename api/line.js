// LINE 公式アカウントの webhook。恋AI（Claude）が相談に返事をする。
// 必要な環境変数（Vercel の Settings → Environment Variables）
//   LINE_CHANNEL_SECRET        … LINE Developers のチャネルシークレット
//   LINE_CHANNEL_ACCESS_TOKEN  … LINE Developers のチャネルアクセストークン（長期）
//   ANTHROPIC_API_KEY          … Claude の API キー
//   KV_REST_API_URL / KV_REST_API_TOKEN（または UPSTASH_REDIS_REST_URL / _TOKEN）… 会話の記憶と1日の回数制限
// 任意
//   KOI_MODEL（既定 claude-opus-5-5）／KOI_EFFORT（既定 low）／KOI_DAILY_LIMIT（既定 15）

import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { waitUntil } from "@vercel/functions";
import { SYSTEM_PROMPT } from "./_koi/prompt.js";
import { redis, todayJst, countStat, isAdmin, statsReport } from "./_koi/stats.js";
import {
  GREETING, PHASE_RESULTS, PHASE_ALIASES, MENU_REPLIES, RESET_REPLY, LIMIT_REPLY,
  TOO_LONG_REPLY, NON_TEXT_REPLY, REFUSAL_REPLY, ERROR_REPLY,
} from "./_koi/texts.js";

const MODEL = process.env.KOI_MODEL || "claude-opus-5-5";
const EFFORT = process.env.KOI_EFFORT || "low";
const DAILY_LIMIT = Number(process.env.KOI_DAILY_LIMIT || 15);
const MAX_INPUT_CHARS = 2000;
const MAX_HISTORY_MESSAGES = 24; // user と assistant を合わせた数（12往復）
const HISTORY_TTL_SEC = 60 * 60 * 24 * 30; // 30日で消える（プライバシーポリシーと合わせる）
const FALLBACK_MODELS = /^claude-(opus|fable|sonnet)-/; // Haiku は server-side fallback 非対応


const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY?.trim(), timeout: 50_000, maxRetries: 1 });

export function GET() {
  return new Response("ok");
}

export async function POST(request) {
  const secret = process.env.LINE_CHANNEL_SECRET?.trim();
  if (!secret || !lineToken()) {
    return new Response("not configured", { status: 200 });
  }
  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-line-signature"), secret)) {
    // 値は出さず、長さだけ残す（チャネルシークレットは32文字）
    console.error("bad signature", { secretLength: secret.length, hasSignature: !!request.headers.get("x-line-signature") });
    return new Response("bad signature", { status: 401 });
  }
  const { events = [] } = JSON.parse(body);
  // LINE には先に200を返し、返事はバックグラウンドで作る（Claude の返事は数十秒かかることがある）
  for (const event of events) {
    if (event.deliveryContext?.isRedelivery) continue;
    waitUntil(handleEvent(event).catch((err) => console.error("handleEvent", err)));
  }
  return new Response("ok");
}

function validSignature(body, signature, secret) {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function handleEvent(event) {
  const userId = event.source?.userId;
  if (event.type === "follow") return reply(event, userId, GREETING);
  if (event.type !== "message" || !userId) return;
  if (event.message.type !== "text") return reply(event, userId, NON_TEXT_REPLY);

  const text = event.message.text.trim();

  const phaseKey = PHASE_ALIASES[normalizePhase(text)];
  if (phaseKey) return reply(event, userId, PHASE_RESULTS[phaseKey]);

  const menu = MENU_REPLIES[text];
  if (menu) {
    if (text === "個別相談") await countStat("menu");
    return reply(event, userId, menu.map(fillLimit));
  }

  if (text === "集計" && isAdmin(userId)) return reply(event, userId, await statsReport(7));

  if (text === "リセット") {
    if (redis) await redis.del(historyKey(userId));
    return reply(event, userId, RESET_REPLY);
  }

  if (text.length > MAX_INPUT_CHARS) return reply(event, userId, TOO_LONG_REPLY);

  if (redis && (await countToday(userId)) > DAILY_LIMIT) {
    await countStat("bridge_limit");
    return reply(event, userId, LIMIT_REPLY.map(fillLimit));
  }

  await startLoading(userId);

  const history = redis ? ((await redis.get(historyKey(userId))) ?? []) : [];
  let messages = [...history, { role: "user", content: text }];

  let response;
  try {
    response = await askClaude(messages);
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError) {
      // 指示文を変えたあとなどに、古い thinking ブロックが弾かれることがある。
      // 一度だけ、履歴から thinking を外して再送する（文字の会話は残る）
      console.error("claude 400, retrying without thinking blocks", err.message);
      messages = stripThinking(messages);
      try {
        response = await askClaude(messages);
      } catch (err2) {
        console.error("claude retry", err2);
        return reply(event, userId, ERROR_REPLY);
      }
    } else {
      console.error("claude", err);
      return reply(event, userId, ERROR_REPLY);
    }
  }

  if (response.stop_reason === "refusal") return reply(event, userId, REFUSAL_REPLY);

  const answer = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  if (!answer) return reply(event, userId, ERROR_REPLY);

  if (redis) {
    // 返ってきた content は（thinking ブロックも含めて）そのまま保存して次の回に渡す。
    // 古い会話は先頭から2件ずつ（user＋assistant）落とす。途中を消すと thinking の検証で400になる。
    const next = [...messages, { role: "assistant", content: response.content }];
    while (next.length > MAX_HISTORY_MESSAGES) next.splice(0, 2);
    await redis.set(historyKey(userId), next, { ex: HISTORY_TTL_SEC });
  }

  if (answer.includes("pale-hour.com/api/go")) await countStat("bridge");
  return reply(event, userId, splitForLine(answer));
}

async function askClaude(messages) {
  const params = {
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: EFFORT },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    cache_control: { type: "ephemeral" },
    messages,
  };
  if (FALLBACK_MODELS.test(MODEL)) {
    // 安全分類で断られたとき、サーバー側で別のモデルに回して返事を作る
    return anthropic.beta.messages.create({
      ...params,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
  }
  return anthropic.messages.create(params);
}

function stripThinking(messages) {
  return messages.map((m) =>
    Array.isArray(m.content)
      ? { ...m, content: m.content.filter((b) => b.type !== "thinking" && b.type !== "redacted_thinking") }
      : m,
  );
}

function normalizePhase(text) {
  return text
    .toLowerCase()
    .replace(/^診断(結果)?[:：]?/, "")
    .replace(/[\s　]/g, "")
    .replace(/／/g, "/");
}

function fillLimit(s) {
  return s.replaceAll("{LIMIT}", String(DAILY_LIMIT));
}

function historyKey(userId) {
  return `koi:hist:${userId}`;
}

async function countToday(userId) {
  const key = `koi:count:${userId}:${todayJst()}`;
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 60 * 60 * 48);
  return n;
}

// LINE の1吹き出しは5,000字まで。念のため1,500字ごとに区切り、5吹き出しまで
function splitForLine(text) {
  const parts = [];
  let rest = text;
  while (rest.length > 1500 && parts.length < 4) {
    const cut = rest.lastIndexOf("\n", 1500);
    const at = cut > 500 ? cut : 1500;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  parts.push(rest);
  return parts;
}

async function startLoading(userId) {
  try {
    await lineApi("/v2/bot/chat/loading/start", { chatId: userId, loadingSeconds: 60 });
  } catch (err) {
    console.error("loading", err);
  }
}

async function reply(event, userId, texts) {
  const messages = texts.slice(0, 5).map((text) => ({ type: "text", text }));
  try {
    await lineApi("/v2/bot/message/reply", { replyToken: event.replyToken, messages });
  } catch (err) {
    // 返事に時間がかかって replyToken が切れたときは push で送る（月の送信数に数えられる）
    if (!userId) throw err;
    console.error("reply failed, pushing", err);
    await lineApi("/v2/bot/message/push", { to: userId, messages });
  }
}

function lineToken() {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
}

async function lineApi(path, payload) {
  const res = await fetch(`https://api.line.me${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lineToken()}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`LINE ${path} ${res.status} ${await res.text()}`);
}
