import { Router } from "express";
import { Prisma } from "@prisma/client";

import { ApiError } from "../errors.js";
import { prisma } from "../prisma.js";
import {
  enrollmentCreateSchema,
  enrollmentStatusSchema,
  listQuerySchema,
} from "../schemas.js";

export const enrollmentsRouter = Router();

enrollmentsRouter.get("/", async (req, res) => {
  const { page, pageSize } = listQuerySchema.parse(req.query);
  // Scope through the course's store — enrollments have no storeId themselves.
  const where = { course: { storeId: req.store.id } };

  const [items, total] = await prisma.$transaction([
    prisma.enrollment.findMany({
      where,
      orderBy: { enrolledAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { student: true, course: true },
    }),
    prisma.enrollment.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

enrollmentsRouter.post("/", async (req, res) => {
  const { studentId, courseId } = enrollmentCreateSchema.parse(req.body);

  // Application-layer checks: both records must exist and belong to this shop.
  const [student, course] = await Promise.all([
    prisma.student.findFirst({ where: { id: studentId, storeId: req.store.id } }),
    prisma.course.findFirst({ where: { id: courseId, storeId: req.store.id } }),
  ]);
  if (!student) throw ApiError.badRequest("Selected student does not exist.");
  if (!course) throw ApiError.badRequest("Selected course does not exist.");

  // Application-layer duplicate check for a friendly message; the DB unique
  // constraint on (studentId, courseId) is the real guard against races.
  try {
    const enrollment = await prisma.enrollment.create({
      data: { studentId, courseId },
      include: { student: true, course: true },
    });
    res.status(201).json(enrollment);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw ApiError.conflict(
        `${student.name} is already enrolled in “${course.title}”.`,
      );
    }
    throw error;
  }
});

enrollmentsRouter.put("/:id/status", async (req, res) => {
  const { status } = enrollmentStatusSchema.parse(req.body);

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: req.params.id, course: { storeId: req.store.id } },
  });
  if (!enrollment) {
    throw ApiError.notFound("Enrollment not found.");
  }

  const updated = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: { status },
    include: { student: true, course: true },
  });
  res.json(updated);
});
