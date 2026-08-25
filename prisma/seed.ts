import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds sample data for the already-installed dev store. Run after install
 * (a Store row must already exist from OAuth) so foreign keys resolve.
 */
async function main() {
  const shop = process.env.SEED_SHOP ?? "sample-dev-store-ftt4ocqh.myshopify.com";

  const store = await prisma.store.findUnique({ where: { shop } });
  if (!store) {
    throw new Error(
      `No Store row for "${shop}". Install the app on this shop first, or pass SEED_SHOP=<your-shop>.`,
    );
  }

  const courses = await Promise.all(
    [
      {
        title: "Intro to Shopify App Development",
        description: "Build your first embedded Shopify app from scratch.",
        instructorName: "Ada Lovelace",
        category: "Development",
        duration: 12,
        status: "ACTIVE" as const,
      },
      {
        title: "Advanced GraphQL for Commerce",
        description: "Deep dive into the Admin GraphQL API.",
        instructorName: "Grace Hopper",
        category: "Development",
        duration: 8,
        status: "ACTIVE" as const,
      },
      {
        title: "Retired: Liquid Basics",
        description: "Legacy theme templating course.",
        instructorName: "Alan Turing",
        category: "Theming",
        duration: 6,
        status: "INACTIVE" as const,
      },
    ].map((data) => prisma.course.create({ data: { ...data, storeId: store.id } })),
  );

  const students = await Promise.all(
    [
      { name: "Priya Sharma", email: "priya@example.com" },
      { name: "Liam Chen", email: "liam@example.com" },
      { name: "Fatima Noor", email: "fatima@example.com" },
    ].map((data) => prisma.student.create({ data: { ...data, storeId: store.id } })),
  );

  await prisma.enrollment.createMany({
    data: [
      { studentId: students[0].id, courseId: courses[0].id, status: "COMPLETED" },
      { studentId: students[0].id, courseId: courses[1].id, status: "IN_PROGRESS" },
      { studentId: students[1].id, courseId: courses[0].id, status: "IN_PROGRESS" },
      { studentId: students[2].id, courseId: courses[1].id, status: "COMPLETED" },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded ${courses.length} courses, ${students.length} students for ${shop}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
