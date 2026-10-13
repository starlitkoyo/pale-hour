// 個別相談の申込フォームへの短いリンク。開かれた回数を数えてからフォームへ飛ばす。
import { waitUntil } from "@vercel/functions";
import { FORM_URL } from "./_koi/texts.js";
import { countStat } from "./_koi/stats.js";

export function GET() {
  waitUntil(countStat("click"));
  return Response.redirect(FORM_URL, 302);
}
