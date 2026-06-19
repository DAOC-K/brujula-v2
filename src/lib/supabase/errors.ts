type SupabaseLikeError = {
  code?: string;
  message?: string;
} | null | undefined;

export function isUniqueViolation(error: SupabaseLikeError) {
  return (
    error?.code === "23505" ||
    error?.message?.toLowerCase().includes("duplicate key") === true ||
    error?.message?.toLowerCase().includes("already exists") === true
  );
}
