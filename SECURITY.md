# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security-sensitive findings.

Report vulnerabilities privately through GitHub's **Private vulnerability reporting**:

1. Go to the repository's **Security** tab → **Advisories** → **Report a vulnerability**.
2. Describe the issue, the affected version, and a minimal reproduction.

Or, if private reporting is unavailable, email the maintainer with `[SECURITY] dsh-session-pin` in the subject. Do not include exploit details in public places until the fix is released.

## Before you report

- **Sanitize everything you share.** Redact tokens, API keys, authorization headers, session cookies, environment variables, and any other secrets from logs and reproductions — replace them with placeholders such as `REDACTED`.
- Include only the minimum logs needed to reproduce the issue.

## Response expectations

- Acknowledgment: usually within **7 days**.
- Fix: as soon as possible, depending on severity; the maintainer is a volunteer, so critical issues take priority and lower-severity findings may take longer.
- If you need an urgent fix, say so in the report.

## Credit and disclosure

- Reporters are credited in the advisory and release notes, unless they prefer to stay anonymous.
- Public disclosure follows the fix: the advisory is published once a patched release is available, so users can update before details become public.
- Reasonable disclosure deadlines are respected; coordinated disclosure is preferred.

## Scope

This policy covers this plugin repository (`dsh-session-pin`) and its npm package. Vulnerabilities in the DeepSeek Harness core itself should be reported to [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) instead.
