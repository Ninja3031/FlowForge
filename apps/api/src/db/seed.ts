import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { mysqlPool } from "./mysql";
import { organizations, projects, sprints, tasks, users } from "./schema";

const PASSWORD = "Password@123";

async function seed() {
  const [existing] = await db.select().from(users).where(eq(users.email, "superadmin@flowforge.dev"));
  if (existing) {
    console.log("Already seeded, skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // Platform owner (no organization) - uses the Angular admin console
  await db.insert(users).values({
    name: "Super Admin",
    email: "superadmin@flowforge.dev",
    passwordHash,
    role: "SUPER_ADMIN",
  });

  const [org] = await db.insert(organizations).values({ name: "Acme Corp" }).$returningId();

  const people = [
    { name: "Ananya Sharma", email: "ananya@acme.dev", role: "ORG_ADMIN" as const },
    { name: "Rahul Verma", email: "rahul@acme.dev", role: "PROJECT_MANAGER" as const },
    { name: "Vikram Rao", email: "vikram@acme.dev", role: "MEMBER" as const },
  ];
  const ids: number[] = [];
  for (const person of people) {
    const [created] = await db
      .insert(users)
      .values({ ...person, passwordHash, organizationId: org.id })
      .$returningId();
    ids.push(created.id);
  }
  const [ananya, rahul, vikram] = ids;

  const [project] = await db
    .insert(projects)
    .values({
      organizationId: org.id,
      name: "Mobile App",
      key: "MOB",
      description: "Customer-facing mobile app for Acme.",
      createdById: ananya,
    })
    .$returningId();

  const [sprint] = await db
    .insert(sprints)
    .values({ projectId: project.id, name: "Sprint 1", status: "ACTIVE" })
    .$returningId();

  const demoTasks = [
    { title: "Set up authentication screens", status: "DONE", priority: "HIGH", assigneeId: vikram },
    { title: "Implement Google OAuth", status: "IN_PROGRESS", priority: "HIGH", assigneeId: vikram },
    { title: "Design onboarding flow", status: "IN_REVIEW", priority: "MEDIUM", assigneeId: rahul },
    { title: "Add push notifications", status: "TODO", priority: "MEDIUM", assigneeId: null },
    { title: "Fix crash on profile page", status: "TODO", priority: "URGENT", assigneeId: vikram },
    { title: "Write API docs for tasks", status: "TODO", priority: "LOW", assigneeId: rahul },
  ] as const;

  let number = 1;
  for (const task of demoTasks) {
    await db.insert(tasks).values({
      ...task,
      projectId: project.id,
      sprintId: sprint.id,
      number,
      position: number * 1000,
      reporterId: rahul,
    });
    number++;
  }

  console.log("Seed complete. Logins (password for all: Password@123):");
  console.log("  superadmin@flowforge.dev  (SUPER_ADMIN)");
  for (const person of people) console.log(`  ${person.email}  (${person.role})`);
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mysqlPool.end());