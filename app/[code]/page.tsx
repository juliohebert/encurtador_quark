import { notFound, redirect } from "next/navigation";
import { findOriginalUrl } from "@/lib/links";
import { isValidShortCode } from "@/lib/short-code";

export const dynamic = "force-dynamic";

export default async function ShortCodePage({ params }: PageProps<"/[code]">) {
  const { code } = await params;

  if (!isValidShortCode(code)) {
    notFound();
  }

  const originalUrl = await findOriginalUrl(code);
  if (!originalUrl) {
    notFound();
  }

  redirect(originalUrl);
}
