import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { POST as issueOtp } from "./otp/route";
import { POST as verifyOtp } from "./verify-otp/route";

// Integration tests against the real dev Supabase DB (see DATABASE_URL in .env).
// Every row this file creates is deleted in afterAll — it never touches
// pre-existing data, only a disposable Project it creates for itself.

function req(body: unknown) {
  return new Request("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof issueOtp>[0];
}

describe("OTP issue + verify flow", () => {
  let projectId: string;
  let linkToken: string;
  const phone = "9876543210";

  let questionGroupId: string;
  let questionId: string;

  beforeAll(async () => {
    const suffix = Date.now();
    const category = await db.category.create({ data: { name: `TestCat-${suffix}`, slug: `test-cat-${suffix}` } });
    const subcategory = await db.subcategory.create({ data: { name: "Sell", slug: "sell", categoryId: category.id } });
    const template = await db.template.create({ data: { name: "Test Template", subcategoryId: subcategory.id } });

    const group = await db.questionGroup.create({ data: { name: "__TestGroup__", slug: `__test-group-${suffix}__` } });
    questionGroupId = group.id;
    const phoneQuestion = await db.question.create({
      data: { label: "Primary Contact Phone", fieldType: "TEXT", groupId: group.id },
    });
    questionId = phoneQuestion.id;

    const project = await db.project.create({
      data: {
        projectNumber: `TEST-${Date.now()}`,
        title: "Test Project for OTP flow",
        categoryId: category.id,
        subcategoryId: subcategory.id,
        templateId: template.id,
        templateVersion: 1,
      },
    });
    projectId = project.id;

    await db.response.create({
      data: { projectId, questionId, value: phone },
    });

    const link = await db.clientLink.create({ data: { projectId } });
    linkToken = link.token;
  });

  afterAll(async () => {
    if (!projectId) return;
    await db.response.deleteMany({ where: { projectId } });
    await db.clientLink.deleteMany({ where: { projectId } });
    const project = await db.project.findUnique({ where: { id: projectId }, select: { categoryId: true, subcategoryId: true, templateId: true } });
    await db.project.delete({ where: { id: projectId } });
    if (project) {
      await db.template.delete({ where: { id: project.templateId } });
      await db.subcategory.delete({ where: { id: project.subcategoryId } });
      await db.category.delete({ where: { id: project.categoryId } });
    }
    await db.question.deleteMany({ where: { id: questionId } });
    await db.questionGroup.deleteMany({ where: { id: questionGroupId } });
  });

  it("rejects a phone number that doesn't match the project", async () => {
    const res = await issueOtp(req({ token: linkToken, phone: "0000000000" }));
    expect(res.status).toBe(400);
  });

  it("issues an OTP for a matching phone and locks out after 5 wrong attempts", async () => {
    const issueRes = await issueOtp(req({ token: linkToken, phone }));
    expect(issueRes.status).toBe(200);
    const issueBody = await issueRes.json();
    expect(issueBody.ok).toBe(true);

    for (let i = 0; i < 5; i++) {
      const res = await verifyOtp(req({ token: linkToken, otp: "000000" }));
      expect(res.status).toBe(400);
    }

    // 6th attempt is locked out even though the OTP guess is irrelevant now
    const lockedRes = await verifyOtp(req({ token: linkToken, otp: "000000" }));
    expect(lockedRes.status).toBe(429);
  });

  it("blocks re-issuing a fresh OTP within the 60s cooldown", async () => {
    const link = await db.clientLink.findUnique({ where: { token: linkToken } });
    expect(link?.otpExpiresAt).not.toBeNull();

    const res = await issueOtp(req({ token: linkToken, phone }));
    expect(res.status).toBe(429);
  });
});
