import { useRef, useState } from "react";
import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

import {
  EnrollmentStatusBadge,
  Loading,
  LoadError,
  formatDate,
} from "../components/ui";
import { ApiClientError } from "../lib/api.client";
import {
  useCourses,
  useCreateEnrollment,
  useEnrollments,
  useStudents,
  useUpdateEnrollmentStatus,
} from "../lib/hooks";

const PAGE_SIZE = 20;

export default function EnrollmentList() {
  const shopify = useAppBridge();
  const modalRef = useRef<HTMLElement & { hideOverlay?: () => void }>(null);

  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useEnrollments(page);

  // Pickers for the enroll modal. First 100 of each — plenty for this app.
  const { data: courses } = useCourses(1, "");
  const { data: students } = useStudents(1, "");

  const createEnrollment = useCreateEnrollment();
  const updateStatus = useUpdateEnrollmentStatus();

  const [studentId, setStudentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const isEmpty = data && data.total === 0;
  const activeCourses = courses?.items.filter((c) => c.status === "ACTIVE") ?? [];

  const handleEnroll = () => {
    setFormError(null);
    setDuplicateError(null);
    if (!studentId || !courseId) {
      setFormError("Select both a student and a course.");
      return;
    }
    createEnrollment.mutate(
      { studentId, courseId },
      {
        onSuccess: () => {
          shopify.toast.show("Student enrolled");
          setStudentId("");
          setCourseId("");
          modalRef.current?.hideOverlay?.();
        },
        onError: (enrollError) => {
          if (enrollError instanceof ApiClientError && enrollError.status === 409) {
            // Friendly duplicate-enrollment message (spec §9).
            setDuplicateError(enrollError.message);
          } else {
            setFormError(
              enrollError instanceof ApiClientError
                ? enrollError.message
                : "Could not enroll student.",
            );
          }
        },
      },
    );
  };

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

  return (
    <s-page heading="Enrollments">
      <s-button
        slot="primary-action"
        variant="primary"
        command="--show"
        commandFor="enroll-modal"
      >
        Enroll student
      </s-button>

      <s-section>
        {isLoading && !data && <Loading label="Loading enrollments" />}
        {error && <LoadError message={(error as Error).message} />}

        {isEmpty && (
          <s-stack direction="block" gap="base">
            <s-heading>No enrollments yet</s-heading>
            <s-paragraph>
              Enroll a student in a course to see enrollments here.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-button variant="primary" command="--show" commandFor="enroll-modal">
                Enroll a student
              </s-button>
            </s-stack>
          </s-stack>
        )}

        {data && !isEmpty && (
          <s-table
            paginate
            hasPreviousPage={page > 1}
            hasNextPage={page < totalPages}
            onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
            onNextPage={() => setPage((p) => p + 1)}
            {...(isLoading ? { loading: true } : {})}
          >
            <s-table-header-row>
              <s-table-header>Student</s-table-header>
              <s-table-header>Course</s-table-header>
              <s-table-header>Enrolled</s-table-header>
              <s-table-header>Status</s-table-header>
              <s-table-header>Action</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {data.items.map((enrollment) => (
                <s-table-row key={enrollment.id}>
                  <s-table-cell>
                    <s-link href={`/app/students/${enrollment.student.id}`}>
                      {enrollment.student.name}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>
                    <s-link href={`/app/courses/${enrollment.course.id}`}>
                      {enrollment.course.title}
                    </s-link>
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

      <s-modal id="enroll-modal" heading="Enroll a student" ref={modalRef as never}>
        <s-stack direction="block" gap="base">
          {duplicateError && (
            <s-banner tone="warning" heading="Already enrolled">
              {duplicateError}
            </s-banner>
          )}
          {formError && (
            <s-banner tone="critical" heading="Could not enroll">
              {formError}
            </s-banner>
          )}
          <s-select
            label="Student"
            value={studentId}
            placeholder="Select a student"
            required
            onChange={(e) => setStudentId((e.target as HTMLSelectElement).value)}
          >
            {(students?.items ?? []).map((student) => (
              <s-option key={student.id} value={student.id}>
                {`${student.name} (${student.email})`}
              </s-option>
            ))}
          </s-select>
          <s-select
            label="Course"
            value={courseId}
            placeholder="Select a course"
            required
            details="Only active courses can accept enrollments."
            onChange={(e) => setCourseId((e.target as HTMLSelectElement).value)}
          >
            {activeCourses.map((course) => (
              <s-option key={course.id} value={course.id}>
                {course.title}
              </s-option>
            ))}
          </s-select>
          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              onClick={handleEnroll}
              {...(createEnrollment.isPending ? { loading: true } : {})}
            >
              Enroll
            </s-button>
            <s-button command="--hide" commandFor="enroll-modal">
              Cancel
            </s-button>
          </s-stack>
        </s-stack>
      </s-modal>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
