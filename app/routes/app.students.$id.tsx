import type { HeadersFunction } from "react-router";
import { useParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
  CourseStatusBadge,
  EnrollmentStatusBadge,
  Loading,
  LoadError,
  formatDate,
} from "../components/ui";
import { ApiClientError } from "../lib/api.client";
import { useStudent, useUpdateEnrollmentStatus } from "../lib/hooks";

/** Student dashboard (spec §4): enrolled courses, dates, statuses, count. */
export default function StudentDetail() {
  const { id = "" } = useParams();
  const shopify = useAppBridge();
  const { data: student, isLoading, error } = useStudent(id);
  const updateStatus = useUpdateEnrollmentStatus();

  const toggleStatus = (enrollmentId: string, current: string) => {
    const next = current === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    updateStatus.mutate(
      { id: enrollmentId, status: next },
      {
        onSuccess: () =>
          shopify.toast.show(
            next === "COMPLETED" ? "Marked as completed" : "Marked as in progress",
          ),
        onError: (statusError) =>
          shopify.toast.show(
            statusError instanceof ApiClientError
              ? statusError.message
              : "Could not update status",
            { isError: true },
          ),
      },
    );
  };

  if (isLoading) {
    return (
      <s-page heading="Student">
        <s-section>
          <Loading label="Loading student" />
        </s-section>
      </s-page>
    );
  }

  if (error || !student) {
    return (
      <s-page heading="Student">
        <s-section>
          <LoadError
            message={
              error instanceof ApiClientError ? error.message : "Student not found."
            }
          />
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading={student.name}>
      <s-section heading={`Enrolled courses (${student.enrollmentCount})`}>
        {student.enrollments.length === 0 ? (
          <s-stack direction="block" gap="base">
            <s-paragraph>
              {student.name} is not enrolled in any courses yet.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-button href="/app/enrollments" variant="primary">
                Enroll in a course
              </s-button>
            </s-stack>
          </s-stack>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Course</s-table-header>
              <s-table-header>Instructor</s-table-header>
              <s-table-header>Course status</s-table-header>
              <s-table-header>Enrolled</s-table-header>
              <s-table-header>Enrollment status</s-table-header>
              <s-table-header>Action</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {student.enrollments.map((enrollment) => (
                <s-table-row key={enrollment.id}>
                  <s-table-cell>
                    <s-link href={`/app/courses/${enrollment.course.id}`}>
                      {enrollment.course.title}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>{enrollment.course.instructorName}</s-table-cell>
                  <s-table-cell>
                    <CourseStatusBadge status={enrollment.course.status} />
                  </s-table-cell>
                  <s-table-cell>{formatDate(enrollment.enrolledAt)}</s-table-cell>
                  <s-table-cell>
                    <EnrollmentStatusBadge status={enrollment.status} />
                  </s-table-cell>
                  <s-table-cell>
                    <s-button
                      variant="tertiary"
                      onClick={() => toggleStatus(enrollment.id, enrollment.status)}
                      {...(updateStatus.isPending ? { disabled: true } : {})}
                    >
                      {enrollment.status === "COMPLETED"
                        ? "Mark in progress"
                        : "Mark completed"}
                    </s-button>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section slot="aside" heading="Student">
        <s-paragraph>
          <s-text color="subdued">Email: </s-text>
          {student.email}
        </s-paragraph>
        <s-paragraph>
          <s-text color="subdued">Added: </s-text>
          {formatDate(student.createdAt)}
        </s-paragraph>
        <s-paragraph>
          <s-text color="subdued">Total enrollments: </s-text>
          {String(student.enrollmentCount)}
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
