import type { GmailThread, GmailMessage, GmailMessagePart, ThreadListItem, GmailLabel } from '@morg/shared'

function b64url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function mkPayload(text: string, from: string, subject: string, date: string): GmailMessagePart {
  return {
    partId: '',
    mimeType: 'text/plain',
    filename: '',
    headers: [
      { name: 'From', value: from },
      { name: 'Subject', value: subject },
      { name: 'Date', value: date },
    ],
    body: { size: text.length, data: b64url(text) },
  }
}

function mkMsg(
  id: string, threadId: string,
  from: string, subject: string, date: string,
  text: string, labelIds: string[],
): GmailMessage {
  return {
    id,
    threadId,
    labelIds,
    snippet: text.slice(0, 120).replace(/\n/g, ' '),
    payload: mkPayload(text, from, subject, date),
    sizeEstimate: text.length,
    historyId: '100000',
    internalDate: new Date(date).getTime().toString(),
  }
}

const ago = (ms: number) => new Date(Date.now() - ms)
const h = (n: number) => 1000 * 60 * 60 * n
const d = (n: number) => h(24 * n)

// ────────── Thread list (inbox) ──────────

export const DEMO_THREAD_LIST: ThreadListItem[] = [
  // Welcome
  {
    id: 'msg-001', threadId: 'thread-001',
    subject: 'Welcome to morg!',
    from: 'morg Demo <demo@morg.example>',
    date: ago(h(0.08)).toISOString(),
    snippet: 'This is a demo of morg — a Gmail organizer PWA. Try selecting threads and using bulk actions.',
    labelIds: ['INBOX', 'UNREAD'],
    unread: true,
  },

  // 5 newsletters from the same sender — perfect for bulk-select demo
  {
    id: 'msg-nl-1', threadId: 'thread-nl-1',
    subject: 'Weekly digest #52 — what\'s new this week',
    from: 'Newsletter <newsletter@example.com>',
    date: ago(h(2)).toISOString(),
    snippet: 'Top picks this week: productivity tools, design inspiration, and the best dev articles.',
    labelIds: ['INBOX', 'UNREAD', 'Newsletter'],
    unread: true,
  },
  {
    id: 'msg-nl-2', threadId: 'thread-nl-2',
    subject: 'Weekly digest #51 — year-end recap',
    from: 'Newsletter <newsletter@example.com>',
    date: ago(d(7)).toISOString(),
    snippet: 'Looking back at the year: top stories, milestones, and what\'s coming next.',
    labelIds: ['INBOX', 'Newsletter'],
    unread: false,
  },
  {
    id: 'msg-nl-3', threadId: 'thread-nl-3',
    subject: 'Weekly digest #50 — holiday special',
    from: 'Newsletter <newsletter@example.com>',
    date: ago(d(14)).toISOString(),
    snippet: 'Happy holidays! Here are our favourite reads and tools from the past month.',
    labelIds: ['INBOX', 'Newsletter'],
    unread: false,
  },
  {
    id: 'msg-nl-4', threadId: 'thread-nl-4',
    subject: 'Weekly digest #49 — AI roundup',
    from: 'Newsletter <newsletter@example.com>',
    date: ago(d(21)).toISOString(),
    snippet: 'Everything that happened in AI this week, summarised in 5 minutes.',
    labelIds: ['INBOX', 'Newsletter'],
    unread: false,
  },
  {
    id: 'msg-nl-5', threadId: 'thread-nl-5',
    subject: 'Weekly digest #48 — open source spotlight',
    from: 'Newsletter <newsletter@example.com>',
    date: ago(d(28)).toISOString(),
    snippet: 'Five open-source projects that deserve more attention — picked by our readers.',
    labelIds: ['INBOX', 'Newsletter'],
    unread: false,
  },

  // 4 GitHub notifications from the same sender
  {
    id: 'msg-gh-1', threadId: 'thread-gh-1',
    subject: '[GitHub] New issue: Button not responding on mobile',
    from: 'GitHub <notifications@github.com>',
    date: ago(h(5)).toISOString(),
    snippet: 'user123 opened issue #142 — Button not responding on mobile Safari.',
    labelIds: ['INBOX', 'UNREAD'],
    unread: true,
  },
  {
    id: 'msg-gh-2', threadId: 'thread-gh-2',
    subject: '[GitHub] PR merged: fix dark mode contrast',
    from: 'GitHub <notifications@github.com>',
    date: ago(d(1)).toISOString(),
    snippet: 'bob merged pull request #139 into main. fix: improve dark mode text contrast.',
    labelIds: ['INBOX'],
    unread: false,
  },
  {
    id: 'msg-gh-3', threadId: 'thread-gh-3',
    subject: '[GitHub] CI failed on branch feature/payments',
    from: 'GitHub <notifications@github.com>',
    date: ago(d(2)).toISOString(),
    snippet: 'Run #2041 failed. 3 tests failed in packages/api. Click to view the full log.',
    labelIds: ['INBOX', 'UNREAD'],
    unread: true,
  },
  {
    id: 'msg-gh-4', threadId: 'thread-gh-4',
    subject: '[GitHub] Review requested: Add webhook support',
    from: 'GitHub <notifications@github.com>',
    date: ago(d(3)).toISOString(),
    snippet: 'carol requested your review on pull request #136 — feat: Add webhook support.',
    labelIds: ['INBOX'],
    unread: false,
  },

  // Billing (2 invoices)
  {
    id: 'msg-inv-1', threadId: 'thread-inv-1',
    subject: 'Your invoice #INV-2025-0042',
    from: 'Billing <billing@saas-example.com>',
    date: ago(d(1)).toISOString(),
    snippet: 'Thank you for your payment. Amount: $49.00. Subscription renewed for another month.',
    labelIds: ['INBOX', 'Finance'],
    unread: false,
  },
  {
    id: 'msg-inv-2', threadId: 'thread-inv-2',
    subject: 'Your invoice #INV-2025-0041',
    from: 'Billing <billing@saas-example.com>',
    date: ago(d(31)).toISOString(),
    snippet: 'Thank you for your payment. Amount: $49.00. Subscription renewed for another month.',
    labelIds: ['INBOX', 'Finance'],
    unread: false,
  },

  // Work thread
  {
    id: 'msg-004', threadId: 'thread-004',
    subject: 'Re: Project kickoff meeting',
    from: 'Alice Smith <alice@work-example.com>',
    date: ago(d(2)).toISOString(),
    snippet: 'Thursday at 2pm works great! I\'ll send the calendar invite shortly.',
    labelIds: ['INBOX', 'UNREAD', 'Work'],
    unread: true,
  },

  // Order
  {
    id: 'msg-005', threadId: 'thread-005',
    subject: 'Your order has shipped!',
    from: 'orders@shop-example.com',
    date: ago(d(3)).toISOString(),
    snippet: 'Order #ORD-88421 is on its way. Estimated delivery: 2–3 business days.',
    labelIds: ['INBOX'],
    unread: false,
  },
]

// Sent threads (SENT label only — not shown in inbox)
export const DEMO_SENT_LIST: ThreadListItem[] = [
  {
    id: 'msg-sent-1', threadId: 'thread-sent-1',
    subject: 'Project kickoff meeting',
    from: 'You <you@example.com>',
    date: ago(d(2) + h(2)).toISOString(),
    snippet: 'Hi Alice, are you available Thursday at 2pm for a project kickoff?',
    labelIds: ['SENT'],
    unread: false,
  },
  {
    id: 'msg-sent-2', threadId: 'thread-sent-2',
    subject: 'Re: Your invoice #INV-2025-0042',
    from: 'You <you@example.com>',
    date: ago(h(20)).toISOString(),
    snippet: 'Hi, could you confirm whether this charge includes VAT? Thanks.',
    labelIds: ['SENT'],
    unread: false,
  },
  {
    id: 'msg-sent-3', threadId: 'thread-sent-3',
    subject: 'Feature request: batch export',
    from: 'You <you@example.com>',
    date: ago(d(5)).toISOString(),
    snippet: 'Hi team, would it be possible to add a batch export feature to the dashboard?',
    labelIds: ['SENT'],
    unread: false,
  },
]

// ────────── Thread details ──────────

const DEMO_THREADS: Record<string, GmailThread> = {
  'thread-001': {
    id: 'thread-001', historyId: '100001',
    snippet: 'This is a demo of morg.',
    messages: [
      mkMsg('msg-001', 'thread-001',
        'morg Demo <demo@morg.example>',
        'Welcome to morg!',
        ago(h(0.08)).toUTCString(),
        `Hi there!

This is a demo of morg — a Gmail organizer PWA.

Things you can try in demo mode:
  • Select multiple threads using the checkboxes
  • Use bulk actions: Archive, Delete, Mark Read
  • Open a thread to read the full message
  • Try the Senders tab — "Newsletter" has 5 emails you can bulk-archive!
  • Switch to Sent to see outgoing messages
  • Check the Labels tab for custom labels

Note: In demo mode no real emails are accessed and all actions
are simulated — nothing actually changes.

Enjoy exploring!
`,
        ['INBOX', 'UNREAD'],
      ),
    ],
  },

  // Newsletter threads
  'thread-nl-1': {
    id: 'thread-nl-1', historyId: '100010', snippet: 'Top picks this week.',
    messages: [mkMsg('msg-nl-1', 'thread-nl-1', 'Newsletter <newsletter@example.com>',
      'Weekly digest #52 — what\'s new this week', ago(h(2)).toUTCString(),
      `Weekly Digest #52

Top picks this week:

1. Productivity: A new Pomodoro method that actually works
2. Design: 10 micro-interactions worth stealing
3. Dev: How PostgreSQL's query planner really works

Thanks for reading!
— The Newsletter Team

Unsubscribe | Privacy Policy
`, ['INBOX', 'UNREAD', 'Newsletter'])],
  },
  'thread-nl-2': {
    id: 'thread-nl-2', historyId: '100011', snippet: 'Year-end recap.',
    messages: [mkMsg('msg-nl-2', 'thread-nl-2', 'Newsletter <newsletter@example.com>',
      'Weekly digest #51 — year-end recap', ago(d(7)).toUTCString(),
      `Weekly Digest #51

Year-end recap — our most-read stories of the year:

1. The death of the 9-to-5
2. Why your React app is slow
3. The best keyboards of the year

See you in the new year!
— The Newsletter Team
`, ['INBOX', 'Newsletter'])],
  },
  'thread-nl-3': {
    id: 'thread-nl-3', historyId: '100012', snippet: 'Holiday special.',
    messages: [mkMsg('msg-nl-3', 'thread-nl-3', 'Newsletter <newsletter@example.com>',
      'Weekly digest #50 — holiday special', ago(d(14)).toUTCString(),
      `Weekly Digest #50

Happy holidays! Our favourite reads from the past month:

1. Building in public — lessons from 6 months
2. A CSS trick that saved us 200ms
3. Open source gift guide

Happy holidays from all of us!
— The Newsletter Team
`, ['INBOX', 'Newsletter'])],
  },
  'thread-nl-4': {
    id: 'thread-nl-4', historyId: '100013', snippet: 'AI roundup.',
    messages: [mkMsg('msg-nl-4', 'thread-nl-4', 'Newsletter <newsletter@example.com>',
      'Weekly digest #49 — AI roundup', ago(d(21)).toUTCString(),
      `Weekly Digest #49 — AI Roundup

Everything that happened in AI this week:

• New model released, benchmarks shattered
• Open-source alternative reaches 1M downloads
• EU regulation moves to committee stage
• Prompt engineering is dead, long live system prompts

Read time: 4 min
— The Newsletter Team
`, ['INBOX', 'Newsletter'])],
  },
  'thread-nl-5': {
    id: 'thread-nl-5', historyId: '100014', snippet: 'Open source spotlight.',
    messages: [mkMsg('msg-nl-5', 'thread-nl-5', 'Newsletter <newsletter@example.com>',
      'Weekly digest #48 — open source spotlight', ago(d(28)).toUTCString(),
      `Weekly Digest #48 — Open Source Spotlight

Five projects that deserve more attention:

1. ripgrep-all — search PDFs, docx, zip files
2. difftastic — structural diffs that understand code
3. asdf — universal version manager
4. zellij — a terminal workspace
5. Hurl — run and test HTTP requests

Give them a star!
— The Newsletter Team
`, ['INBOX', 'Newsletter'])],
  },

  // GitHub threads
  'thread-gh-1': {
    id: 'thread-gh-1', historyId: '100020', snippet: 'issue #142 opened.',
    messages: [mkMsg('msg-gh-1', 'thread-gh-1', 'GitHub <notifications@github.com>',
      '[GitHub] New issue: Button not responding on mobile',
      ago(h(5)).toUTCString(),
      `user123 opened issue #142 in your-org/your-repo

Title: Button not responding on mobile Safari

The submit button on the checkout page doesn't respond to taps
on iPhone Safari 17. Desktop and Android Chrome work fine.

Steps to reproduce:
1. Open the checkout page on iPhone Safari
2. Fill in the form
3. Tap the Submit button
4. Nothing happens

Expected: form submits
Actual: no response

View: https://github.com/your-org/your-repo/issues/142
`, ['INBOX', 'UNREAD'])],
  },
  'thread-gh-2': {
    id: 'thread-gh-2', historyId: '100021', snippet: 'PR #139 merged.',
    messages: [mkMsg('msg-gh-2', 'thread-gh-2', 'GitHub <notifications@github.com>',
      '[GitHub] PR merged: fix dark mode contrast',
      ago(d(1)).toUTCString(),
      `bob merged pull request #139 into main

fix: improve dark mode text contrast

Changes:
  - Increased contrast ratio on secondary text from 3.2:1 to 5.4:1
  - Updated button hover states for dark mode

View: https://github.com/your-org/your-repo/pull/139
`, ['INBOX'])],
  },
  'thread-gh-3': {
    id: 'thread-gh-3', historyId: '100022', snippet: 'CI failed.',
    messages: [mkMsg('msg-gh-3', 'thread-gh-3', 'GitHub <notifications@github.com>',
      '[GitHub] CI failed on branch feature/payments',
      ago(d(2)).toUTCString(),
      `Run #2041 failed on feature/payments

3 tests failed in packages/api:

  ✗ POST /payments - should return 201 on success
  ✗ POST /payments - should reject invalid card number
  ✗ GET  /payments/:id - should return 404 for unknown id

View log: https://github.com/your-org/your-repo/actions/runs/2041
`, ['INBOX', 'UNREAD'])],
  },
  'thread-gh-4': {
    id: 'thread-gh-4', historyId: '100023', snippet: 'Review requested.',
    messages: [mkMsg('msg-gh-4', 'thread-gh-4', 'GitHub <notifications@github.com>',
      '[GitHub] Review requested: Add webhook support',
      ago(d(3)).toUTCString(),
      `carol requested your review on pull request #136

feat: Add webhook support

Adds configurable webhooks so users can POST thread events
to any endpoint. Includes retry logic and HMAC signing.

Files changed: 8   +312 −14

View: https://github.com/your-org/your-repo/pull/136
`, ['INBOX'])],
  },

  // Billing threads
  'thread-inv-1': {
    id: 'thread-inv-1', historyId: '100030', snippet: 'Invoice #INV-2025-0042.',
    messages: [mkMsg('msg-inv-1', 'thread-inv-1', 'Billing <billing@saas-example.com>',
      'Your invoice #INV-2025-0042',
      ago(d(1)).toUTCString(),
      `Invoice #INV-2025-0042

Date: ${ago(d(1)).toDateString()}
Amount: $49.00
Plan: Pro Monthly

Thank you for your payment. Your subscription has been renewed
for another month.

Questions? Contact support@saas-example.com
`, ['INBOX', 'Finance'])],
  },
  'thread-inv-2': {
    id: 'thread-inv-2', historyId: '100031', snippet: 'Invoice #INV-2025-0041.',
    messages: [mkMsg('msg-inv-2', 'thread-inv-2', 'Billing <billing@saas-example.com>',
      'Your invoice #INV-2025-0041',
      ago(d(31)).toUTCString(),
      `Invoice #INV-2025-0041

Date: ${ago(d(31)).toDateString()}
Amount: $49.00
Plan: Pro Monthly

Thank you for your payment. Your subscription has been renewed
for another month.

Questions? Contact support@saas-example.com
`, ['INBOX', 'Finance'])],
  },

  // Work thread
  'thread-004': {
    id: 'thread-004', historyId: '100004', snippet: 'Thursday at 2pm works great.',
    messages: [
      mkMsg('msg-004a', 'thread-004', 'You <you@example.com>',
        'Project kickoff meeting', ago(d(2) + h(2)).toUTCString(),
        `Hi Alice,

Are you available Thursday at 2pm for a project kickoff call?

Let me know,
You
`, ['SENT']),
      mkMsg('msg-004', 'thread-004', 'Alice Smith <alice@work-example.com>',
        'Re: Project kickoff meeting', ago(d(2)).toUTCString(),
        `Thursday at 2pm works great for me!

I'll send the calendar invite shortly. Looking forward to working
together on this project.

Best,
Alice
`, ['INBOX', 'UNREAD', 'Work']),
    ],
  },

  // Order thread
  'thread-005': {
    id: 'thread-005', historyId: '100005', snippet: 'Order #ORD-88421 is on its way.',
    messages: [mkMsg('msg-005', 'thread-005', 'orders@shop-example.com',
      'Your order has shipped!', ago(d(3)).toUTCString(),
      `Your order is on its way!

Order: #ORD-88421
Carrier: FastShip Express
Tracking: FS9876543210

Estimated delivery: 2–3 business days.

Items ordered:
  - Wireless Keyboard x1
  - USB-C Hub x1
`, ['INBOX'])],
  },

  // Sent threads
  'thread-sent-1': {
    id: 'thread-sent-1', historyId: '100040', snippet: 'Project kickoff meeting.',
    messages: [mkMsg('msg-sent-1', 'thread-sent-1', 'You <you@example.com>',
      'Project kickoff meeting', ago(d(2) + h(2)).toUTCString(),
      `Hi Alice,

Are you available Thursday at 2pm for a project kickoff call?
I'd like to go through the requirements and agree on a timeline.

Let me know,
You
`, ['SENT'])],
  },
  'thread-sent-2': {
    id: 'thread-sent-2', historyId: '100041', snippet: 'Invoice question.',
    messages: [mkMsg('msg-sent-2', 'thread-sent-2', 'You <you@example.com>',
      'Re: Your invoice #INV-2025-0042', ago(h(20)).toUTCString(),
      `Hi,

Could you confirm whether this charge includes VAT?
Our accounting team needs the VAT breakdown for expense reporting.

Thanks,
You
`, ['SENT'])],
  },
  'thread-sent-3': {
    id: 'thread-sent-3', historyId: '100042', snippet: 'Feature request: batch export.',
    messages: [mkMsg('msg-sent-3', 'thread-sent-3', 'You <you@example.com>',
      'Feature request: batch export', ago(d(5)).toUTCString(),
      `Hi team,

Would it be possible to add a batch export feature to the dashboard?
We need to export all records for a date range as CSV.

Use case:
  - Monthly reporting to management
  - Audit trail export for compliance

Happy to elaborate if helpful.

Thanks,
You
`, ['SENT'])],
  },
}

export const DEMO_LABELS: GmailLabel[] = [
  { id: 'INBOX',        name: 'Inbox',      type: 'system' },
  { id: 'SENT',         name: 'Sent',       type: 'system' },
  { id: 'DRAFT',        name: 'Drafts',     type: 'system' },
  { id: 'STARRED',      name: 'Starred',    type: 'system' },
  { id: 'TRASH',        name: 'Trash',      type: 'system' },
  { id: 'UNREAD',       name: 'Unread',     type: 'system' },
  { id: 'Work',         name: 'Work',       type: 'user' },
  { id: 'Newsletter',   name: 'Newsletter', type: 'user' },
  { id: 'Finance',      name: 'Finance',    type: 'user' },
]

export function getDemoThread(id: string): GmailThread | undefined {
  return DEMO_THREADS[id]
}

export function getDemoThreadList(q: string, sender?: string | null): ThreadListItem[] {
  const lower = q.toLowerCase()

  let list: ThreadListItem[]

  if (lower.includes('in:sent')) {
    list = DEMO_SENT_LIST
  } else if (lower.includes('is:unread')) {
    list = DEMO_THREAD_LIST.filter(t => t.unread)
  } else if (lower.includes('label:')) {
    const m = lower.match(/label:([^\s]+)/)
    const labelId = m ? m[1] : ''
    list = DEMO_THREAD_LIST.filter(t => t.labelIds.some(l => l.toLowerCase() === labelId))
  } else {
    // inbox: only INBOX-labeled threads
    list = DEMO_THREAD_LIST
  }

  if (sender) {
    list = list.filter(t => t.from.toLowerCase().includes(sender.toLowerCase()))
  }

  if (lower.includes('from:')) {
    const m = lower.match(/from:(\S+)/)
    if (m) list = list.filter(t => t.from.toLowerCase().includes(m[1]))
  }

  return list
}
