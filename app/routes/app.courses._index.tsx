import { useState } from "react";
import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  CourseStatusBadge,
  Loading,
  LoadError,
  formatDate,
} from "../components/ui";
import { useCourses } from "../lib/hooks";

const PAGE_SIZE = 20;

export default function CourseList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useCourses(page, search);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const isEmpty = data && data.total === 0 && search === "";

  return (
    <s-page heading="Courses">
      <s-button slot="primary-action" variant="primary" href="/app/courses/new">
        Create course
      </s-button>

      <s-section>
        {isLoading && !data && <Loading label="Loading courses" />}
        {error && <LoadError message={(error as Error).message} />}

        {isEmpty && (
          <s-stack direction="block" gap="base">
            <s-heading>No courses yet</s-heading>
            <s-paragraph>
              Create your first course to start enrolling students.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-button variant="primary" href="/app/courses/new">
                Create your first course
              </s-button>
            </s-stack>
          </s-stack>
        )}

        {data && !isEmpty && (
          <s-stack direction="block" gap="base">
            <s-search-field
              label="Search courses"
              labelAccessibilityVisibility="exclusive"
              placeholder="Search by title, instructor, or category"
              value={search}
              onInput={(e) => {
                setSearch((e.target as HTMLInputElement).value);
                setPage(1);
              }}
            />
            {data.items.length === 0 ? (
              <s-paragraph>No courses match “{search}”.</s-paragraph>
            ) : (
              <s-table
                paginate
                hasPreviousPage={page > 1}
                hasNextPage={page < totalPages}
                onPreviousPage={() => setPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setPage((p) => p + 1)}
                {...(isLoading ? { loading: true } : {})}
              >
                <s-table-header-row>
                  <s-table-header>Title</s-table-header>
                  <s-table-header>Instructor</s-table-header>
                  <s-table-header>Category</s-table-header>
                  <s-table-header>Duration</s-table-header>
                  <s-table-header>Enrolled</s-table-header>
                  <s-table-header>Status</s-table-header>
                  <s-table-header>Created</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {data.items.map((course) => (
                    <s-table-row key={course.id}>
                      <s-table-cell>
                        <s-link href={`/app/courses/${course.id}`}>
                          {course.title}
                        </s-link>
                      </s-table-cell>
                      <s-table-cell>{course.instructorName}</s-table-cell>
                      <s-table-cell>{course.category ?? "—"}</s-table-cell>
                      <s-table-cell>
                        {course.duration != null ? `${course.duration} h` : "—"}
                      </s-table-cell>
                      <s-table-cell>
                        {String(course._count?.enrollments ?? 0)}
                      </s-table-cell>
                      <s-table-cell>
                        <CourseStatusBadge status={course.status} />
                      </s-table-cell>
                      <s-table-cell>{formatDate(course.createdAt)}</s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>
            )}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
