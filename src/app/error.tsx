"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/site/ErrorScreen";
import { content } from "@/config/content";

// An error while showing a page (the layout around it still works).
// reset() tries to show the page again.
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorScreen text={content.errors.error} onRetry={reset} />;
}
