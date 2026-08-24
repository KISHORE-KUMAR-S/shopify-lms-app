import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "./api.client";
import type {
  Course,
  CourseDetail,
  CourseInput,
  DashboardData,
  Enrollment,
  EnrollmentStatus,
  Paginated,
  Student,
  StudentDetail,
} from "./types";

/**
 * All data fetching goes through TanStack Query — one consistent layer for
 * caching, loading states, and invalidation after mutations.
 */

const keys = {
  dashboard: ["dashboard"] as const,
  courses: (page: number, search: string) => ["courses", page, search] as const,
  course: (id: string) => ["course", id] as const,
  students: (page: number, search: string) => ["students", page, search] as const,
  student: (id: string) => ["student", id] as const,
  enrollments: (page: number) => ["enrollments", page] as const,
};

export function useDashboard() {
  return useQuery({
    queryKey: keys.dashboard,
    queryFn: () => api.get<DashboardData>("/api/dashboard"),
  });
}

export function useCourses(page: number, search: string) {
  return useQuery({
    queryKey: keys.courses(page, search),
    queryFn: () =>
      api.get<Paginated<Course>>(
        `/api/courses?page=${page}&search=${encodeURIComponent(search)}`,
      ),
    placeholderData: (previous) => previous,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: keys.course(id),
    queryFn: () => api.get<CourseDetail>(`/api/courses/${id}`),
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CourseInput) => api.post<Course>("/api/courses", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useUpdateCourse(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CourseInput>) =>
      api.put<Course>(`/api/courses/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      void queryClient.invalidateQueries({ queryKey: keys.course(id) });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/courses/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["courses"] });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useStudents(page: number, search: string) {
  return useQuery({
    queryKey: keys.students(page, search),
    queryFn: () =>
      api.get<Paginated<Student>>(
        `/api/students?page=${page}&search=${encodeURIComponent(search)}`,
      ),
    placeholderData: (previous) => previous,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: keys.student(id),
    queryFn: () => api.get<StudentDetail>(`/api/students/${id}`),
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string }) =>
      api.post<Student>("/api/students", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useEnrollments(page: number) {
  return useQuery({
    queryKey: keys.enrollments(page),
    queryFn: () => api.get<Paginated<Enrollment>>(`/api/enrollments?page=${page}`),
    placeholderData: (previous) => previous,
  });
}

export function useCreateEnrollment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { studentId: string; courseId: string }) =>
      api.post<Enrollment>("/api/enrollments", input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["students"] });
      void queryClient.invalidateQueries({ queryKey: ["student"] });
      void queryClient.invalidateQueries({ queryKey: ["course"] });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useUpdateEnrollmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnrollmentStatus }) =>
      api.put<Enrollment>(`/api/enrollments/${id}/status`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enrollments"] });
      void queryClient.invalidateQueries({ queryKey: ["student"] });
      void queryClient.invalidateQueries({ queryKey: ["course"] });
      void queryClient.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}
