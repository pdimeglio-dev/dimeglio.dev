import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  const { captureServerError } = await import("@/lib/posthog-server");
  captureServerError(err, {
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
    digest: err instanceof Error ? (err as Error & { digest?: string }).digest : undefined,
  });
};
