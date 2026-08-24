import { useState } from "react";

import { ApiClientError } from "../lib/api.client";
import type { Course, CourseInput, CourseStatus } from "../lib/types";

type Props = {
  /** When set, the form edits this course; otherwise it creates one. */
  initial?: Course;
  submitLabel: string;
  saving: boolean;
  onSubmit: (input: CourseInput) => void;
  /** Server error from the last failed submit, mapped onto fields/banner. */
  error?: ApiClientError | null;
};

type FieldErrors = Partial<Record<keyof CourseInput, string>>;

/** Client-side mirror of the server's course validation rules. */
function validate(input: CourseInput): FieldErrors {
  const errors: FieldErrors = {};
  if (!input.title.trim()) errors.title = "Title is required";
  if (!input.instructorName.trim())
    errors.instructorName = "Instructor name is required";
  if (input.duration != null) {
    if (Number.isNaN(input.duration)) errors.duration = "Duration must be a number";
    else if (!Number.isInteger(input.duration) || input.duration <= 0)
      errors.duration = "Duration must be a positive whole number of hours";
  }
  return errors;
}

export function CourseForm({ initial, submitLabel, saving, onSubmit, error }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [instructorName, setInstructorName] = useState(initial?.instructorName ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [duration, setDuration] = useState(
    initial?.duration != null ? String(initial.duration) : "",
  );
  const [status, setStatus] = useState<CourseStatus>(initial?.status ?? "ACTIVE");
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});

  const serverFieldErrors = error?.fieldErrors ?? {};
  const fieldError = (field: keyof CourseInput) =>
    clientErrors[field] ?? serverFieldErrors[field]?.[0];

  const handleSubmit = () => {
    const input: CourseInput = {
      title: title.trim(),
      description: description.trim() || null,
      instructorName: instructorName.trim(),
      category: category.trim() || null,
      duration: duration.trim() === "" ? null : Number(duration),
      status,
    };
    const errors = validate(input);
    setClientErrors(errors);
    if (Object.keys(errors).length === 0) {
      onSubmit(input);
    }
  };

  return (
    <s-stack direction="block" gap="base">
      {error && !error.fieldErrors && (
        <s-banner tone="critical" heading="Could not save course">
          {error.message}
        </s-banner>
      )}
      <s-text-field
        label="Course title"
        value={title}
        required
        error={fieldError("title")}
        onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
      />
      <s-text-area
        label="Description"
        value={description}
        onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
      />
      <s-text-field
        label="Instructor name"
        value={instructorName}
        required
        error={fieldError("instructorName")}
        onInput={(e) => setInstructorName((e.target as HTMLInputElement).value)}
      />
      <s-text-field
        label="Category"
        value={category}
        placeholder="e.g. Marketing"
        onInput={(e) => setCategory((e.target as HTMLInputElement).value)}
      />
      <s-number-field
        label="Duration (hours)"
        value={duration}
        min={1}
        error={fieldError("duration")}
        onInput={(e) => setDuration((e.target as HTMLInputElement).value)}
      />
      <s-select
        label="Status"
        value={status}
        onChange={(e) =>
          setStatus((e.target as HTMLSelectElement).value as CourseStatus)
        }
      >
        <s-option value="ACTIVE">Active</s-option>
        <s-option value="INACTIVE">Inactive</s-option>
      </s-select>
      <s-stack direction="inline" gap="base">
        <s-button
          variant="primary"
          onClick={handleSubmit}
          {...(saving ? { loading: true } : {})}
        >
          {submitLabel}
        </s-button>
      </s-stack>
    </s-stack>
  );
}
