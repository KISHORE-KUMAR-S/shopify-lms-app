import { useRef } from "react";
import type { HeadersFunction } from "react-router";
import { useNavigate, useParams } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

import { CourseForm } from "../components/CourseForm";
import {
  EnrollmentStatusBadge,
  Loading,
  LoadError,
  formatDate,
} from "../components/ui";
import { ApiClientError } from "../lib/api.client";
import { useCourse, useDeleteCourse, useUpdateCourse } from "../lib/hooks";
import type { CourseInput } from "../lib/types";

export default function CourseDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const modalRef = useRef<HTMLElement & { hideOverlay?: () => void }>(null);

  const { data: course, isLoading, error } = useCourse(id);
  const updateCourse = useUpdateCourse(id);
  const deleteCourse = useDeleteCourse();

  const handleUpdate = (input: CourseInput) => {
    updateCourse.mutate(input, {
      onSuccess: () => shopify.toast.show("Course updated"),
    });
  };

  const handleDelete = () => {
    deleteCourse.mutate(id, {
      onSuccess: () => {
        shopify.toast.show("Course deleted");
        void navigate("/app/courses");
      },
      onError: (deleteError) => {
        shopify.toast.show(
          deleteError instanceof ApiClientError
            ? deleteError.message
            : "Could not delete course",
          { isError: true },
        );
      },
    });
    modalRef.current?.hideOverlay?.();
  };

  if (isLoading) {
    return (
      <s-page heading="Course">
        <s-section>
          <Loading label="Loading course" />
        </s-section>
      </s-page>
    );
  }

  if (error || !course) {
    return (
      <s-page heading="Course">
        <s-section>
          <LoadError
            message={
              error instanceof ApiClientError
                ? error.message
                : "Course not found."
            }
          />
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading={course.title}>
      <s-button
        slot="primary-action"
        tone="critical"
        variant="primary"
        command="--show"
        commandFor="delete-course-modal"
      >
        Delete course
      </s-button>

      <s-section heading="Course details">
        <CourseForm
          key={course.updatedAt}
          initial={course}
          submitLabel="Save changes"
          saving={updateCourse.isPending}
          onSubmit={handleUpdate}
          error={
            updateCourse.error instanceof ApiClientError
              ? updateCourse.error
              : null
          }
        />
      </s-section>

      <s-section heading={`Enrollments (${course.enrollments.length})`}>
        {course.enrollments.length === 0 ? (
          <s-paragraph>No students enrolled in this course yet.</s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Student</s-table-header>
              <s-table-header>Email</s-table-header>
              <s-table-header>Enrolled</s-table-header>
              <s-table-header>Status</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {course.enrollments.map((enrollment) => (
                <s-table-row key={enrollment.id}>
                  <s-table-cell>
                    <s-link href={`/app/students/${enrollment.student.id}`}>
                      {enrollment.student.name}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>{enrollment.student.email}</s-table-cell>
                  <s-table-cell>{formatDate(enrollment.enrolledAt)}</s-table-cell>
                  <s-table-cell>
                    <EnrollmentStatusBadge status={enrollment.status} />
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      <s-section slot="aside" heading="Metadata">
        <s-paragraph>
          <s-text color="subdued">Created: </s-text>
          {formatDate(course.createdAt)}
        </s-paragraph>
        <s-paragraph>
          <s-text color="subdued">Last updated: </s-text>
          {formatDate(course.updatedAt)}
        </s-paragraph>
      </s-section>

      <s-modal
        id="delete-course-modal"
        heading="Delete course?"
        ref={modalRef as never}
      >
        <s-paragraph>
          This permanently deletes “{course.title}” and all of its enrollments.
          This action cannot be undone.
        </s-paragraph>
        <s-stack direction="inline" gap="base">
          <s-button
            tone="critical"
            variant="primary"
            onClick={handleDelete}
            {...(deleteCourse.isPending ? { loading: true } : {})}
          >
            Delete
          </s-button>
          <s-button command="--hide" commandFor="delete-course-modal">
            Cancel
          </s-button>
        </s-stack>
      </s-modal>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
