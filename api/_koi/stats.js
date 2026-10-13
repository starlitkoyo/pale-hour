// 個別相談への導線を数える（案内を出した回数・メニューを押した回数・申込リンクを開いた回数）。
// Upstash の Data Browser で koi:stat:* を見ると日別の数が分かる。
import { Redis } from "@upstash/redis";

const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = url && token ? new Redis({ url, token }) : null;

export function todayJst() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export async function countStat(name) {
  console.log("stat", name);
  if (!redis) return;
  try {
    await redis.incr(`koi:stat:${name}:${todayJst()}`);
  } catch (err) {
    console.error("stat", err);
  }
}

// 運営者（しろもも）のLINEだけが「集計」で数を見られる。userId はそのまま書かず、ハッシュで照合する
import crypto from "node:crypto";
const ADMIN_HASHES = new Set(["57e02bb52c0834f30ce834c91d122b12d24205f9d7d577ba2c1dba3b09e39d96"]);
export function isAdmin(userId) {
  return ADMIN_HASHES.has(crypto.createHash("sha256").update(userId).digest("hex"));
}

const NAMES = [
  ["bridge", "恋AIが個別相談を案内した"],
  ["bridge_limit", "1日の上限で案内した"],
  ["menu", "メニューの個別相談を押した"],
  ["click", "申込リンクを開いた"],
];

export async function statsReport(days = 7) {
  if (!redis) return ["数を記録する場所（Upstash）につながっていません。"];
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(new Date(Date.now() + 9 * 3600 * 1000 - i * 86400000).toISOString().slice(0, 10));
  }
  const keys = [];
  for (const [n] of NAMES) for (const d of dates) keys.push(`koi:stat:${n}:${d}`);
  const vals = await redis.mget(...keys);
  const get = (ni, di) => Number(vals[ni * dates.length + di] ?? 0);
  const totals = NAMES.map((_, ni) => dates.reduce((a, _, di) => a + get(ni, di), 0));
  const lines = [`恋AIの数（直近${days}日の合計）`, ""];
  NAMES.forEach(([, label], ni) => lines.push(`${label}：${totals[ni]}`));
  const shown = totals[0] + totals[1] + totals[2];
  lines.push("", `案内を見た数 ${shown} のうち、申込リンクを開いたのは ${totals[3]}`);
  lines.push("", "日ごと（案内／上限／メニュー／リンク）");
  dates.forEach((d, di) => {
    const row = NAMES.map((_, ni) => get(ni, di));
    if (row.some((v) => v)) lines.push(`${d.slice(5).replace("-", "/")}　${row.join("／")}`);
  });
  lines.push("", "申し込んだ数は、Googleフォームの「回答」で見てください。");
  return [lines.join(String.fromCharCode(10))];
}
