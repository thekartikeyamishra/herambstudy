# Test fixtures

Files for manual and automated testing. **Never deployed** (not in `/public`). In development they can be downloaded from the developer hub (`/dev` → Test files).
`npm test` checks every file against `manifest.json` (see `tests/unit/fixtures.test.ts`), so the expected results below are verified, not just described.

| File | Feature | What it tests | Expected result | Use at |
|---|---|---|---|---|
| `class-analyser/01-valid-sample-24-students.csv` | Class test analyser | The built-in fictional class (MAX row, a few AB absences) | Analyses: 24 students × 6 topics | `/resources/class-test-analyser` |
| `class-analyser/02-valid-percentages-no-max-row.csv` | Class test analyser | No MAX row → values read as percentages | Analyses: 4 students × 3 topics | `/resources/class-test-analyser` |
| `class-analyser/03-valid-absent-markers.csv` | Class test analyser | AB, -, blank, absent, NA, n/a, x all mean absent | Analyses: 4 students × 3 topics | `/resources/class-test-analyser` |
| `class-analyser/04-valid-negative-marking-jee.csv` | Class test analyser | Negative marks (JEE style): counted as 0% for gaps | Analyses: 4 students × 3 topics | `/resources/class-test-analyser` |
| `class-analyser/05-valid-semicolon-decimal-comma.csv` | Class test analyser | European/Excel-regional format: ; separator and 7,5 decimals | Analyses: 2 students × 2 topics | `/resources/class-test-analyser` |
| `class-analyser/06-valid-tab-separated.tsv` | Class test analyser | Tab-separated (what you get when copying cells from Excel) | Analyses: 2 students × 2 topics | `/resources/class-test-analyser` |
| `class-analyser/07-valid-quotes-and-bom.csv` | Class test analyser | UTF-8 BOM, a comma inside quotes, escaped "" quotes | Analyses: 2 students × 2 topics | `/resources/class-test-analyser` |
| `class-analyser/08-valid-hindi-devanagari.csv` | Class test analyser | Hindi (Devanagari) names and topics | Analyses: 3 students × 2 topics | `/resources/class-test-analyser` |
| `class-analyser/09-valid-college-units.csv` | Class test analyser | College internal assessment: units as topics, 'Max Marks' label | Analyses: 30 students × 5 topics | `/resources/class-test-analyser` |
| `class-analyser/10-valid-mm-label-and-percent-cells.csv` | Class test analyser | Indian 'M.M.' label; '75%' cells converted against the maximum | Analyses: 2 students × 2 topics | `/resources/class-test-analyser` |
| `class-analyser/11-valid-500-students-limit.csv` | Class test analyser | Exactly 500 students (the maximum) | Analyses: 500 students × 3 topics | `/resources/class-test-analyser` |
| `class-analyser/12-valid-40-topics-limit.csv` | Class test analyser | Exactly 40 topics (the maximum) | Analyses: 10 students × 40 topics | `/resources/class-test-analyser` |
| `class-analyser/13-valid-spreadsheet-injection-ids.csv` | Class test analyser | Roll numbers that look like formulas: shown as text; CSV exports prefix them with ' so Excel won't run them | Analyses: 4 students × 1 topics | `/resources/class-test-analyser` |
| `class-analyser/14-valid-plan-whole-class-group-maintain.csv` | Class test analyser | Teaching plan rules: whole-class reteach, small-group recap, maintain | Analyses: 6 students × 3 topics | `/resources/class-test-analyser` |
| `class-analyser/20-error-501-students.csv` | Class test analyser | One student over the limit | Error mentioning “at most 500” | `/resources/class-test-analyser` |
| `class-analyser/21-error-41-topics.csv` | Class test analyser | One topic over the limit | Error mentioning “at most 40 topics” | `/resources/class-test-analyser` |
| `class-analyser/22-error-mark-above-max.csv` | Class test analyser | Marks above the topic maximum | Error mentioning “above the maximum of 20” | `/resources/class-test-analyser` |
| `class-analyser/23-error-marks-without-max-row.csv` | Class test analyser | Raw marks above 100 but no MAX row | Error mentioning “add a MAX row” | `/resources/class-test-analyser` |
| `class-analyser/24-error-text-in-marks.csv` | Class test analyser | Words or 'x/y' instead of numbers | Error mentioning “isn't a number” | `/resources/class-test-analyser` |
| `class-analyser/25-error-duplicate-topic.csv` | Class test analyser | Same topic twice (case-insensitive) | Error mentioning “appears twice” | `/resources/class-test-analyser` |
| `class-analyser/26-error-duplicate-roll-number.csv` | Class test analyser | Same roll number twice (case-insensitive) | Error mentioning “appears more than once” | `/resources/class-test-analyser` |
| `class-analyser/27-error-header-only.csv` | Class test analyser | Header row with no students | Error mentioning “at least one student” | `/resources/class-test-analyser` |
| `class-analyser/28-error-no-topic-columns.csv` | Class test analyser | Only an ID column | Error mentioning “at least one topic” | `/resources/class-test-analyser` |
| `class-analyser/29-error-max-zero.csv` | Class test analyser | Maximum marks of 0 | Error mentioning “Maximum marks must be a number above 0” | `/resources/class-test-analyser` |
| `class-analyser/30-error-total-row-at-bottom.csv` | Class test analyser | A 'Total' row left at the bottom of the sheet | Error mentioning “summary” | `/resources/class-test-analyser` |
| `class-analyser/31-error-total-column.csv` | Class test analyser | A 'Total' column (would be counted as a topic) | Error mentioning “total or result column” | `/resources/class-test-analyser` |
| `class-analyser/32-error-second-id-column.csv` | Class test analyser | Name AND Roll No columns (roll numbers would be read as marks) | Error mentioning “ID column” | `/resources/class-test-analyser` |
| `class-analyser/33-error-blank-roll-number.csv` | Class test analyser | A student row with no roll number | Error mentioning “no roll number” | `/resources/class-test-analyser` |
| `class-analyser/34-error-hex-and-exponent.csv` | Class test analyser | Values JavaScript would silently accept as numbers | Error mentioning “isn't a number” | `/resources/class-test-analyser` |
| `class-analyser/35-error-percent-over-100.csv` | Class test analyser | Percentage above 100% | Error mentioning “between 0% and 100%” | `/resources/class-test-analyser` |
| `class-analyser/36-error-below-negative-max.csv` | Class test analyser | Negative marks bigger than the maximum | Error mentioning “below the lowest possible score” | `/resources/class-test-analyser` |
| `class-analyser/37-error-empty-file.csv` | Class test analyser | Completely empty file | Error mentioning “Add a header row” | `/resources/class-test-analyser` |
| `class-analyser/38-error-over-1mb.csv` | Class test analyser | File larger than 1 MB (upload and paste are refused) | Refused: “limit is 1 MB” | `/resources/class-test-analyser` |
| `class-analyser/39-error-wrong-file-type.xlsx` | Class test analyser | Uploading an Excel file instead of CSV | Refused: “Please choose a .csv file” | `/resources/class-test-analyser` |
| `follow-up/01-unit-test.csv` | Follow-up check | First test (paste into the analyser first) | Analyses 24 × 6 | `/resources/class-test-analyser` |
| `follow-up/02-follow-up-check.csv` | Follow-up check | Follow-up: 'equilibrium' in different case, Redox removed, Electrochemistry added, R24 missing, R25 new | 23 students matched; Redox and Electrochemistry listed as not compared; gaps closed > 0 | `/resources/class-test-analyser` |
| `follow-up/03-unrelated-test.csv` | Follow-up check | A test with no topics or students in common | Error: “No topic names or students match” | `/resources/class-test-analyser` |
| `tracker/unit-1.csv` | Class tracker | Class 9 Maths test, dated 1 Jul. Add all three to one class, oldest first | After all three: R03 Algebra (3×), R08 Statistics (3×), R05 Algebra (2× — absence skipped), R07 Geometry (2×) | `/tracker` |
| `tracker/unit-2.csv` | Class tracker | Class 9 Maths test, dated 1 Aug (R05 absent). Add all three to one class, oldest first | After all three: R03 Algebra (3×), R08 Statistics (3×), R05 Algebra (2× — absence skipped), R07 Geometry (2×) | `/tracker` |
| `tracker/unit-3.csv` | Class tracker | Class 9 Maths test, dated 1 Sep. Add all three to one class, oldest first | After all three: R03 Algebra (3×), R08 Statistics (3×), R05 Algebra (2× — absence skipped), R07 Geometry (2×) | `/tracker` |
| `tracker/backup-valid.json` | Tracker backup import | A correct backup with one class and three tests | Imports “Class 9 A” | `/tracker → Import` |
| `tracker/backup-corrupt.json` | Tracker backup import | Truncated / damaged file | Error: “not valid JSON” | `/tracker → Import` |
| `tracker/backup-wrong-version.json` | Tracker backup import | A backup from a future version | Error: “newer version” | `/tracker → Import` |
| `tracker/backup-bad-test-data.json` | Tracker backup import | Valid structure but a test whose marks can't be read | Error naming the broken test | `/tracker → Import` |
| `tracker/backup-51-classes.json` | Tracker backup import | More than the 50-class limit | Error: “isn't a valid Heramb backup” | `/tracker → Import` |
| `tracker/backup-script-in-names.json` | Tracker backup import | HTML/script in class names | Imports; names shown as plain text (nothing runs) | `/tracker → Import` |
| `student-links/valid-links-localhost.txt` | Student report links | 24 personal links exactly as teachers paste them into WhatsApp (point at http://localhost:3000) | Each opens a report; “Save to my progress” works | `/r` |
| `student-links/edge-case-links.csv` | Student report links | 12 valid and broken/tampered links (open each URL) | ‘ok’ rows show a report; ‘invalid’ rows show “This report link is incomplete” | `/r` |
| `forms/invite-test-cases.csv` | Invite form | 9 cases: valid, bad email, missing consent, unknown role/country, long name | ‘expected’ column: valid, or invalid:<field> highlighted | `/invite` |
| `forms/pilot-test-cases.csv` | Pilot form | 8 cases: coaching/school/college, missing type/exams, bad phone, unknown price | ‘expected’ column | `/pilot` |
| `forms/contact-test-cases.csv` | Contact form | 5 cases | ‘expected’ column | `/contact` |
