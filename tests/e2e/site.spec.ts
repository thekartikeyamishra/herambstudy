import AxeBuilder from "@axe-core/playwright";
import { createHash, createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const TOKEN_SECRET = "e2e-email-token-secret-0123456789abcdef";

const PUBLIC_PAGES = [
  "/",
  "/how-it-works",
  "/for-institutes",
  "/for-students",
  "/resources",
  "/resources/class-test-analyser",
  "/resources/assessment-readiness-diagnostic",
  "/resources/learning-gap-analysis",
  "/resources/student-progress-report-template",
  "/resources/comparing-assessments",
  "/resources/interpreting-repeated-mistakes",
  "/invite",
  "/pilot",
  "/about",
  "/contact",
  "/trust",
  "/privacy",
  "/terms",
  "/refund-policy",
];

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(0);
}

test.describe("public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} renders with one H1, canonical URL and no horizontal scroll`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(new RegExp(`${path === "/" ? "/?" : path}$`));
      expect(await page.title()).toMatch(/Heramb\.study/);
      expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
      await noHorizontalScroll(page);
    });
  }

  test("pages have no serious or critical axe accessibility violations", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "run once");
    test.setTimeout(300_000); // 19 pages, each compiled on first visit by the dev server
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${path}: ${v.id} (${v.nodes.length})`)).toEqual([]);
    }
  });

  test("320px-wide screens have no horizontal scrolling", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "mobile only");
    await page.setViewportSize({ width: 320, height: 640 });
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      await noHorizontalScroll(page);
    }
  });
});

test.describe("home page", () => {
  test("a new visitor can understand the product and find the CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Marks tell you");
    await expect(page.getByRole("link", { name: "Request an invite" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore how it works" }).first()).toBeVisible();
    await expect(page.getByText("Illustrative — fictional data").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Five steps, repeated every cycle." })).toBeVisible();
  });

  test("navigation adapts to the viewport", async ({ page }, info) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /open menu/i });
    if (info.project.name === "desktop") {
      await expect(toggle).toBeHidden();
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    } else {
      await expect(toggle).toBeVisible();
      await toggle.click();
      const mobileNav = page.getByRole("navigation", { name: "Mobile" });
      await expect(mobileNav).toBeVisible();
      await mobileNav.getByRole("link", { name: "Free resources" }).click();
      await expect(page).toHaveURL(/\/resources$/);
      await expect(mobileNav).toBeHidden();
    }
  });
});

async function fillInvite(page: Page, email: string) {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Private tutor").check();
  await page.getByLabel("Country").selectOption("IN");
  await page.getByLabel("Main reason you're interested").selectOption("track_progress");
  await page.getByLabel(/I agree that Heramb\.study may store/).check();
  // The server rejects forms completed in under 2.5 s as likely bots.
  await page.waitForTimeout(2700);
}

test.describe("invite request", () => {
  test("a visitor can complete the invite request", async ({ page }, info) => {
    await page.goto("/invite");
    await fillInvite(page, `e2e-${info.project.name}-${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Request an invite" }).click();
    await expect(page.getByTestId("invite-success")).toContainText("Your request is recorded", { timeout: 30_000 }); // dev server compiles the API route on first use
  });

  test("a duplicate request is handled safely with the same response", async ({ page }, info) => {
    const email = `dupe-${info.project.name}-${Date.now()}@example.com`;
    for (let i = 0; i < 2; i++) {
      await page.goto("/invite");
      await fillInvite(page, email);
      await page.getByRole("button", { name: "Request an invite" }).click();
      await expect(page.getByTestId("invite-success")).toContainText("Your request is recorded", { timeout: 30_000 }); // dev server compiles the API route on first use
    }
  });

  test("an invalid email is rejected with an accessible error", async ({ page }) => {
    await page.goto("/invite");
    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByRole("button", { name: "Request an invite" }).click();
    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Email address")).toBeFocused();
  });

  test("an unavailable backend produces an honest error, not a success", async ({ page }) => {
    await page.route("**/api/invite", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: { code: "service_unavailable", message: "We can't accept submissions right now. Nothing was saved — please try again later." } }),
      }),
    );
    await page.goto("/invite");
    await fillInvite(page, "unavailable@example.com");
    await page.getByRole("button", { name: "Request an invite" }).click();
    await expect(page.getByTestId("invite-error")).toContainText("Nothing was saved");
    await expect(page.getByTestId("invite-success")).toHaveCount(0);
  });

  test("consent boxes are not pre-checked", async ({ page }) => {
    await page.goto("/invite");
    await expect(page.getByLabel(/I agree that Heramb\.study may store/)).not.toBeChecked();
    await expect(page.getByLabel(/email me occasional product updates/)).not.toBeChecked();
  });
});

test.describe("API hardening", () => {
  test("no invite records can be read: there is no read endpoint and GET is refused", async ({ request }) => {
    const res = await request.get("/api/invite");
    expect(res.status()).toBe(405);
    expect(await res.text()).not.toContain("@");
  });

  test("cross-site POSTs are rejected", async ({ request }) => {
    const res = await request.post("/api/invite", {
      headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
      data: { email: "x@example.com" },
    });
    expect(res.status()).toBe(403);
  });

  test("security headers are present", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

test.describe("apps, PWA and ads", () => {
  test("future app download buttons show Coming soon and do not navigate", async ({ page }) => {
    await page.goto("/for-students");
    const play = page.getByTestId("store-google_play").first();
    await expect(play).toContainText("Coming soon");
    await expect(play).toHaveAttribute("aria-disabled", "true");
    const before = page.url();
    await play.click({ force: true });
    expect(page.url()).toBe(before);
  });

  test("install control is honest about availability", async ({ page }) => {
    await page.goto("/for-students");
    const state = page.getByTestId("install-state").first();
    const button = page.getByTestId("install-button").first();
    await expect(state.or(button)).toBeVisible();
  });

  test("manifest is served and valid", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.display).toBe("standalone");
    expect(m.icons.length).toBeGreaterThanOrEqual(3);
  });

  test("ads remain disabled without valid configuration", async ({ page }) => {
    await page.goto("/resources/learning-gap-analysis");
    await expect(page.locator("ins.adsbygoogle")).toHaveCount(0);
    await expect(page.locator('script[src*="googlesyndication"]')).toHaveCount(0);
    await expect(page.getByLabel("Advertisement")).toHaveCount(0);
  });
});

test.describe("SEO endpoints", () => {
  test("sitemap lists public pages only", async ({ request }) => {
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain("/resources/learning-gap-analysis");
    expect(xml).not.toContain("/api/");
    expect(xml).not.toContain("/offline");
  });

  test("robots.txt is served", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    expect(await res.text()).toMatch(/User-Agent: \*/i);
  });

  test("unknown pages return 404 with a helpful page", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("couldn't find");
  });
});

test.describe("free tools", () => {
  test("learning-gap analyser produces a prioritised result", async ({ page }) => {
    await page.goto("/resources/learning-gap-analysis");
    await page.getByRole("button", { name: "Load a fictional example" }).click();
    await page.getByRole("button", { name: "Analyse gaps" }).click();
    const results = page.getByTestId("gap-results");
    await expect(results).toBeVisible();
    // Gaps first, then most marks at stake: Chemical bonding (13 at stake) before Equilibrium (12).
    await expect(results.locator("tbody tr").nth(0)).toContainText("Chemical bonding");
    await expect(results.locator("tbody tr").nth(1)).toContainText("Equilibrium");
  });

  test("readiness diagnostic requires all answers, then shows a plan", async ({ page }) => {
    await page.goto("/resources/assessment-readiness-diagnostic");
    await page.getByRole("button", { name: "See my results" }).click();
    await expect(page.getByText(/Please answer all 12 statements/)).toBeVisible();
    const groups = page.locator('[role="radiogroup"]');
    const n = await groups.count();
    for (let i = 0; i < n; i++) await groups.nth(i).getByText(i % 2 ? "Sometimes" : "Mostly").click();
    await page.getByRole("button", { name: "See my results" }).click();
    await expect(page.getByTestId("readiness-results")).toContainText("Focus for the next two weeks");
  });
});

test.describe("class test analyser", () => {
  test("analyses the fictional class and produces a teaching plan and gap map", async ({ page }) => {
    await page.goto("/resources/class-test-analyser");
    await page.getByRole("button", { name: "Load a fictional class" }).click();
    const results = page.getByTestId("class-results");
    await expect(results).toBeVisible();
    await expect(page.getByTestId("teaching-plan").locator("li").first()).toContainText("Reteach to whole class");
    await expect(results.locator("tbody tr")).toHaveCount(24);
  });

  test("explains problems in pasted data instead of guessing", async ({ page }) => {
    await page.goto("/resources/class-test-analyser");
    await page.getByLabel("Or paste from Excel / Google Sheets").fill("Roll,Bonding\nR1,140");
    await page.getByRole("button", { name: "Analyse class" }).click();
    await expect(page.getByTestId("class-issues")).toContainText("add a MAX row");
    await expect(page.getByTestId("class-results")).toHaveCount(0);
  });
});

test.describe("institute pilot", () => {
  test("an institute can apply for a pilot", async ({ page }) => {
    await page.goto("/pilot");
    await page.getByLabel("Your name").fill("Ravi Kumar");
    await page.getByLabel("Your role").selectOption("owner");
    await page.getByLabel("Work email").fill(`pilot-${Date.now()}@example.com`);
    await page.getByLabel("Institute name").fill("Sunrise Classes");
    await page.getByLabel("City").fill("Lucknow");
    await page.getByLabel("Number of students").selectOption("50_200");
    await page.getByLabel("NEET").check();
    await page.getByLabel("How often do batches take tests?").selectOption("weekly");
    await page.getByLabel("When would you like to start?").selectOption("next_3_months");
    await page.getByLabel(/I agree that Heramb\.study may store these details to assess/).check();
    await page.waitForTimeout(2700);
    await page.getByRole("button", { name: "Apply for a pilot" }).click();
    await expect(page.getByTestId("pilot-success")).toContainText("pilot application is recorded", { timeout: 30_000 });
  });

  test("missing required answers are flagged", async ({ page }) => {
    await page.goto("/pilot");
    await page.getByRole("button", { name: "Apply for a pilot" }).click();
    await expect(page.getByText("Please tell us your name.")).toBeVisible();
    await expect(page.getByText("Please choose at least one exam.")).toBeVisible();
  });
});

test.describe("email preferences", () => {
  test("an incomplete link explains itself", async ({ page }) => {
    await page.goto("/email/confirm");
    await expect(page.getByText("This link is incomplete.")).toBeVisible();
  });

  test("double opt-in: confirm and unsubscribe with signed links", async ({ page, request, baseURL }, info) => {
    test.skip(info.project.name !== "desktop", "run once");
    const email = `optin-${Date.now()}@example.com`;
    const res = await request.post("/api/invite", {
      headers: { Origin: baseURL!, "Content-Type": "application/json" },
      data: { email, role: "student", country: "IN", useCase: "exam_preparation", privacyAcknowledged: true, marketingConsent: true, startedAt: Date.now() - 60_000 },
    });
    expect(res.status()).toBe(200);
    const id = createHash("sha256").update(`invite|${email}`).digest("hex").slice(0, 32);
    const sign = (purpose: string) => createHmac("sha256", TOKEN_SECRET).update(`${purpose}:${id}`).digest("base64url");

    await page.goto(`/email/confirm?id=${id}&t=${sign("unsubscribe")}`); // wrong purpose
    await page.getByRole("button", { name: /send me product updates/ }).click();
    await expect(page.getByTestId("email-action-result")).toContainText("invalid");

    await page.goto(`/email/confirm?id=${id}&t=${sign("confirm")}`);
    await page.getByRole("button", { name: /send me product updates/ }).click();
    await expect(page.getByTestId("email-action-result")).toContainText("Confirmed");

    await page.goto(`/email/unsubscribe?id=${id}&t=${sign("unsubscribe")}`);
    await page.getByRole("button", { name: "Unsubscribe from updates" }).click();
    await expect(page.getByTestId("email-action-result")).toContainText("unsubscribed");
  });
});
