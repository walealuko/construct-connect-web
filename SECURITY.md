# Security Policy

## Supported Versions

The latest commit on `main` is supported. Older commits are not — we
do not backport security fixes to historical SHAs. If you are running
behind a fork, please pin to a known-good commit and watch the repo
for advisories.

## Reporting a Vulnerability

Please **do not** file a public GitHub issue for suspected
vulnerabilities. Instead, open a private security advisory on GitHub
(Security → Advisories → New draft security advisory) or email
security@construct-hub.example.com with:

- A clear description of the vulnerability and its impact.
- Steps to reproduce, ideally with a minimal proof of concept.
- The commit / deployment SHA where you observed the issue.

We aim to:

- Acknowledge new reports within **3 business days**.
- Ship a fix or a workaround within **30 days** for confirmed issues.
- Credit reporters in the release notes unless you ask us not to.

## Out of Scope

- Automated scanner output without a working proof of concept.
- Denial-of-service against staging or demo deployments.
- Issues that require a victim to paste a malicious script into the
  browser console while already signed in.