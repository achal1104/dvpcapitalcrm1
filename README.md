# DVP Capitals CRM (frontend)
npm install && npm run dev
Demo logins: see "Demo accounts" on the login page (password Dvp@1234). Sign-in is email + password only, no OTP.
Public franchise landing page: /apply/akshay-finance
Content tab: head office adds graphics/videos; every franchise sees them branded with its own name and "Powered by DVP Capitals".
Every role gets its own dashboard after login (Operations, Franchise, Loan Processing, Document Verification, Accounts, Relationship, Sales, Support, Franchise Owner, Customer).
All data is demo data stored in the browser (localStorage). A backend (Supabase/PostgreSQL) is the next phase.

## v7 additions
- Leads: city and source columns, status/franchise filters, CSV export, duplicate-mobile blocking, and a "Create loan file" action that turns a lead into a loan application.
- Loan Applications: "New application" form for head office and franchise users.
- Notifications: created automatically on new loan files, queries raised, and customer stage changes; "Mark all as read" button.
- Customer "My Applications" now shows live data instead of fixed sample rows.
- Landing page and Add Customer wizard now save the city on the lead.
- Fixed a missing React key on the loan table rows.

## v8 additions: franchise and lender profiles
- Franchise profile (Franchise Management > open an ID > Profile tab; Franchise Owner: My Profile): contact and address, PAN, GST, KYC status, payout bank account (IFSC and account number validated, masked, head-office verification, resets when changed), assigned relationship manager, agreement reference, start/expiry/renewal/signed (saved into the Agreements register), profile completeness bar. Owners can edit only contact and bank details.
- Franchise onboarding now collects owner email, address, optional bank details, agreement expiry and reference, and the relationship manager; activation writes all of it into the profile and the Agreements register.
- Lender profile (Banks & NBFC > open an ID > Profile tab): relationship manager, lender contact, loan categories, min/max loan, rate range, tenure, turnaround, eligibility (credit score, income, age, vintage, applicant types), fees, commission agreement (rate, basis, payout days, clawback, validity, document name), and the files submitted to that lender.
- Lender application ID on every lender submission (Loan Applications > Lenders), with missing-ID warnings, duplicate-ID check per lender and submitted date. Shown in the loan detail panel.
- Profiles are used: lender comparison reads saved terms (plus optional credit score and income), loan files warn when amount/category is outside a lender's limits, and expected commission on disbursal uses the lender's commission rate (2% fallback).
- Sample profile values for the demo franchises and lenders are placeholders. Employees now include two relationship managers; Banks & NBFC now lists Bank A, NBFC B, Bank C, NBFC D and Bank E.

## v9 additions: loan processing and documents
Loan Applications (Loan Processing Executive, Operations Manager, Super Admin and others; Franchise Owner sees a read-only view):
- Assign a file to an employee (Loan Applications table or the file's Processing tab). Assignable people are Active employees in Loan Processing (Employees page). Assignment history is kept, HO gets a notification, and the Processing dashboard shows "Assigned to me". Who can assign: Super Admin, Operations Manager, Loan Processing Executive.
- Processing time: every stage change is time-stamped. Each file shows total processing time (running until Disbursed/Closed), time in the current stage, the allowed time for that stage, and a per-stage time table. The list shows average time to disburse.
- Delay and escalation: allowed days per stage are in `src/ops.ts` (SLA_DAYS, calendar days). Over the limit = "Delayed"; at 2x the limit = "Critical" and the file is auto-escalated to the Operations Manager once (opening Loan Applications triggers the check). Authorised users can also escalate manually with a reason and resolve with a note. Moving the file to another stage resolves an open escalation. Filters: Delayed, Escalated, Unassigned, My files. Notifications: File Assigned, File Escalated.
- Sanction letter: tab on each file. Requires a lender marked Approved. Upload PDF/JPG/PNG with lender, sanctioned amount, letter date and optional validity date; preview, remove. Roles: Super Admin, Operations Manager, Loan Processing Executive, Relationship Manager. Franchise Owner can view. Customer is notified for their own file. Moving a file to Disbursed is not blocked when there is no sanction letter; the file only shows "Not uploaded" in the Overview.

Documents (Documents, Document Upload, customer Upload Documents):
- Preview: PDF and images inside the page, plus download and open-in-new-tab.
- Replace: uploading a new file creates a new version; old versions are kept. A Verified document goes back to Uploaded and needs verification again.
- Version history: every version with file name, size, who and when, optional reason, preview of any version, and an activity log (status changes, replacements, expiry changes).
- Expiry: optional expiry date per document, badges (expired / days left), banner and filters, "expired or expiring" KPI on the Document Verification dashboard. Entering the 30-day window or expiring creates one notification (Document Expiring). Change the window with EXPIRY_WARN_DAYS in `src/Documents.tsx`.
- Remarks: unlimited remarks per document with author and time. Rejecting requires a reason, saved as a remark and sent as a notification (customers see it on their own documents).
- Only Super Admin, Operations Manager, Loan Processing Executive and Document Verification Executive can change status. Franchise Owners and customers can upload, replace, add remarks and set expiry. A Verified document can only be deleted by those roles.
- Existing records keep working (file name only = version 1 with no stored file). Existing loan data is migrated: stage times are rebuilt from the old history text, and the three sample files get sample timings and an assignee.
- Demo storage: files are kept in browser localStorage (max 1.5 MB each, PDF/JPG/PNG), so the browser quota limits how many fit. The backend phase should move files to private encrypted storage with expiring links.
