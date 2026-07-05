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

// ────────── Threads list ──────────

export const DEMO_THREAD_LIST: ThreadListItem[] = [
  {
    id: 'msg-001', threadId: 'thread-001',
    subject: 'Welcome to morg!',
    from: 'morg Demo <demo@morg.example>',
    date: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    snippet: 'This is a demo of morg — a Gmail organizer PWA. Try selecting threads and using bulk actions.',
    labelIds: ['INBOX', 'UNREAD'],
    unread: true,
  },
  {
    id: 'msg-002', threadId: 'thread-002',
    subject: 'Q2 newsletter — tips & updates',
    from: 'Newsletter <newsletter@example.com>',
    date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    snippet: 'Top picks for this quarter. Read time: 3 minutes. Unsubscribe at any time.',
    labelIds: ['INBOX', 'UNREAD', 'CATEGORY_PROMOTIONS'],
    unread: true,
  },
  {
    id: 'msg-003', threadId: 'thread-003',
    subject: 'Your invoice #INV-2025-0042',
    from: 'billing@saas-example.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    snippet: 'Thank you for your payment. Amount: $49.00. This is your receipt for the subscription renewal.',
    labelIds: ['INBOX'],
    unread: false,
  },
  {
    id: 'msg-004', threadId: 'thread-004',
    subject: 'Re: Project kickoff meeting',
    from: 'Alice Smith <alice@work-example.com>',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    snippet: 'Sounds great! I will send the calendar invite shortly. Looking forward to working together on this.',
    labelIds: ['INBOX', 'UNREAD'],
    unread: true,
  },
  {
    id: 'msg-005', threadId: 'thread-005',
    subject: 'Your order has shipped!',
    from: 'orders@shop-example.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    snippet: 'Order #ORD-88421 is on its way. Estimated delivery: 2–3 business days. Track your package below.',
    labelIds: ['INBOX'],
    unread: false,
  },
  {
    id: 'msg-006', threadId: 'thread-006',
    subject: '[GitHub] New issue opened: Button not responding on mobile',
    from: 'notifications@github.com',
    date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    snippet: 'user123 opened issue #142 in your-org/your-repo — Button not responding on mobile Safari.',
    labelIds: ['INBOX'],
    unread: false,
  },
]

// ────────── Thread details ──────────

const DEMO_THREADS: Record<string, GmailThread> = {
  'thread-001': {
    id: 'thread-001',
    historyId: '100001',
    snippet: 'This is a demo of morg.',
    messages: [
      mkMsg('msg-001', 'thread-001',
        'morg Demo <demo@morg.example>',
        'Welcome to morg!',
        new Date(Date.now() - 1000 * 60 * 5).toUTCString(),
        `Hi there!

This is a demo of morg — a Gmail organizer PWA.

Things you can try in demo mode:
  • Select multiple threads using the checkboxes
  • Use bulk actions: Archive, Delete, Mark Read
  • Open a thread to see the full message
  • Switch between Inbox / Unread / Sent views
  • Try the Senders tab to filter by sender

Note: In demo mode, no real emails are accessed and
all actions are simulated (nothing actually changes).

Enjoy exploring!
`,
        ['INBOX', 'UNREAD'],
      ),
    ],
  },
  'thread-002': {
    id: 'thread-002',
    historyId: '100002',
    snippet: 'Top picks for this quarter.',
    messages: [
      mkMsg('msg-002', 'thread-002',
        'Newsletter <newsletter@example.com>',
        'Q2 newsletter — tips & updates',
        new Date(Date.now() - 1000 * 60 * 60 * 2).toUTCString(),
        `Q2 Newsletter

Top picks for this quarter. Read time: 3 minutes.

1. Productivity tip: Use keyboard shortcuts to speed up your workflow.
2. New feature: Dark mode is now available in beta.
3. Community highlight: Over 10,000 users signed up last month!

Thanks for reading,
The Team

---
Unsubscribe | Privacy Policy
`,
        ['INBOX', 'UNREAD', 'CATEGORY_PROMOTIONS'],
      ),
    ],
  },
  'thread-003': {
    id: 'thread-003',
    historyId: '100003',
    snippet: 'Thank you for your payment.',
    messages: [
      mkMsg('msg-003', 'thread-003',
        'billing@saas-example.com',
        'Your invoice #INV-2025-0042',
        new Date(Date.now() - 1000 * 60 * 60 * 24).toUTCString(),
        `Invoice #INV-2025-0042

Date: ${new Date(Date.now() - 1000 * 60 * 60 * 24).toDateString()}
Amount: $49.00
Plan: Pro Monthly

Thank you for your payment. Your subscription has been renewed
for another month.

If you have any questions, contact support@saas-example.com.
`,
        ['INBOX'],
      ),
    ],
  },
  'thread-004': {
    id: 'thread-004',
    historyId: '100004',
    snippet: 'Looking forward to working together.',
    messages: [
      mkMsg('msg-004a', 'thread-004',
        'you@example.com',
        'Project kickoff meeting',
        new Date(Date.now() - 1000 * 60 * 60 * 50).toUTCString(),
        `Hi Alice,

Are you available Thursday at 2pm for a project kickoff?

Let me know,
You
`,
        ['SENT'],
      ),
      mkMsg('msg-004', 'thread-004',
        'Alice Smith <alice@work-example.com>',
        'Re: Project kickoff meeting',
        new Date(Date.now() - 1000 * 60 * 60 * 48).toUTCString(),
        `Thursday at 2pm works great for me!

I will send the calendar invite shortly. Looking forward to working
together on this project.

Best,
Alice
`,
        ['INBOX', 'UNREAD'],
      ),
    ],
  },
  'thread-005': {
    id: 'thread-005',
    historyId: '100005',
    snippet: 'Order #ORD-88421 is on its way.',
    messages: [
      mkMsg('msg-005', 'thread-005',
        'orders@shop-example.com',
        'Your order has shipped!',
        new Date(Date.now() - 1000 * 60 * 60 * 72).toUTCString(),
        `Your order is on its way!

Order: #ORD-88421
Carrier: FastShip Express
Tracking: FS9876543210

Estimated delivery: 2–3 business days.

Items ordered:
  - Wireless Keyboard x1
  - USB-C Hub x1

Track your package at: https://fastship.example/track
`,
        ['INBOX'],
      ),
    ],
  },
  'thread-006': {
    id: 'thread-006',
    historyId: '100006',
    snippet: 'user123 opened issue #142.',
    messages: [
      mkMsg('msg-006', 'thread-006',
        'notifications@github.com',
        '[GitHub] New issue opened: Button not responding on mobile',
        new Date(Date.now() - 1000 * 60 * 60 * 96).toUTCString(),
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

---
View on GitHub: https://github.com/your-org/your-repo/issues/142
`,
        ['INBOX'],
      ),
    ],
  },
}

export const DEMO_LABELS: GmailLabel[] = [
  { id: 'INBOX', name: 'Inbox', type: 'system' },
  { id: 'SENT', name: 'Sent', type: 'system' },
  { id: 'DRAFT', name: 'Drafts', type: 'system' },
  { id: 'STARRED', name: 'Starred', type: 'system' },
  { id: 'TRASH', name: 'Trash', type: 'system' },
  { id: 'UNREAD', name: 'Unread', type: 'system' },
]

export function getDemoThread(id: string): GmailThread | undefined {
  return DEMO_THREADS[id]
}

export function getDemoThreadList(q: string): ThreadListItem[] {
  const lower = q.toLowerCase()
  if (lower.includes('is:unread')) return DEMO_THREAD_LIST.filter(t => t.unread)
  if (lower.includes('in:sent')) return DEMO_THREAD_LIST.filter(t => t.labelIds.includes('SENT'))
  if (lower.includes('from:')) {
    const m = lower.match(/from:(\S+)/)
    if (m) return DEMO_THREAD_LIST.filter(t => t.from.toLowerCase().includes(m[1]))
  }
  const sender = new URLSearchParams().get('sender')
  if (sender) return DEMO_THREAD_LIST.filter(t => t.from.toLowerCase().includes(sender.toLowerCase()))
  return DEMO_THREAD_LIST
}
