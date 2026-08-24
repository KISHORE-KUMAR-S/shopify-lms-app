import { Router } from "express";

import { ApiError } from "../errors.js";
import { prisma } from "../prisma.js";
import {
  courseCreateSchema,
  courseUpdateSchema,
  listQuerySchema,
} from "../schemas.js";

export const coursesRouter = Router();

/** Resolves a course by id, scoped to the calling shop — 404 otherwise. */
async function findCourseOr404(storeId: string, id: string) {
  const course = await prisma.course.findFirst({
    where: { id, storeId },
    include: { _count: { select: { enrollments: true } } },
  });
  if (!course) {
    throw ApiError.notFound("Course not found.");
  }
  return course;
}

coursesRouter.get("/", async (req, res) => {
  const { page, pageSize, search } = listQuerySchema.parse(req.query);
  const where = {
    storeId: req.store.id,
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" as const } },
            { instructorName: { contains: search, mode: "insensitive" as const } },
            { category: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.course.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { enrollments: true } } },
    }),
    prisma.course.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

coursesRouter.get("/:id", async (req, res) => {
  const course = await findCourseOr404(req.store.id, req.params.id);
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: course.id },
    orderBy: { enrolledAt: "desc" },
    include: { student: true },
  });
  res.json({ ...course, enrollments });
});

coursesRouter.post("/", async (req, res) => {
  const data = courseCreateSchema.parse(req.body);
  const course = await prisma.course.create({
    data: { ...data, storeId: req.store.id },
  });
  res.status(201).json(course);
});

coursesRouter.put("/:id", async (req, res) => {
  await findCourseOr404(req.store.id, req.params.id);
  const data = courseUpdateSchema.parse(req.body);
  const course = await prisma.course.update({
    where: { id: req.params.id },
    data,
  });
  res.json(course);
});

coursesRouter.delete("/:id", async (req, res) => {
  await findCourseOr404(req.store.id, req.params.id);
  // Enrollments cascade at the DB level.
  await prisma.course.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
