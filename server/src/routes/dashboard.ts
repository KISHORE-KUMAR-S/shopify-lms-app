import { Router } from "express";

import { prisma } from "../prisma.js";

export const dashboardRouter = Router();

/** Merchant dashboard aggregates (spec §4). */
dashboardRouter.get("/", async (req, res) => {
  const storeId = req.store.id;
  const enrollmentScope = { course: { storeId } };

  const [
    totalCourses,
    totalStudents,
    totalEnrollments,
    completedEnrollments,
    inProgressEnrollments,
    recentEnrollments,
  ] = await prisma.$transaction([
    prisma.course.count({ where: { storeId } }),
    prisma.student.count({ where: { storeId } }),
    prisma.enrollment.count({ where: enrollmentScope }),
    prisma.enrollment.count({ where: { ...enrollmentScope, status: "COMPLETED" } }),
    prisma.enrollment.count({
      where: { ...enrollmentScope, status: "IN_PROGRESS" },
    }),
    prisma.enrollment.findMany({
      where: enrollmentScope,
      orderBy: { enrolledAt: "desc" },
      take: 5,
      include: { student: true, course: true },
    }),
  ]);

  res.json({
    totalCourses,
    totalStudents,
    totalEnrollments,
    completedEnrollments,
    inProgressEnrollments,
    recentEnrollments,
  });
});
