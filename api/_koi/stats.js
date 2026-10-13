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
