/**
 * Student-facing text in English and Hindi (report page, report slips, WhatsApp messages,
 * parent note). Topic names stay exactly as the teacher typed them.
 */
export type ReportLang = "en" | "hi";
export const REPORT_LANGS: Array<{ value: ReportLang; label: string }> = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिंदी" },
];

const join = (xs: string[], and: string) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);

export const REPORT_TEXT = {
  en: {
    sharedBy: (i: string) => `Shared by ${i}`,
    yourAverage: "Your average",
    focusCount: "Topics to focus on",
    yourTopics: "Your topics",
    absent: "Absent",
    classAverage: (n: number) => `Class average ${n}%`,
    status: { secure: "Secure", developing: "Developing", gap: "Gap" },
    nextSteps: "Your next steps",
    startWith: (topics: string[]) => `Start with ${join(topics, "and")}.`,
    whyWrong:
      "Before practising, look at your wrong answers and work out why they were wrong — the fix is different for a concept gap, a careless slip or running out of time.",
    noGap: "No topic below 50% — keep it that way with mixed, timed practice before the next test.",
    mistakesLink: "Understand your mistakes →",
    mistakesHint: "Find your main mistake type and its fix.",
    readinessLink: "3-minute readiness check →",
    readinessHint: "The one study habit to fix before your next test.",
    remindTitle: "Remind me to revise before the next test",
    remindBody: "Adds a 45-minute revision slot to your phone's calendar at 6 pm the day before, with your focus topics.",
    nextTestDate: "Next test date (optional)",
    addToCalendar: "Add to calendar",
    addedAgain: "Added ✓ — download again",
    noDateHint: "No date chosen: the reminder is set for 6 days from now.",
    saveTitle: "Track your progress across tests",
    saveBody: "Save this report on your phone. Each time your teacher sends a new one, save it too — you'll see each topic improve over time.",
    saveButton: "Save to my progress",
    saved: (n: number) => `✓ Saved on this device${n > 1 ? ` · ${n} reports` : ""}`,
    myProgress: "My progress →",
    saveUnavailable: "This browser isn't allowing saving (for example private mode).",
    saveFull: "You've saved the maximum number of reports. Delete old ones in My progress.",
    installLine: "Open it like an app next time:",
    usefulTitle: "Was this report useful?",
    usefulYes: "Yes, it helped",
    usefulNo: "Not really",
    thanksYes: "Thanks — your teacher's institute sees only the total count, never who answered.",
    thanksNo: "Thanks for telling us — we'll keep improving it.",
    footer:
      "This report is stored inside the link and on your device only — not on Heramb's servers. Heramb counts opens, saves and the useful/not-useful taps as totals for the sender's institute — never your marks or name. “Shared by” shows the name the sender typed; Heramb doesn't verify it. Thresholds: secure ≥ 75%, developing 50–74%, gap < 50%. One test is a small sample — talk to your teacher about it.",
    language: "Language",
    slipScan: "Scan to open your full report",
    slipNoQr: "Link too long for a QR code — ask your teacher to send it on WhatsApp.",
    slipAverage: "Average",
    slipFocus: "Focus next",
    slipNoGap: "No topic below 50%",
    message: (s: string, test: string, i: string, url: string) => `${s} — your ${test || "test"} report from ${i}: ${url}`,
  },
  hi: {
    sharedBy: (i: string) => `${i} की ओर से`,
    yourAverage: "आपका औसत",
    focusCount: "ध्यान देने वाले विषय",
    yourTopics: "आपके विषय",
    absent: "अनुपस्थित",
    classAverage: (n: number) => `कक्षा औसत ${n}%`,
    status: { secure: "मज़बूत", developing: "सुधार जारी", gap: "कमज़ोर" },
    nextSteps: "आपके अगले कदम",
    startWith: (topics: string[]) => `शुरुआत ${join(topics, "और")} से करें।`,
    whyWrong:
      "अभ्यास से पहले अपने गलत उत्तर देखें और समझें कि वे क्यों गलत हुए — कॉन्सेप्ट की कमी, लापरवाही की गलती या समय की कमी, हर एक का हल अलग है।",
    noGap: "कोई भी विषय 50% से नीचे नहीं है — अगले टेस्ट से पहले मिश्रित, समयबद्ध अभ्यास जारी रखें।",
    mistakesLink: "अपनी गलतियाँ समझें →",
    mistakesHint: "अपनी मुख्य गलती का प्रकार और उसका हल जानें (अंग्रेज़ी में)।",
    readinessLink: "3 मिनट की तैयारी जाँच →",
    readinessHint: "अगले टेस्ट से पहले सुधारने वाली एक आदत (अंग्रेज़ी में)।",
    remindTitle: "अगले टेस्ट से पहले दोहराने का रिमाइंडर",
    remindBody: "टेस्ट से एक दिन पहले शाम 6 बजे आपके फ़ोन के कैलेंडर में 45 मिनट का रिवीज़न समय जुड़ जाएगा, आपके कमज़ोर विषयों के साथ।",
    nextTestDate: "अगले टेस्ट की तारीख (वैकल्पिक)",
    addToCalendar: "कैलेंडर में जोड़ें",
    addedAgain: "जुड़ गया ✓ — फिर से डाउनलोड करें",
    noDateHint: "तारीख नहीं चुनी: रिमाइंडर आज से 6 दिन बाद का लगेगा।",
    saveTitle: "हर टेस्ट में अपनी प्रगति देखें",
    saveBody: "यह रिपोर्ट अपने फ़ोन पर सेव करें। हर नई रिपोर्ट भी सेव करें — आप देख पाएँगे कि हर विषय में कितना सुधार हुआ।",
    saveButton: "मेरी प्रगति में सेव करें",
    saved: (n: number) => `✓ इस डिवाइस पर सेव हो गया${n > 1 ? ` · ${n} रिपोर्ट` : ""}`,
    myProgress: "मेरी प्रगति →",
    saveUnavailable: "यह ब्राउज़र सेव करने नहीं दे रहा (जैसे प्राइवेट मोड)।",
    saveFull: "अधिकतम रिपोर्ट सेव हो चुकी हैं। “मेरी प्रगति” में पुरानी रिपोर्ट हटाएँ।",
    installLine: "अगली बार ऐप की तरह खोलें:",
    usefulTitle: "क्या यह रिपोर्ट उपयोगी थी?",
    usefulYes: "हाँ, मदद मिली",
    usefulNo: "ख़ास नहीं",
    thanksYes: "धन्यवाद — संस्थान को सिर्फ़ कुल संख्या दिखती है, कभी यह नहीं कि किसने जवाब दिया।",
    thanksNo: "बताने के लिए धन्यवाद — हम इसे बेहतर करते रहेंगे।",
    footer:
      "यह रिपोर्ट सिर्फ़ इस लिंक के अंदर और आपके डिवाइस पर है — Heramb के सर्वर पर नहीं। Heramb भेजने वाले संस्थान के लिए सिर्फ़ कुल संख्या गिनता है (कितनी बार खोली, सेव की, उपयोगी बताई) — आपके अंक या नाम कभी नहीं। संस्थान का नाम भेजने वाले ने लिखा है; Heramb उसकी पुष्टि नहीं करता। मज़बूत ≥ 75%, सुधार जारी 50–74%, कमज़ोर < 50%। एक टेस्ट छोटा नमूना है — अपने शिक्षक से बात करें।",
    language: "भाषा",
    slipScan: "पूरी रिपोर्ट देखने के लिए स्कैन करें",
    slipNoQr: "लिंक QR कोड के लिए बहुत लंबा है — शिक्षक से WhatsApp पर भेजने को कहें।",
    slipAverage: "औसत",
    slipFocus: "अगला फ़ोकस",
    slipNoGap: "कोई विषय 50% से नीचे नहीं",
    message: (s: string, test: string, i: string, url: string) => `${s} — ${i} की ओर से आपकी ${test || "टेस्ट"} रिपोर्ट: ${url}`,
  },
} as const;

export type ReportText = (typeof REPORT_TEXT)["en"];
export const reportText = (lang: ReportLang | undefined | null): ReportText => (lang === "hi" ? REPORT_TEXT.hi : REPORT_TEXT.en) as ReportText;

/** Date in the report's language, e.g. "19 Oct 2026" / "19 अक्टू॰ 2026". */
export function formatReportDate(iso: string, lang: ReportLang): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Class-level parent note in Hindi, from the same numbers as the English rule-based note. */
export function hindiParentNote(input: { strong: string[]; focus: string[]; closed?: number | null }): string {
  let note = `हाल के टेस्ट में कक्षा ने ${input.strong.length ? join(input.strong, "और") : "कई विषयों"} में अच्छा प्रदर्शन किया।`;
  if (input.focus.length) note += ` अगले दो हफ़्तों में हम ${join(input.focus, "और")} पर छोटे, लक्षित अभ्यास के साथ ध्यान दे रहे हैं।`;
  if (typeof input.closed === "number") note += ` पिछले टेस्ट के बाद से कक्षा में ${input.closed} विषयों की कमी दूर हुई है।`;
  note += " कृपया घर पर नियमित दोहराने के लिए बच्चे को प्रोत्साहित करें।";
  return note;
}
