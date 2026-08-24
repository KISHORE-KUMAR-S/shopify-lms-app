import type { CourseStatus, EnrollmentStatus } from "../lib/types";

/** Small shared presentational pieces used across pages. */

export function CourseStatusBadge({ status }: { status: CourseStatus }) {
  return status === "ACTIVE" ? (
    <s-badge tone="success">Active</s-badge>
  ) : (
    <s-badge tone="neutral">Inactive</s-badge>
  );
}

export function EnrollmentStatusBadge({ status }: { status: EnrollmentStatus }) {
  return status === "COMPLETED" ? (
    <s-badge tone="success">Completed</s-badge>
  ) : (
    <s-badge tone="info">In progress</s-badge>
  );
}

/** Centered spinner for full-section loading states. */
export function Loading({ label }: { label: string }) {
  return (
    <s-stack direction="inline" gap="base" justifyContent="center">
      <s-spinner accessibilityLabel={label} size="large" />
    </s-stack>
  );
}

/** Error banner for failed queries. */
export function LoadError({ message }: { message: string }) {
  return (
    <s-banner tone="critical" heading="Something went wrong">
      {message}
    </s-banner>
  );
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
