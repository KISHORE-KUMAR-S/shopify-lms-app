import { useRef, useState } from "react";
import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

import { Loading, LoadError, formatDate } from "../components/ui";
import { ApiClientError } from "../lib/api.client";
import { useCreateStudent, useStudents } from "../lib/hooks";

const PAGE_SIZE = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StudentList() {
  const shopify = useAppBridge();
  const modalRef = useRef<HTMLElement & { hideOverlay?: () => void }>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useStudents(page, search);
  const createStudent = useCreateStudent();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string }>({});

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const isEmpty = data && data.total === 0 && search === "";

  const handleAdd = () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Student name is required";
    if (!email.trim()) errors.email = "Email is required";
    else if (!EMAIL_RE.test(email.trim()))
      errors.email = "Enter a valid email address";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    createStudent.mutate(
      { name: name.trim(), email: email.trim().toLowerCase() },
      {
        onSuccess: () => {
          shopify.toast.show("Student added");
          setName("");
          setEmail("");
          modalRef.current?.hideOverlay?.();
        },
        onError: (createError) => {
          if (
            createError instanceof ApiClientError &&
            createError.status === 409
          ) {
            setFieldErrors({ email: createError.message });
          } else {
            shopify.toast.show(
              createError instanceof ApiClientError
                ? createError.message
                : "Could not add student",
              { isError: true },
            );
          }
        },
      },
    );
  };

  return (
    <s-page heading="Students">
      <s-button
        slot="primary-action"
        variant="primary"
        command="--show"
        commandFor="add-student-modal"
      >
        Add student
      </s-button>

      <s-section>
        {isLoading && !data && <Loading label="Loading students" />}
        {error && <LoadError message={(error as Error).message} />}

        {isEmpty && (
          <s-stack direction="block" gap="base">
            <s-heading>No students yet</s-heading>
            <s-paragraph>Add your first student to begin enrollments.</s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-button
                variant="primary"
                command="--show"
                commandFor="add-student-modal"
              >
                Add your first student
              </s-button>
            </s-stack>
          </s-stack>
        )}

        {data && !isEmpty && (
          <s-stack direction="block" gap="base">
            <s-search-field
              label="Search students"
              labelAccessibilityVisibility="exclusive"
              placeholder="Search by name or email"
              value={search}
              onInput={(e) => {
                setSearch((e.target as HTMLInputElement).value);
                setPage(1);
              }}
            />
            {data.items.length === 0 ? (
              <s-paragraph>No students match “{search}”.</s-paragraph>
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
                  <s-table-header>Name</s-table-header>
                  <s-table-header>Email</s-table-header>
                  <s-table-header>Enrollments</s-table-header>
                  <s-table-header>Added</s-table-header>
                </s-table-header-row>
                <s-table-body>
                  {data.items.map((student) => (
                    <s-table-row key={student.id}>
                      <s-table-cell>
                        <s-link href={`/app/students/${student.id}`}>
                          {student.name}
                        </s-link>
                      </s-table-cell>
                      <s-table-cell>{student.email}</s-table-cell>
                      <s-table-cell>
                        {String(student._count?.enrollments ?? 0)}
                      </s-table-cell>
                      <s-table-cell>{formatDate(student.createdAt)}</s-table-cell>
                    </s-table-row>
                  ))}
                </s-table-body>
              </s-table>
            )}
          </s-stack>
        )}
      </s-section>

      <s-modal id="add-student-modal" heading="Add student" ref={modalRef as never}>
        <s-stack direction="block" gap="base">
          <s-text-field
            label="Student name"
            value={name}
            required
            error={fieldErrors.name}
            onInput={(e) => setName((e.target as HTMLInputElement).value)}
          />
          <s-email-field
            label="Email"
            value={email}
            required
            error={fieldErrors.email}
            onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          />
          <s-stack direction="inline" gap="base">
            <s-button
              variant="primary"
              onClick={handleAdd}
              {...(createStudent.isPending ? { loading: true } : {})}
            >
              Add student
            </s-button>
            <s-button command="--hide" commandFor="add-student-modal">
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
