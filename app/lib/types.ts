/** Shapes returned by the Express REST API (server/). */

export type CourseStatus = "ACTIVE" | "INACTIVE";
export type EnrollmentStatus = "IN_PROGRESS" | "COMPLETED";

export type Course = {
  id: string;
  title: string;
  description: string | null;
  instructorName: string;
  category: string | null;
  duration: number | null;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
  _count?: { enrollments: number };
};

export type Student = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  _count?: { enrollments: number };
};

export type Enrollment = {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  student: Student;
  course: Course;
};

export type CourseDetail = Course & { enrollments: Enrollment[] };

export type StudentDetail = Student & {
  enrollments: (Omit<Enrollment, "student"> & { course: Course })[];
  enrollmentCount: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type DashboardData = {
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  completedEnrollments: number;
  inProgressEnrollments: number;
  recentEnrollments: Enrollment[];
};

export type CourseInput = {
  title: string;
  description?: string | null;
  instructorName: string;
  category?: string | null;
  duration?: number | null;
  status: CourseStatus;
};
