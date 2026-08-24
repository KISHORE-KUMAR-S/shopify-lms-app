import { Router } from "express";

import { ApiError } from "../errors.js";
import { prisma } from "../prisma.js";
import { listQuerySchema, studentCreateSchema } from "../schemas.js";

export const studentsRouter = Router();

studentsRouter.get("/", async (req, res) => {
  const { page, pageSize, search } = listQuerySchema.parse(req.query);
  const where = {
    storeId: req.store.id,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { enrollments: true } } },
    }),
    prisma.student.count({ where }),
  ]);

  res.json({ items, total, page, pageSize });
});

/** Student dashboard payload: profile + enrollments with course details. */
studentsRouter.get("/:id", async (req, res) => {
  const student = await prisma.student.findFirst({
    where: { id: req.params.id, storeId: req.store.id },
    include: {
      enrollments: {
        orderBy: { enrolledAt: "desc" },
        include: { course: true },
      },
    },
  });
  if (!student) {
    throw ApiError.notFound("Student not found.");
  }
  res.json({ ...student, enrollmentCount: student.enrollments.length });
});

studentsRouter.post("/", async (req, res) => {
  const data = studentCreateSchema.parse(req.body);
  const existing = await prisma.student.findUnique({
    where: { storeId_email: { storeId: req.store.id, email: data.email } },
  });
  if (existing) {
    throw ApiError.conflict("A student with that email already exists.");
  }
  const student = await prisma.student.create({
    data: { ...data, storeId: req.store.id },
  });
  res.status(201).json(student);
});
