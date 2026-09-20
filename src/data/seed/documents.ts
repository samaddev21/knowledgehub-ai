export interface SeedDocument {
  name: string;
  collection: string;
  mimeType: string;
  content: string;
}

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    name: "Engineering Deployment Guide.md",
    collection: "Engineering",
    mimeType: "text/markdown",
    content: `# Engineering Deployment Guide

## Purpose
This guide defines how Acme Corporation deploys services to staging and production.

## Environments
- Development: engineers may deploy freely to personal namespaces.
- Staging: mirrors production; required before any production change.
- Production: protected; requires approved change request and on-call awareness.

## Deployment Checklist
1. Merge pull request after two approvals from the owning team.
2. Ensure CI is green (lint, typecheck, unit tests, integration tests).
3. Deploy to staging and verify smoke tests for at least 30 minutes.
4. Open a change request in the Operations portal with rollback plan.
5. Deploy to production during the approved maintenance window.
6. Monitor dashboards and error budgets for 60 minutes post-deploy.

## Rollback Policy
If a production deployment fails health checks within the first 15 minutes, on-call must initiate an immediate rollback to the previous stable release and open an incident channel named #inc-YYYYMMDD-service.

Health check failures include:
- HTTP 5xx rate above 2% for 5 consecutive minutes
- P99 latency exceeding 2x baseline
- Failed readiness probes on more than 30% of pods

## Canary Releases
All customer-facing services must use a 5% canary for 20 minutes before full rollout. Abort the canary if error rate doubles versus control.

## Secrets
Never embed secrets in source control. Use the platform secrets manager. Rotate credentials after any suspected exposure within 24 hours.

## Ownership
Platform Engineering owns this guide. Last reviewed: 2026-Q1.
`,
  },
  {
    name: "Production Incident SOP.md",
    collection: "Engineering",
    mimeType: "text/markdown",
    content: `# Production Incident SOP

## Severity Levels
- SEV1: Complete outage of a customer-facing product or data loss risk.
- SEV2: Major degradation affecting a significant customer segment.
- SEV3: Limited impact with workaround available.
- SEV4: Minor issue, tracked as backlog work.

## Incident Response Steps
1. Detect and declare: any engineer may declare an incident in #incidents.
2. Assign Incident Commander (IC). For SEV1/SEV2 the IC must be on-call or a staff+ engineer.
3. Create an incident channel and page required responders.
4. Stabilize: mitigate customer impact before root-causing.
5. Communicate status every 30 minutes for SEV1 and every 60 minutes for SEV2.
6. Resolve and confirm recovery with monitoring and customer signals.
7. Schedule a blameless postmortem within 5 business days for SEV1/SEV2.

## Customer Communication
Customer Support drafts external updates. Engineering provides factual impact and ETA. Do not speculate about root cause externally.

## Escalation
If the incident exceeds 60 minutes at SEV1 without a mitigation path, escalate to the Engineering Director and VP Engineering.

## Postmortem Requirements
Postmortems must include timeline, impact, contributing factors, what went well, and action items with owners and due dates.
`,
  },
  {
    name: "Employee Handbook Highlights.txt",
    collection: "HR",
    mimeType: "text/plain",
    content: `Acme Corporation — Employee Handbook Highlights

Work Hours
Core collaboration hours are 10:00–16:00 local time. Flexible schedules are encouraged when team agreements are met.

Paid Time Off
Full-time employees receive 20 days of PTO annually, accrued monthly. Unused PTO up to 5 days may roll over to the next calendar year. Parental leave is 16 weeks for primary caregivers and 8 weeks for secondary caregivers.

Remote Work
Employees may work remotely up to 3 days per week unless their role requires on-site presence. Managers approve recurring remote schedules. International remote work longer than 14 days requires HR and Legal approval.

Expenses
Business expenses must be submitted within 30 days with receipts. Meals while traveling are capped at $75/day. Home office equipment stipends are $500 per year.

Code of Conduct
Harassment, discrimination, and retaliation are prohibited. Report concerns to HR or anonymously via the ethics hotline. Investigations are confidential to the extent possible.

Performance Reviews
Reviews occur twice yearly in June and December. Goals should be SMART and aligned to team OKRs.
`,
  },
  {
    name: "Benefits Overview.md",
    collection: "HR",
    mimeType: "text/markdown",
    content: `# Benefits Overview

## Health Insurance
Acme offers medical, dental, and vision plans. The company covers 80% of employee premiums and 50% of dependent premiums on the standard PPO plan.

## Retirement
Employees may contribute to a 401(k). Acme matches 100% of the first 4% of eligible compensation.

## Wellness
Annual wellness stipend: $600 for fitness, mental health apps, or preventive care not covered by insurance.

## Learning Budget
Each employee receives a $1,200 annual learning budget for courses, conferences, and certifications. Manager approval is required for amounts over $400 in a single purchase.

## Enrollment
Open enrollment is each November. Life events (marriage, birth, relocation) allow mid-year changes within 30 days of the event.
`,
  },
  {
    name: "Business Continuity Plan.md",
    collection: "Operations",
    mimeType: "text/markdown",
    content: `# Business Continuity Plan

## Objectives
Maintain critical business functions during disruptions including facility outages, regional connectivity failures, and vendor outages.

## Critical Functions
1. Customer authentication and billing
2. Core product APIs
3. Support ticketing and status page updates
4. Payroll and employee communications

## Recovery Targets
- RTO for critical APIs: 4 hours
- RPO for transactional data: 15 minutes
- Status page updates within 15 minutes of declaring a major incident

## Alternate Sites
Primary region: us-east-1. Failover region: us-west-2. Failover drills are conducted quarterly by Operations and Platform Engineering.

## Vendor Dependencies
Critical vendors must have documented exit plans. Contracts for tier-1 vendors require 99.9% uptime SLAs and named escalation contacts.
`,
  },
  {
    name: "Office and Facilities Guide.txt",
    collection: "Operations",
    mimeType: "text/plain",
    content: `Office and Facilities Guide — Acme HQ

Building access requires a company badge. Guests must be registered in the lobby system at least 2 hours in advance.

Meeting rooms are booked via the workplace calendar. Rooms may be held for a maximum of 2 hours unless marked as all-hands.

After-hours access (after 20:00 or weekends) requires Security notification for groups larger than 10 people.

Lost badges must be reported to Security within 4 hours. Replacement badges are issued the same business day.

Emergency exits are marked on each floor plan posted near elevators. Assembly point is the north parking lot.
`,
  },
  {
    name: "Product Development Process.md",
    collection: "Product",
    mimeType: "text/markdown",
    content: `# Product Development Process

## Discovery
Product managers write problem briefs before solution briefs. Research must include at least five customer interviews for major bets.

## PRD Requirements
Every PRD includes: problem statement, goals, non-goals, success metrics, UX outline, technical considerations, and rollout plan.

## Prioritization
We use RICE scoring (Reach, Impact, Confidence, Effort). Quarterly roadmap review is held with Engineering, Design, Sales, and Support.

## Launch Checklist
- Feature flag configured
- Analytics events instrumented
- Docs updated in KnowledgeHub
- Support macros prepared
- Status: internal dogfood → 10% → 50% → 100%

## Deprecations
Public API deprecations require 90 days notice and a migration guide published in the Product collection.
`,
  },
  {
    name: "Q3 Roadmap Notes.md",
    collection: "Product",
    mimeType: "text/markdown",
    content: `# Q3 Roadmap Notes

## Themes
1. Improve onboarding activation from 42% to 55%.
2. Reduce P1 support volume related to permissions by 25%.
3. Ship enterprise SSO enhancements for Okta and Azure AD.

## Key Initiatives
- Guided setup wizard for new organizations
- Granular collection-level permissions
- Admin audit log export

## Out of Scope This Quarter
Marketplace integrations and mobile offline mode remain parked until Q4 capacity review.
`,
  },
  {
    name: "Sales Playbook.md",
    collection: "Sales",
    mimeType: "text/markdown",
    content: `# Sales Playbook

## Ideal Customer Profile
Mid-market B2B companies with 200–2,000 employees that already use Slack or Teams and maintain internal documentation across multiple tools.

## Discovery Questions
- Where does institutional knowledge live today?
- How long does it take a new hire to find deployment or policy answers?
- What compliance or access-control requirements apply?

## Pricing Guidance
Starter: up to 50 seats. Growth: up to 250 seats. Enterprise: custom SSO, audit logs, and dedicated success manager.

Discount authority: Account Executives may discount up to 10%. Discounts above 10% require Sales Director approval. Multi-year deals may include up to 15% with VP Sales approval.

## Competitive Notes
When competing with generic chatbots, emphasize organization-scoped retrieval, citations, role-based access, and demo-safe offline operation for security reviews.

## Handoff to Customer Success
Closed-won deals must include a kickoff brief within 3 business days covering collections to seed, admin owners, and success metrics.
`,
  },
  {
    name: "Security Acceptable Use Policy.md",
    collection: "Engineering",
    mimeType: "text/markdown",
    content: `# Security Acceptable Use Policy

## Scope
Applies to all employees, contractors, and systems processing Acme data.

## Requirements
- Use company-managed devices for production access.
- Enable hardware-backed MFA on all privileged accounts.
- Do not upload customer data to unsanctioned AI tools.
- Report suspected phishing within 1 hour to security@acme.example.

## Data Classification
Public, Internal, Confidential, Restricted. Restricted data (credentials, customer PII) must not appear in chat logs or screenshots shared externally.

## Violation Handling
Policy violations are reviewed by Security and HR. Intentional circumvention of access controls may result in termination and legal action.
`,
  },
];
