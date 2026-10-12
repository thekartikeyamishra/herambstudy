import { describe, expect, it } from "vitest";
import { contactMessageSchema, inviteRequestSchema, normalizeEmail } from "@/lib/validation/schemas";

const valid = {
  email: "Teacher@Example.com ",
  role: "teacher",
  country: "IN",
  useCase: "find_learning_gaps",
  privacyAcknowledged: true,
};

describe("inviteRequestSchema", () => {
  it("accepts a minimal valid request and defaults marketing consent to false", () => {
    const r = inviteRequestSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.marketingConsent).toBe(false);
      expect(r.data.name).toBeNull();
      expect(r.data.email).toBe("Teacher@Example.com");
    }
  });

  it.each(["", "not-an-email", "a@b", "x".repeat(250) + "@example.com"])("rejects invalid email %j", (email) => {
    expect(inviteRequestSchema.safeParse({ ...valid, email }).success).toBe(false);
  });

  it("requires privacy acknowledgement to be explicitly true", () => {
    expect(inviteRequestSchema.safeParse({ ...valid, privacyAcknowledged: false }).success).toBe(false);
    expect(inviteRequestSchema.safeParse({ ...valid, privacyAcknowledged: "true" }).success).toBe(false);
  });

  it("rejects unknown roles, countries and use cases", () => {
    expect(inviteRequestSchema.safeParse({ ...valid, role: "admin" }).success).toBe(false);
    expect(inviteRequestSchema.safeParse({ ...valid, country: "XX" }).success).toBe(false);
    expect(inviteRequestSchema.safeParse({ ...valid, useCase: "hack" }).success).toBe(false);
  });

  it("keeps institute details only for teachers and institute owners", () => {
    const owner = inviteRequestSchema.parse({ ...valid, role: "institute_owner", instituteName: "Sunrise Classes", instituteSize: "50_200" });
    expect(owner.instituteName).toBe("Sunrise Classes");
    const student = inviteRequestSchema.parse({ ...valid, role: "student", instituteName: "Sunrise Classes", instituteSize: "50_200" });
    expect(student.instituteName).toBeNull();
    expect(student.instituteSize).toBeNull();
  });

  it("strips unexpected fields such as status or admin flags", () => {
    const r = inviteRequestSchema.parse({ ...valid, status: "invited", isAdmin: true });
    expect(r).not.toHaveProperty("status");
    expect(r).not.toHaveProperty("isAdmin");
  });

  it("rejects control characters and over-long notes", () => {
    expect(inviteRequestSchema.safeParse({ ...valid, name: "Bad\u0000Name" }).success).toBe(false);
    expect(inviteRequestSchema.safeParse({ ...valid, useCaseNote: "x".repeat(501) }).success).toBe(false);
  });

  it("drops malformed source values instead of failing the request", () => {
    const r = inviteRequestSchema.parse({ ...valid, source: { campaign: "<script>", landingPage: "javascript:alert(1)" } });
    expect(r.source?.campaign).toBeUndefined();
    expect(r.source?.landingPage).toBeUndefined();
  });
});

describe("contactMessageSchema", () => {
  it("requires a name, topic and a message of at least 10 characters", () => {
    const base = { name: "Asha", email: "a@example.com", topic: "general", message: "Hello there, a question.", privacyAcknowledged: true };
    expect(contactMessageSchema.safeParse(base).success).toBe(true);
    expect(contactMessageSchema.safeParse({ ...base, name: "" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base, message: "short" }).success).toBe(false);
    expect(contactMessageSchema.safeParse({ ...base, topic: "spam" }).success).toBe(false);
  });
});

describe("normalizeEmail", () => {
  it("trims and lower-cases without altering the local part", () => {
    expect(normalizeEmail("  First.Last+tag@Gmail.COM ")).toBe("first.last+tag@gmail.com");
  });
});
