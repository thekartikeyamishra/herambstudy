// @vitest-environment jsdom
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { InviteForm } from "@/components/forms/InviteForm";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { InstallControl } from "@/components/pwa/InstallControl";
import { StoreBadges } from "@/components/pwa/StoreBadges";
import { AdSlot } from "@/components/ads/AdSlot";

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
});

async function fillValidInvite(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email address/i), "teacher@example.com");
  await user.click(screen.getByLabelText(/private tutor/i));
  await user.selectOptions(screen.getByLabelText(/country/i), "IN");
  await user.selectOptions(screen.getByLabelText(/main reason/i), "track_progress");
  await user.click(screen.getByLabelText(/i agree that heramb\.study may store/i));
}

describe("InviteForm", () => {
  it("never pre-checks consent boxes", () => {
    render(<InviteForm />);
    expect(screen.getByLabelText(/i agree that heramb\.study may store/i)).not.toBeChecked();
    expect(screen.getByLabelText(/email me occasional product updates/i)).not.toBeChecked();
  });

  it("shows accessible errors and does not call the server when required fields are missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<InviteForm />);
    await user.click(screen.getByRole("button", { name: /request an invite/i }));
    expect(await screen.findByText(/please enter your email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute("aria-invalid", "true");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("asks for institute details only for teachers and institute owners", async () => {
    const user = userEvent.setup();
    render(<InviteForm />);
    expect(screen.queryByLabelText(/institute name/i)).not.toBeInTheDocument();
    await user.click(screen.getByLabelText(/institute owner/i));
    expect(screen.getByLabelText(/institute name/i)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/^student$/i));
    expect(screen.queryByLabelText(/institute name/i)).not.toBeInTheDocument();
  });

  it("shows success only after the server confirms storage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message: "Your request is recorded." }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const user = userEvent.setup();
    render(<InviteForm />);
    await fillValidInvite(user);
    await user.click(screen.getByRole("button", { name: /request an invite/i }));
    expect(await screen.findByTestId("invite-success")).toHaveTextContent("Your request is recorded.");
  });

  it("shows the server's honest error and keeps the form when storage is unavailable", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ ok: false, error: { code: "service_unavailable", message: "Nothing was saved — please try again later." } }),
        { status: 503, headers: { "content-type": "application/json" } },
      ),
    );
    const user = userEvent.setup();
    render(<InviteForm />);
    await fillValidInvite(user);
    await user.click(screen.getByRole("button", { name: /request an invite/i }));
    expect(await screen.findByTestId("invite-error")).toHaveTextContent(/nothing was saved/i);
    expect(screen.queryByTestId("invite-success")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue("teacher@example.com");
  });

  it("reports offline state without sending", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const user = userEvent.setup();
    render(<InviteForm />);
    await fillValidInvite(user);
    await user.click(screen.getByRole("button", { name: /request an invite/i }));
    expect(await screen.findByTestId("invite-error")).toHaveTextContent(/offline/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("SiteHeader", () => {
  it("toggles the mobile menu with correct aria-expanded and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(screen.getByRole("button", { name: /close menu/i })).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByRole("navigation", { name: "Mobile" })).getByText("Free tools")).toBeVisible();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", { name: /open menu/i })).toHaveAttribute("aria-expanded", "false"));
  });

  it("has a skip link to main content", () => {
    render(<SiteHeader />);
    expect(screen.getByRole("link", { name: /skip to content/i })).toHaveAttribute("href", "#main");
  });
});

describe("StoreBadges", () => {
  it("renders non-navigating, aria-disabled 'Coming soon' controls when no store URLs are configured", () => {
    render(<StoreBadges />);
    for (const id of ["store-google_play", "store-app_store"]) {
      const el = screen.getByTestId(id);
      expect(el.tagName).toBe("BUTTON");
      expect(el).toHaveAttribute("aria-disabled", "true");
      expect(el).toHaveTextContent(/coming soon/i);
    }
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});

describe("InstallControl", () => {
  it("explains honestly when installation isn't available", async () => {
    render(<InstallControl />);
    expect(await screen.findByTestId("install-state")).toHaveTextContent(/isn't available in this browser/i);
  });

  it("offers 'Install Web App' only after a real beforeinstallprompt event", async () => {
    render(<InstallControl />);
    await screen.findByTestId("install-state");
    const evt = new Event("beforeinstallprompt") as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
    evt.prompt = vi.fn().mockResolvedValue(undefined);
    evt.userChoice = Promise.resolve({ outcome: "dismissed" });
    act(() => {
      window.dispatchEvent(evt);
    });
    expect(await screen.findByRole("button", { name: /install web app/i })).toBeInTheDocument();
  });
});

describe("AdSlot", () => {
  it("renders nothing when advertising is not configured", () => {
    const { container } = render(<AdSlot />);
    expect(container).toBeEmptyDOMElement();
  });
});
