/** Outcome of a form submission. */
export interface FormResult {
  error?: string | null;
  success?: string | null;
}

/**
 * Shows the outcome of a form submission: an error in magenta or a success message in green.
 *
 * @param props - The error and success messages; the error wins if both are set.
 * @returns The status line, or nothing when there is no message.
 */
export function FormStatus({ error, success }: FormResult) {
  if (error) {
    return (
      <p role="alert" className="text-neon-magenta text-sm">
        {error}
      </p>
    );
  }
  if (success) {
    return (
      <p role="status" className="text-neon-green text-sm">
        {success}
      </p>
    );
  }
  return null;
}
