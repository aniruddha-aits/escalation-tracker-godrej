export const SEVERITY_CONFIG = {
  Fatal:    { color: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500',    sla: { actionStart: 12, actionComplete: 24, rca: 24, closure: 72 } },
  Critical: { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500', sla: { actionStart: 24, actionComplete: 48, rca: 48, closure: 120 } },
  Medium:   { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500', sla: { actionStart: 48, actionComplete: 72, rca: 72, closure: 168 } },
  Low:      { color: 'bg-green-100 text-green-700 border-green-200',  dot: 'bg-green-500',  sla: { actionStart: 72, actionComplete: 96, rca: 96, closure: 240 } },
};

export const STATUS_CONFIG = {
  'New':                        { color: 'bg-blue-100 text-blue-700 border-blue-200' },
  'Pending Validation':         { color: 'bg-purple-100 text-purple-700 border-purple-200' },
  'Under Review':               { color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  'Assigned':                   { color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  'RCA Pending':                { color: 'bg-amber-100 text-amber-700 border-amber-200' },
  'CAPA Pending':               { color: 'bg-orange-100 text-orange-700 border-orange-200' },
  'RCA Submitted':              { color: 'bg-teal-100 text-teal-700 border-teal-200' },
  'Rectification Done':         { color: 'bg-lime-100 text-lime-700 border-lime-200' },
  'Awaiting Customer Closure':  { color: 'bg-sky-100 text-sky-700 border-sky-200' },
  'Closed':                     { color: 'bg-slate-100 text-slate-600 border-slate-200' },
  'SLA Breached':               { color: 'bg-red-100 text-red-700 border-red-200' },
};

export const DEPARTMENTS = ['Legal', 'Quality', 'Operations', 'Finance', 'Customer Relations', 'Engineering', 'Procurement', 'HR'];

export const ZONES = ['North', 'South', 'East', 'West', 'Central'];

export const PROJECTS = [
  'Godrej One Worli', 'Godrej Reserve Whitefield', 'Godrej Splendour',
  'Godrej Meridien', 'Godrej Nurture', 'Godrej Infinity', 'Godrej Air',
];

export const SOURCES = ['Email', 'WhatsApp', 'LinkedIn', 'Chairman Mail', 'CEO Mail', 'CQO Mail', 'Social Media'];

export const USERS = [
  { id: 'u1', name: 'Priya Sharma',   email: 'priya@godrej.com',    role: 'Reviewer',         department: 'Quality',          zone: 'North', avatar: 'PS' },
  { id: 'u2', name: 'Rajesh Kumar',   email: 'rajesh@godrej.com',   role: 'Department User',  department: 'Legal',            zone: 'South', avatar: 'RK' },
  { id: 'u3', name: 'Anita Mehta',    email: 'anita@godrej.com',    role: 'Authority',        department: 'Operations',       zone: 'East',  avatar: 'AM' },
  { id: 'u4', name: 'Suresh Patel',   email: 'suresh@godrej.com',   role: 'Authority',        department: 'Quality',          zone: 'West',  avatar: 'SP' },
  { id: 'u5', name: 'Neha Singh',     email: 'neha@godrej.com',     role: 'Management',       department: 'CXO Office',       zone: 'All',   avatar: 'NS' },
  { id: 'u6', name: 'Vikram Reddy',   email: 'vikram@godrej.com',   role: 'Admin',            department: 'IT',               zone: 'All',   avatar: 'VR' },
  { id: 'u7', name: 'Deepa Nair',     email: 'deepa@godrej.com',    role: 'Department User',  department: 'Engineering',      zone: 'North', avatar: 'DN' },
  { id: 'u8', name: 'Kiran Joshi',    email: 'kiran@godrej.com',    role: 'Department User',  department: 'Customer Relations', zone: 'South', avatar: 'KJ' },
];

const now = new Date('2026-05-14T10:00:00');
const hoursAgo = (h) => new Date(now - h * 3600000).toISOString();

export const COMPLAINTS = [
  {
    id: 'ESC-2026-001',
    project: 'Godrej One Worli',
    type: 'Structural',
    severity: 'Fatal',
    source: 'Chairman Mail',
    raisedOn: hoursAgo(10),
    zone: 'West',
    issueDetails: 'Severe water leakage in Tower B podium level causing structural damage. Customer is threatening legal action and media coverage. Hazardous condition reported.',
    notes: 'Customer has already consulted a lawyer. Immediate intervention required.',
    status: 'Assigned',
    department: 'Engineering',
    assignedTo: 'u7',
    watchers: ['u3', 'u5'],
    mailThread: 'https://mail.example.com/thread/001',
    aiExtracted: {
      keywords: ['water leakage', 'structural damage', 'legal', 'hazard'],
      confidence: 0.92,
      suggestedSeverity: 'Fatal',
      suggestedDepartment: 'Engineering',
    },
    validatedBy: 'u1',
    validatedAt: hoursAgo(8),
    slaStarted: hoursAgo(10),
    rcaDue: hoursAgo(-14),
    closureDue: hoursAgo(62),
    actions: [
      { by: 'u3', at: hoursAgo(9), text: 'Issue assigned to Engineering team. Site visit scheduled for tomorrow.' },
      { by: 'u7', at: hoursAgo(5), text: 'On-site inspection completed. Waterproofing contractor engaged.' },
    ],
    cbeDate: hoursAgo(-48),
    rca: null,
    capa: null,
    closureStatus: null,
    customerConfirmation: null,
  },
  {
    id: 'ESC-2026-002',
    project: 'Godrej Reserve Whitefield',
    type: 'Quality',
    severity: 'Critical',
    source: 'Email',
    raisedOn: hoursAgo(30),
    zone: 'South',
    issueDetails: 'Multiple flooring defects noticed across 3 units in Block C. Tiles have cracked within 6 months of possession.',
    notes: 'Customer requesting full replacement and compensation.',
    status: 'RCA Pending',
    department: 'Quality',
    assignedTo: 'u4',
    watchers: ['u5'],
    mailThread: 'https://mail.example.com/thread/002',
    aiExtracted: {
      keywords: ['flooring defects', 'cracked tiles', 'quality', 'replacement'],
      confidence: 0.88,
      suggestedSeverity: 'Critical',
      suggestedDepartment: 'Quality',
    },
    validatedBy: 'u1',
    validatedAt: hoursAgo(28),
    slaStarted: hoursAgo(30),
    rcaDue: hoursAgo(18),
    closureDue: hoursAgo(-90),
    actions: [
      { by: 'u4', at: hoursAgo(20), text: 'Quality audit team dispatched. Tile samples collected for analysis.' },
    ],
    cbeDate: hoursAgo(-72),
    rca: null,
    capa: null,
    closureStatus: null,
    customerConfirmation: null,
  },
  {
    id: 'ESC-2026-003',
    project: 'Godrej Splendour',
    type: 'Legal',
    severity: 'Fatal',
    source: 'CEO Mail',
    raisedOn: hoursAgo(50),
    zone: 'North',
    issueDetails: 'Customer has filed a consumer court case regarding delay in possession. Customer claims 18 months delay with no communication.',
    notes: 'Legal team must respond within 48 hours as per court order.',
    status: 'RCA Submitted',
    department: 'Legal',
    assignedTo: 'u2',
    watchers: ['u5', 'u3'],
    mailThread: 'https://mail.example.com/thread/003',
    aiExtracted: {
      keywords: ['legal', 'consumer court', 'possession delay', 'court order'],
      confidence: 0.95,
      suggestedSeverity: 'Fatal',
      suggestedDepartment: 'Legal',
    },
    validatedBy: 'u1',
    validatedAt: hoursAgo(48),
    slaStarted: hoursAgo(50),
    rcaDue: hoursAgo(26),
    closureDue: hoursAgo(22),
    actions: [
      { by: 'u2', at: hoursAgo(40), text: 'Legal team reviewing case files. External counsel engaged.' },
      { by: 'u2', at: hoursAgo(20), text: 'Response filed with consumer court. Settlement discussion initiated.' },
    ],
    cbeDate: hoursAgo(0),
    rca: {
      submittedBy: 'u2',
      submittedAt: hoursAgo(15),
      rootCause: 'Construction delays due to COVID-19 restrictions and material shortage in 2023. Communication failure in proactively informing customers of revised timelines.',
      chronology: '2024-01: Original possession date\n2024-06: First delay notified\n2025-01: Second delay, no formal notification\n2025-06: Customer escalated to consumer court',
      aiRephrased: ['Construction delayed 18 months due to pandemic-era restrictions and supply chain issues', 'Customer communication lapse identified at 2 critical milestones', 'No proactive outreach conducted post-delay notification failure'],
      approvedBy: null,
      approvedAt: null,
    },
    capa: {
      corrective: 'Immediate legal settlement offer. Possession handover expedited. Compensation as per agreement.',
      preventive: 'SOP for delay communication. Monthly customer update mandatory. CRM alerts for milestone breaches.',
      aiRephrased: ['Legal settlement initiated with compensation offer per contractual terms', 'Possession handover prioritized for Q3 2026', 'New SOP implemented: mandatory monthly status updates to all customers', 'CRM milestone alerts configured for proactive notification'],
      approvedBy: null,
      approvedAt: null,
    },
    closureStatus: null,
    customerConfirmation: null,
  },
  {
    id: 'ESC-2026-004',
    project: 'Godrej Meridien',
    type: 'Maintenance',
    severity: 'Medium',
    source: 'WhatsApp',
    raisedOn: hoursAgo(72),
    zone: 'Central',
    issueDetails: 'Elevator in Block A has been non-functional for 3 days. Residents including elderly and disabled individuals are severely inconvenienced.',
    notes: 'AMC vendor contacted but no response.',
    status: 'Rectification Done',
    department: 'Operations',
    assignedTo: 'u3',
    watchers: [],
    mailThread: null,
    aiExtracted: {
      keywords: ['elevator', 'non-functional', 'maintenance', 'AMC'],
      confidence: 0.85,
      suggestedSeverity: 'Medium',
      suggestedDepartment: 'Operations',
    },
    validatedBy: 'u1',
    validatedAt: hoursAgo(70),
    slaStarted: hoursAgo(72),
    rcaDue: hoursAgo(48),
    closureDue: hoursAgo(24),
    actions: [
      { by: 'u3', at: hoursAgo(60), text: 'AMC vendor escalated. Alternate vendor engaged.' },
      { by: 'u3', at: hoursAgo(24), text: 'Elevator repaired and operational. Testing completed.' },
    ],
    cbeDate: hoursAgo(0),
    rca: {
      submittedBy: 'u3',
      submittedAt: hoursAgo(36),
      rootCause: 'Motor shaft failure due to overloading. AMC vendor SLA not tracked.',
      chronology: 'Day 1: Elevator failure reported\nDay 2: AMC vendor unreachable\nDay 3: Alternate vendor engaged, issue resolved',
      aiRephrased: ['Motor shaft failure identified as root cause due to sustained overloading', 'AMC vendor SLA compliance not monitored, leading to response delay'],
      approvedBy: 'u4',
      approvedAt: hoursAgo(30),
    },
    capa: {
      corrective: 'Motor replaced. Load limits reconfigured and signage updated.',
      preventive: 'Monthly elevator audits. AMC SLA tracking added to dashboard. Penalty clause activated for AMC vendor.',
      aiRephrased: ['Motor replaced with upgraded unit; load limit signage updated', 'Monthly elevator audit schedule established', 'AMC vendor SLA dashboard monitoring activated', 'Penalty clause invoked for SLA breach'],
      approvedBy: 'u4',
      approvedAt: hoursAgo(30),
    },
    closureStatus: 'Awaiting Customer Closure',
    customerConfirmation: null,
  },
  {
    id: 'ESC-2026-005',
    project: 'Godrej Air',
    type: 'Quality',
    severity: 'Low',
    source: 'Email',
    raisedOn: hoursAgo(120),
    zone: 'East',
    issueDetails: 'Paint peeling in bedroom walls within 1 year of possession. Customer requesting touch-up.',
    notes: '',
    status: 'Closed',
    department: 'Quality',
    assignedTo: 'u4',
    watchers: [],
    mailThread: 'https://mail.example.com/thread/005',
    aiExtracted: {
      keywords: ['paint', 'peeling', 'quality', 'touch-up'],
      confidence: 0.91,
      suggestedSeverity: 'Low',
      suggestedDepartment: 'Quality',
    },
    validatedBy: 'u1',
    validatedAt: hoursAgo(118),
    slaStarted: hoursAgo(120),
    rcaDue: hoursAgo(96),
    closureDue: hoursAgo(0),
    actions: [
      { by: 'u4', at: hoursAgo(100), text: 'Paint team scheduled for touch-up work.' },
      { by: 'u4', at: hoursAgo(80), text: 'Touch-up completed. Customer informed.' },
    ],
    cbeDate: hoursAgo(72),
    rca: {
      submittedBy: 'u4',
      submittedAt: hoursAgo(90),
      rootCause: 'Sub-standard paint applied during finishing stage. Vendor quality control lapse.',
      chronology: 'Month 1: Possession\nMonth 12: Paint peeling noticed\nMonth 12 Week 2: Customer complaint raised',
      aiRephrased: ['Sub-standard paint product used during interior finishing', 'Vendor QC process failed to detect non-conforming material'],
      approvedBy: 'u3',
      approvedAt: hoursAgo(88),
    },
    capa: {
      corrective: 'Full bedroom repainted with premium paint. Warranty extended by 2 years.',
      preventive: 'Paint vendor quality audit mandatory. Approved vendor list updated. Post-possession 6-month inspection added.',
      aiRephrased: ['Full bedroom repainted using premium-grade approved paint', 'Customer warranty extended by 2 years', 'Mandatory quality audit added to paint vendor onboarding process', 'Post-possession 6-month inspection protocol implemented'],
      approvedBy: 'u3',
      approvedAt: hoursAgo(88),
    },
    closureStatus: 'Closed',
    customerConfirmation: { receivedAt: hoursAgo(50), note: 'Customer satisfied with resolution.' },
  },
  {
    id: 'ESC-2026-006',
    project: 'Godrej Nurture',
    type: 'Safety',
    severity: 'Critical',
    source: 'LinkedIn',
    raisedOn: hoursAgo(5),
    zone: 'West',
    issueDetails: 'Customer posted on LinkedIn about exposed electrical wiring in common area of basement parking. Potential fire hazard. Post getting viral.',
    notes: 'Social media team flagged. Immediate containment required.',
    status: 'Pending Validation',
    department: null,
    assignedTo: null,
    watchers: ['u5'],
    mailThread: null,
    aiExtracted: {
      keywords: ['exposed wiring', 'electrical', 'fire hazard', 'social media', 'safety'],
      confidence: 0.94,
      suggestedSeverity: 'Critical',
      suggestedDepartment: 'Engineering',
    },
    validatedBy: null,
    validatedAt: null,
    slaStarted: hoursAgo(5),
    rcaDue: hoursAgo(-43),
    closureDue: hoursAgo(-115),
    actions: [],
    cbeDate: null,
    rca: null,
    capa: null,
    closureStatus: null,
    customerConfirmation: null,
  },
  {
    id: 'ESC-2026-007',
    project: 'Godrej Infinity',
    type: 'Documentation',
    severity: 'Medium',
    source: 'Email',
    raisedOn: hoursAgo(96),
    zone: 'North',
    issueDetails: 'Customer has not received OC copy despite multiple follow-ups over 3 months. Needed for home loan disbursement.',
    notes: 'Customer has shared all pending documents.',
    status: 'CAPA Pending',
    department: 'Customer Relations',
    assignedTo: 'u8',
    watchers: ['u2'],
    mailThread: 'https://mail.example.com/thread/007',
    aiExtracted: {
      keywords: ['OC copy', 'documentation', 'home loan', 'follow-up'],
      confidence: 0.87,
      suggestedSeverity: 'Medium',
      suggestedDepartment: 'Customer Relations',
    },
    validatedBy: 'u1',
    validatedAt: hoursAgo(94),
    slaStarted: hoursAgo(96),
    rcaDue: hoursAgo(72),
    closureDue: hoursAgo(24),
    actions: [
      { by: 'u8', at: hoursAgo(80), text: 'OC document located. Pending authority sign-off.' },
      { by: 'u8', at: hoursAgo(40), text: 'OC dispatched to customer via courier.' },
    ],
    cbeDate: hoursAgo(-24),
    rca: {
      submittedBy: 'u8',
      submittedAt: hoursAgo(60),
      rootCause: 'OC filing process not tracked in CRM. Physical file misplaced during office relocation.',
      chronology: 'Month 1: Customer requested OC\nMonth 2: Internal follow-up initiated\nMonth 3: Office relocation caused file misplacement\nMonth 3 Week 2: Escalation raised',
      aiRephrased: ['OC document filing not tracked in CRM system', 'Physical file misplaced during Q1 office relocation'],
      approvedBy: 'u3',
      approvedAt: hoursAgo(55),
    },
    capa: null,
    closureStatus: null,
    customerConfirmation: null,
  },
];

export const INBOX_EMAILS = [
  {
    id: 'mail-001',
    from: 'rahul.mehrotra@gmail.com',
    fromName: 'Rahul Mehrotra',
    to: 'complaints@godrejproperties.com',
    cc: ['ceo@godrejproperties.com', 'cqo@godrejproperties.com'],
    subject: 'URGENT: Severe Water Seepage — Godrej One Worli, Tower B, Flat 1204',
    receivedAt: new Date(now - 0.5 * 3600000).toISOString(),
    source: 'Email',
    aiStatus: 'extracted',
    body: `Dear Sir / Madam,

I am writing this email with extreme urgency and distress regarding a severe water seepage issue in my apartment at Godrej One Worli, Tower B, Flat No. 1204.

For the past 3 weeks, there has been continuous water seepage through the bedroom ceiling and one of the structural walls. The water damage has now spread to the flooring and has caused visible cracks in the plastering. The situation is a potential HAZARD as electrical fittings are also exposed to moisture.

Despite raising this matter multiple times with your site team, no concrete action has been taken. I have been given false assurances on 4 separate occasions.

I would like to inform you that I have already consulted a legal expert and if this is not resolved within 48 hours, I will be filing a complaint with the Consumer Court and approaching media channels.

I have CC'd the CEO and CQO of Godrej Properties on this email and expect immediate intervention.

Regards,
Rahul Mehrotra
Flat 1204, Tower B, Godrej One Worli
Mobile: +91 98201 XXXXX`,
    aiExtracted: {
      customerName: 'Rahul Mehrotra',
      customerEmail: 'rahul.mehrotra@gmail.com',
      project: 'Godrej One Worli',
      issueDetails: 'Severe water seepage in Tower B, Flat 1204. Ceiling and structural wall affected. Electrical fittings exposed to moisture. Potential hazard. Legal action threatened.',
      keywords: ['water seepage', 'hazard', 'legal', 'structural', 'electrical', 'consumer court'],
      suggestedSeverity: 'Fatal',
      suggestedDepartment: 'Engineering',
      suggestedZone: 'West',
      suggestedType: 'Structural',
      confidence: 0.96,
      sentiment: 'Highly Negative',
      urgencySignals: ['48-hour ultimatum', 'legal threat', 'media escalation threat', 'CEO in CC'],
    },
    queuedAsComplaintId: null,
  },
  {
    id: 'mail-002',
    from: 'preethi.sundaram@outlook.com',
    fromName: 'Preethi Sundaram',
    to: 'complaints@godrejproperties.com',
    cc: ['chairman@godrejproperties.com'],
    subject: 'Fwd: Possession Delay — Godrej Splendour, Unit 3B — 22 Months Overdue',
    receivedAt: new Date(now - 2 * 3600000).toISOString(),
    source: 'Chairman Mail',
    aiStatus: 'extracted',
    body: `---------- Forwarded message ----------
From: chairman@godrejproperties.com
To: complaints@godrejproperties.com
Subject: FWD: Please look into this urgently

--- Original Message ---
From: Preethi Sundaram <preethi.sundaram@outlook.com>
To: chairman@godrejproperties.com
Date: 13 May 2026, 11:32 AM

Dear Chairman,

I am reaching out to you directly as I have exhausted every other avenue.

I booked Unit 3B in Godrej Splendour in January 2024 with a promised possession date of July 2024. It is now May 2026 — a delay of 22 months — and I have received no formal communication from your organization about the revised possession date.

My home loan EMIs are running since July 2024, and I am simultaneously paying rent. This is causing severe financial hardship. I have written to the project team over 15 times with no meaningful response.

I have filed a complaint with RERA (Ref No: RERA/KA/2026/0341) and my lawyer has advised me to proceed with a consumer court case if possession is not handed over within 30 days.

I am attaching all correspondence for your reference.

Please treat this as a CRITICAL escalation.

Regards,
Preethi Sundaram
Mobile: +91 99800 XXXXX
RERA Complaint Ref: RERA/KA/2026/0341`,
    aiExtracted: {
      customerName: 'Preethi Sundaram',
      customerEmail: 'preethi.sundaram@outlook.com',
      project: 'Godrej Splendour',
      issueDetails: 'Possession delayed by 22 months (promised July 2024, still pending May 2026). Customer paying double EMI + rent. RERA complaint filed. Legal action imminent.',
      keywords: ['possession delay', 'legal', 'RERA', 'consumer court', 'financial hardship', 'EMI'],
      suggestedSeverity: 'Fatal',
      suggestedDepartment: 'Legal',
      suggestedZone: 'South',
      suggestedType: 'Legal',
      confidence: 0.97,
      sentiment: 'Extremely Negative',
      urgencySignals: ['RERA complaint filed', '30-day legal ultimatum', 'Chairman escalation', '22-month delay'],
    },
    queuedAsComplaintId: null,
  },
  {
    id: 'mail-003',
    from: 'amit.joshi.blr@gmail.com',
    fromName: 'Amit Joshi',
    to: 'complaints@godrejproperties.com',
    cc: [],
    subject: 'Flooring tiles cracking — Godrej Reserve Whitefield, Block C, 3 units',
    receivedAt: new Date(now - 5 * 3600000).toISOString(),
    source: 'Email',
    aiStatus: 'extracted',
    body: `Hi,

I am a resident of Godrej Reserve Whitefield, Block C, Flat 802. I wanted to bring to your attention that the floor tiles in my apartment have started cracking within 6 months of possession. The issue is not isolated — I have spoken to my neighbours in Flat 804 and 806 and they are facing identical problems.

The cracks are appearing at the tile joints in the living room and master bedroom. I suspect this is a quality issue with the tiles or the grouting material used during construction.

We would like a proper investigation and full replacement of the affected tiles, not just touch-up repairs.

Please advise on the timeline for resolution.

Thanks,
Amit Joshi
Flat 802, Block C, Godrej Reserve Whitefield`,
    aiExtracted: {
      customerName: 'Amit Joshi',
      customerEmail: 'amit.joshi.blr@gmail.com',
      project: 'Godrej Reserve Whitefield',
      issueDetails: 'Floor tiles cracking at joints in living room and master bedroom within 6 months of possession. Affecting at least 3 units (802, 804, 806) in Block C. Customer requesting full replacement.',
      keywords: ['flooring', 'tile cracking', 'quality defect', 'grouting', 'multiple units'],
      suggestedSeverity: 'Critical',
      suggestedDepartment: 'Quality',
      suggestedZone: 'South',
      suggestedType: 'Quality',
      confidence: 0.91,
      sentiment: 'Negative',
      urgencySignals: ['Multiple units affected', 'Systematic quality defect suspected'],
    },
    queuedAsComplaintId: null,
  },
  {
    id: 'mail-004',
    from: 'linkedin-forward@notifications.linkedin.com',
    fromName: 'LinkedIn (via Social Media Monitor)',
    to: 'complaints@godrejproperties.com',
    cc: ['socialmedia@godrejproperties.com', 'cqo@godrejproperties.com'],
    subject: '[LinkedIn Alert] Negative Post — Exposed Electrical Wiring — Godrej Nurture',
    receivedAt: new Date(now - 5 * 3600000).toISOString(),
    source: 'LinkedIn',
    aiStatus: 'extracted',
    body: `--- SOCIAL MEDIA MONITORING ALERT ---
Platform     : LinkedIn
Detected By  : Social Listening Tool (Auto-forwarded)
Post URL     : linkedin.com/posts/sanjay-k-1234 [link]
Engagement   : 47 Likes | 23 Comments | 12 Shares (and growing)
---

POST CONTENT (verbatim):

"Shocking negligence at Godrej Nurture (Pune)! 🚨

Discovered exposed electrical wiring in the basement parking of our building today. The wires are hanging loose near the fire exit passage — a potential fire hazard waiting to happen.

I have reported this to the site office THREE times in the past 2 weeks. No action. No acknowledgement.

Is this how a premium developer treats its residents?

Tagging @GodrejProperties @CREDAI @MaharashtraRERA

This is unacceptable. #GodrejProperties #SafetyFirst #ConsumerRights"

--- END OF POST ---

ACTION REQUIRED: This post is gaining traction. Recommend immediate on-ground action and a public response within 2 hours to contain reputational damage.`,
    aiExtracted: {
      customerName: 'Sanjay K.',
      customerEmail: null,
      project: 'Godrej Nurture',
      issueDetails: 'Exposed electrical wiring in basement parking near fire exit. Reported to site 3 times without action. Now viral on LinkedIn with 47 likes, 23 comments. Reputational risk high.',
      keywords: ['exposed wiring', 'electrical', 'fire hazard', 'safety', 'social media', 'viral', 'LinkedIn'],
      suggestedSeverity: 'Critical',
      suggestedDepartment: 'Engineering',
      suggestedZone: 'West',
      suggestedType: 'Safety',
      confidence: 0.94,
      sentiment: 'Extremely Negative (Public)',
      urgencySignals: ['Viral social media post', 'Public tagging of brand', 'RERA tagged', 'Fire hazard'],
    },
    queuedAsComplaintId: null,
  },
  {
    id: 'mail-005',
    from: 'meena.krishnamurthy@yahoo.com',
    fromName: 'Meena Krishnamurthy',
    to: 'complaints@godrejproperties.com',
    cc: [],
    subject: 'Completion Certificate / OC not received — 3 months pending — Godrej Infinity',
    receivedAt: new Date(now - 8 * 3600000).toISOString(),
    source: 'Email',
    aiStatus: 'pending',
    body: `Hello,

I took possession of my flat in Godrej Infinity (North Zone) in February 2026. It has now been 3 months and I have still not received the Occupancy Certificate (OC) from your team.

My bank (HDFC) is withholding the final disbursement of my home loan until I submit the OC. Every month I delay, I incur additional interest. The amount pending is approx Rs. 18 lakhs.

I have called your customer care helpline 6 times and each time I am told "it will be dispatched in 3-4 working days." This has been going on since February.

Please resolve this on priority. I need the OC by end of this week without fail.

Meena Krishnamurthy
Flat No: GI-1403
Godrej Infinity, North Zone`,
    aiExtracted: null,
    queuedAsComplaintId: null,
  },
  {
    id: 'mail-006',
    from: 'vikrant.desai@hotmail.com',
    fromName: 'Vikrant Desai',
    to: 'complaints@godrejproperties.com',
    cc: [],
    subject: 'Elevator not working for 4 days — Block A — Godrej Meridien',
    receivedAt: new Date(now - 12 * 3600000).toISOString(),
    source: 'Email',
    aiStatus: 'queued',
    body: `To Whom It May Concern,

The elevator in Block A of Godrej Meridien has been non-functional since Sunday (4 days now). We have elderly residents including my mother (age 74) who lives on the 9th floor and cannot climb stairs.

I understand breakdowns happen, but 4 days is completely unacceptable. We were initially told it would be fixed in 24 hours. Then 48 hours. Now no one is responding.

Please send a technician immediately.

Vikrant Desai
Block A, Floor 9
Godrej Meridien`,
    aiExtracted: {
      customerName: 'Vikrant Desai',
      customerEmail: 'vikrant.desai@hotmail.com',
      project: 'Godrej Meridien',
      issueDetails: 'Elevator in Block A non-functional for 4 days. Elderly resident (age 74) on 9th floor unable to use stairs. Multiple false timelines given by site team.',
      keywords: ['elevator', 'non-functional', 'maintenance', 'elderly resident', 'AMC'],
      suggestedSeverity: 'Medium',
      suggestedDepartment: 'Operations',
      suggestedZone: 'Central',
      suggestedType: 'Maintenance',
      confidence: 0.89,
      sentiment: 'Negative',
      urgencySignals: ['Elderly resident affected', '4-day downtime', 'Repeated false promises'],
    },
    queuedAsComplaintId: 'ESC-2026-NEW-004',
  },
];

export const INBOX_CONFIG = {
  email: 'complaints@godrejproperties.com',
  provider: 'Microsoft 365 (Outlook)',
  lastSynced: new Date(now - 4 * 60000).toISOString(),
  autoSync: true,
  syncInterval: 5,
  totalFetched: 6,
  unprocessed: 1,
};

export const NOTIFICATIONS = [
  { id: 'n1', type: 'SLA_BREACH',    complaintId: 'ESC-2026-002', title: 'SLA Breached — RCA Overdue', message: 'RCA for ESC-2026-002 was due 12 hours ago. Escalating to ZCEO.', createdAt: hoursAgo(2), read: false, severity: 'Critical' },
  { id: 'n2', type: 'ASSIGNMENT',    complaintId: 'ESC-2026-001', title: 'New Complaint Assigned', message: 'ESC-2026-001 has been assigned to Engineering team.', createdAt: hoursAgo(9), read: false, severity: 'Fatal' },
  { id: 'n3', type: 'RCA_SUBMITTED', complaintId: 'ESC-2026-003', title: 'RCA Submitted — Pending Approval', message: 'RCA for ESC-2026-003 submitted by Rajesh Kumar. Awaiting authority approval.', createdAt: hoursAgo(15), read: true, severity: 'Fatal' },
  { id: 'n4', type: 'VALIDATION',    complaintId: 'ESC-2026-006', title: 'New Complaint Awaiting Validation', message: 'ESC-2026-006 (Godrej Nurture) requires AI validation review.', createdAt: hoursAgo(5), read: false, severity: 'Critical' },
  { id: 'n5', type: 'SLA_WARNING',   complaintId: 'ESC-2026-007', title: 'SLA Warning — Closure Due Soon', message: 'ESC-2026-007 closure deadline in 24 hours. CAPA still pending.', createdAt: hoursAgo(1), read: false, severity: 'Medium' },
  { id: 'n6', type: 'CLOSURE',       complaintId: 'ESC-2026-005', title: 'Complaint Closed', message: 'ESC-2026-005 has been hard closed with customer confirmation.', createdAt: hoursAgo(50), read: true, severity: 'Low' },
];

export const ANALYTICS_DATA = {
  monthlyTrend: [
    { month: 'Dec', total: 12, closed: 10, breached: 2 },
    { month: 'Jan', total: 18, closed: 15, breached: 3 },
    { month: 'Feb', total: 14, closed: 12, breached: 2 },
    { month: 'Mar', total: 22, closed: 17, breached: 5 },
    { month: 'Apr', total: 19, closed: 16, breached: 3 },
    { month: 'May', total: 7,  closed: 1,  breached: 1 },
  ],
  severityDistribution: [
    { name: 'Fatal',    value: 8,  fill: '#DC2626' },
    { name: 'Critical', value: 15, fill: '#EA580C' },
    { name: 'Medium',   value: 22, fill: '#D97706' },
    { name: 'Low',      value: 17, fill: '#16A34A' },
  ],
  departmentWise: [
    { dept: 'Engineering', open: 4, closed: 8 },
    { dept: 'Quality',     open: 3, closed: 12 },
    { dept: 'Legal',       open: 2, closed: 5 },
    { dept: 'Operations',  open: 5, closed: 7 },
    { dept: 'CX',          open: 2, closed: 9 },
  ],
  zoneWise: [
    { zone: 'North', count: 18 },
    { zone: 'South', count: 14 },
    { zone: 'East',  count: 10 },
    { zone: 'West',  count: 16 },
    { zone: 'Central', count: 4 },
  ],
  avgResolutionDays: [
    { severity: 'Fatal',    days: 2.8, target: 3 },
    { severity: 'Critical', days: 4.2, target: 5 },
    { severity: 'Medium',   days: 6.1, target: 7 },
    { severity: 'Low',      days: 8.9, target: 10 },
  ],
  repeatIssues: [
    { type: 'Flooring Defects', count: 7 },
    { type: 'Water Leakage',    count: 5 },
    { type: 'Paint Issues',     count: 4 },
    { type: 'Elevator Fault',   count: 3 },
    { type: 'Documentation',    count: 3 },
  ],
};

export const ESCALATION_MATRIX = [
  { severity: 'Fatal',    actionStart: 12, actionComplete: 'As agreed', rca: 24, closure: 72,  level1: 'ZOH',  level2: 'ZCEO', level3: 'CQO' },
  { severity: 'Critical', actionStart: 24, actionComplete: 'As agreed', rca: 48, closure: 120, level1: 'ZQH',  level2: 'ZOH',  level3: 'ZCEO' },
  { severity: 'Medium',   actionStart: 48, actionComplete: 'As agreed', rca: 72, closure: 168, level1: 'Site Manager', level2: 'ZQH', level3: 'ZOH' },
  { severity: 'Low',      actionStart: 72, actionComplete: 'As agreed', rca: 96, closure: 240, level1: 'CX Team', level2: 'Site Manager', level3: 'ZQH' },
];
