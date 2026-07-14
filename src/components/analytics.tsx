"use client";

import Script from "next/script";

const PLAUSIBLE_DOMAIN =
  process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "vct-visitor-registration-system.vercel.app";

export function Analytics() {
  return (
    <Script
      defer
      data-domain={PLAUSIBLE_DOMAIN}
      src="https://plausible.io/js/script.tagged-events.js"
    />
  );
}
