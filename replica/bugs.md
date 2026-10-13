# SearchPilot reproduced issues

See [bug-report.md](bug-report.md) for reproduction steps, expected/actual behavior, evidence and remediation status.

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| BUG-001 | S2 | Invalid audit UUID exposed PostgreSQL diagnostic | Fixed and API-regression verified |
| BUG-002 | S3 | Registration password minimum mismatched server | Fixed and desktop form verified |
| BUG-003 | S3 | Low-contrast dashboard/login labels | Addressed; affected Axe selectors no longer reported in follow-up |
| BUG-004 | S3 | New account requested audit for stale demo project | Patched; browser retest pending |
| BUG-005 | S2 | Local database lacked auth tables and session secret, blocking registration | Fixed and locally API verified |

Browser test runner blockers and unverified scenarios are documented separately in [bug-report.md](bug-report.md).
