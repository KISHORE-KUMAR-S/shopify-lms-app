import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import {
  EnrollmentStatusBadge,
  Loading,
  LoadError,
  formatDate,
} from "../components/ui";
import { useDashboard } from "../lib/hooks";
import { authenticate } from "../shopify.server";

/**
 * Shop info comes from the Shopify Admin GraphQL API server-side (spec §5);
 * LMS metrics come from the Express REST API client-side.
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query lmsShopInfo {
        shop {
          name
          myshopifyDomain
          email
          currencyCode
          plan { displayName }
        }
      }`,
  );
  const { data } = await response.json();

  return { shop: data!.shop };
};

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <s-box padding="base" borderWidth="base" borderRadius="base">
      <s-stack direction="block" gap="small-200">
        <s-text color="subdued">{label}</s-text>
        <s-heading>{String(value)}</s-heading>
      </s-stack>
    </s-box>
  );
}

export default function Dashboard() {
  const { shop } = useLoaderData<typeof loader>();
  const { data, isLoading, error } = useDashboard();

  return (
    <s-page heading={`${shop.name} — LMS Dashboard`}>
      <s-section heading="Overview">
        {isLoading && <Loading label="Loading dashboard" />}
        {error && <LoadError message={(error as Error).message} />}
        {data && (
          <s-grid
            gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))"
            gap="base"
          >
            <Metric label="Courses" value={data.totalCourses} />
            <Metric label="Students" value={data.totalStudents} />
            <Metric label="Enrollments" value={data.totalEnrollments} />
            <Metric label="Completed" value={data.completedEnrollments} />
            <Metric label="In progress" value={data.inProgressEnrollments} />
          </s-grid>
        )}
      </s-section>

      <s-section heading="Recently enrolled students">
        {data && data.recentEnrollments.length === 0 && (
          <s-stack direction="block" gap="base">
            <s-paragraph>
              No enrollments yet — enroll your first student to see activity
              here.
            </s-paragraph>
            <s-stack direction="inline" gap="base">
              <s-button href="/app/enrollments" variant="primary">
                Enroll a student
              </s-button>
            </s-stack>
          </s-stack>
        )}
        {data && data.recentEnrollments.length > 0 && (
          <s-table>
            <s-table-header-row>
              <s-table-header>Student</s-table-header>
              <s-table-header>Course</s-table-header>
              <s-table-header>Enrolled</s-table-header>
              <s-table-header>Status</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {data.recentEnrollments.map((enrollment) => (
                <s-table-row key={enrollment.id}>
                  <s-table-cell>
                    <s-link href={`/app/students/${enrollment.student.id}`}>
                      {enrollment.student.name}
                    </s-link>
                  </s-table-cell>
                  <s-table-cell>{enrollment.course.title}</s-table-cell>
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

      <s-section slot="aside" heading="Store">
        <s-paragraph>
          <s-text color="subdued">Domain: </s-text>
          {shop.myshopifyDomain}
        </s-paragraph>
        <s-paragraph>
          <s-text color="subdued">Email: </s-text>
          {shop.email}
        </s-paragraph>
        <s-paragraph>
          <s-text color="subdued">Currency: </s-text>
          {shop.currencyCode}
        </s-paragraph>
        <s-paragraph>
          <s-text color="subdued">Plan: </s-text>
          {shop.plan.displayName}
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
