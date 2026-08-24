import type { HeadersFunction } from "react-router";
import { useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useAppBridge } from "@shopify/app-bridge-react";

import { CourseForm } from "../components/CourseForm";
import { ApiClientError } from "../lib/api.client";
import { useCreateCourse } from "../lib/hooks";
import type { CourseInput } from "../lib/types";

export default function NewCourse() {
  const navigate = useNavigate();
  const shopify = useAppBridge();
  const createCourse = useCreateCourse();

  const handleSubmit = (input: CourseInput) => {
    createCourse.mutate(input, {
      onSuccess: (course) => {
        shopify.toast.show("Course created");
        void navigate(`/app/courses/${course.id}`);
      },
    });
  };

  return (
    <s-page heading="Create course">
      <s-section>
        <CourseForm
          submitLabel="Create course"
          saving={createCourse.isPending}
          onSubmit={handleSubmit}
          error={
            createCourse.error instanceof ApiClientError
              ? createCourse.error
              : null
          }
        />
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
