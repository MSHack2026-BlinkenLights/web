/**
 * Only allows same-origin paths to prevent open redirects.
 *
 * @param next - The requested redirect target, usually the `next` search param.
 * @returns The path when it is same-origin, otherwise `/`.
 */
export function safeRedirectPath(next: string | undefined) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}
