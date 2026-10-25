/** WhatsApp deep links and ready-to-send messages (no data leaves the page until the user sends). */

export function whatsappLink(text: string, phone?: string | null): string {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  // Indian 10-digit numbers get the country code; anything else is used as given.
  const to = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

export function teacherInviteMessage(origin: string, inst: { name: string; code: string }): string {
  return [
    `${inst.name} is using Heramb.study to turn our test marks into chapter-wise teaching plans.`,
    `Open this link once to connect (no sign-up): ${origin}/resources/class-test-analyser#connect=${inst.code}`,
    `Institute code: ${inst.code}`,
    "Marks and student names stay on your device.",
  ].join("\n");
}

export type NudgeKind = "not_activated" | "no_links" | "at_risk" | "dormant" | "ask_value" | "thanks" | "weekly";

/** Owner → institute nudges. Short, specific, never pushy. */
export type WeeklyNumbers = { analyses: number; studentActions: number; streak: number; metCount: number; nextStep: string };

export function nudgeMessage(kind: NudgeKind, inst: { contactName: string; name: string; code: string }, origin: string, week?: WeeklyNumbers): string {
  const analyser = `${origin}/resources/class-test-analyser#connect=${inst.code}`;
  const dashboard = `${origin}/institute#${inst.code}`;
  const hi = `Namaste ${inst.contactName} ji,`;
  switch (kind) {
    case "not_activated":
      return `${hi} Kartikeya from Heramb.study. Whenever this week's test is checked, paste or import the marks here — it takes two minutes and shows which chapters to re-teach: ${analyser}\nHappy to do the first one with you on a call if useful.`;
    case "no_links":
      return `${hi} your first analysis is done. The next step parents notice most: send each student their report link (one tap from the results page). Your dashboard: ${dashboard}`;
    case "at_risk":
      return `${hi} it's been a little while since the last test was analysed at ${inst.name}. If this week's marks are ready, it's two minutes here: ${analyser}\nAnything getting in the way? Tell me and I'll fix it.`;
    case "dormant":
      return `${hi} checking in from Heramb.study. Was something not working for ${inst.name}? A one-line reply helps me improve it — and your data and code are still there whenever you need them.`;
    case "ask_value":
      return `${hi} quick question for the founding programme: what has Heramb helped with so far, and roughly how much time does it save per test? Two taps here: ${dashboard}`;
    case "weekly": {
      const w = week ?? { analyses: 0, studentActions: 0, streak: 0, metCount: 0, nextStep: "Analyse this week's test." };
      return [
        `${hi} last week at ${inst.name} on Heramb.study:`,
        `• Tests analysed: ${w.analyses}`,
        `• Student actions on reports: ${w.studentActions}`,
        `• Weekly rhythm: ${w.streak} week${w.streak === 1 ? "" : "s"} in a row`,
        `• Programme checklist: ${w.metCount} of 7`,
        `This week: ${w.nextStep}`,
        `Dashboard: ${dashboard}`,
      ].join("\n");
    }
    case "thanks":
      return `${hi} thank you — ${inst.name} has been one of our most consistent founding institutes. Anything you'd like us to build next?`;
  }
}
