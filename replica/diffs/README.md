# Visual comparison status: no scoreable pairs

As of 2026-10-13 there is no screenshot pair showing the same original-vs-SearchPilot screen **in the same state at a consistent viewport**. The three public references are historical annotated Semrush documentation images (S09, S13, S15). Existing clone screenshots for F03, F07 and other named flows are actually login redirects; F02 is unstyled. Only failed mobile auth captures exist.

We deliberately did **not** run `imgdiff.py` on unmatched images, manufacture an original screenshot, emit a false 0% layout score, or copy proprietary visuals into SearchPilot. The source/evidence inventory is in [../diff-report.md](../diff-report.md). This folder is reserved for future verifiable per-screen JSON/layout-diff images after valid pairs have been captured.

