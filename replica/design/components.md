# SearchPilot UI component specification

**Scope:** Original SearchPilot design system. Components live in `components/ui/`, with an interactive showcase at **`/design`**. Use the tokens owned by `replica/design/tokens.json` and `tokens.css`; component CSS provides safe fallback colors until those tokens are loaded. Do not copy private source, branded assets, screenshots or licensed typefaces from third-party platforms.

## Core principles

- **Clarity first:** each metric communicates name, value, time range and data source. A sample can never be mistaken for observed production data.
- **Consistent hierarchy:** navy application header, light navigation, white surfaces, purple primary action and restrained semantic colors.
- **Accessible interaction:** semantic HTML, native buttons/inputs, visible keyboard focus, readable state text plus icons, and appropriate dialog/alert roles.
- **Responsive composition:** cards stack before text becomes too narrow; wide ranking tables scroll in their own container; mobile navigation is a labelled, dismissible drawer.
- **Reduced motion:** transitions respect `prefers-reduced-motion`. Do not encode meaning using motion or hue alone.

## Component contract

| Component | API | States and rules | Primary screens |
| --- | --- | --- | --- |
| `Button` | `variant="primary"|"secondary"|"ghost"|"danger"|"white"`, `size="sm"|"md"|"lg"`, `loading`, `leadingIcon` and native button props | Clear disabled/loading, spinner is decorative, `aria-busy`, persistent focus ring. `type="button"` by default; use `type="submit"` in forms. | S03–S32 |
| `Badge` | `tone="neutral"|"success"|"warning"|"danger"|"purple"|"info"`, `dot` | Text always provides status; decorative dot may supplement, never replace the label. | S05/S13/S18/S23 |
| `Card` | `title?`, `description?`, `action?`, `children` | Semantic section heading; compact white surface; can hold controls/charts/tables; title/description are optional. | S05–S32 |
| `MetricCard` | `label`, `value`, `icon`, `delta?`, `foot?`, `sample?` | Numeric value as text; sample status explicitly visible. Do not show invented variance as measured. | S05/S06/S18/S26 |
| `EmptyState` | `title`, `description?`, `icon?`, `action?`, `compact?` | Explains absence and next useful step; action must be a real button/link. | S03/S09/S13/S19 |
| `Alert` | `tone="info"|"success"|"warning"|"error"`, `title?`, `onDismiss?` | Non-error uses `role=status` and polite live updates; errors use `role=alert`. Dismiss button has accessible label. | All screens |
| `Input` | `label`, `hint?`, `error?`, native input props and ref | Uses generated ID linked to label. Hint/error attached by `aria-describedby`; invalid fields use `aria-invalid`. No placeholder-only labels. | S04/S09/S14/S17 |
| `Dialog` | `open`, `onClose`, `labelledBy`, `describedBy?`, `children` | `role=dialog`, `aria-modal=true`, focus moves inside, Tab cycles inside, Escape/backdrop closes, focus returns to trigger and body scroll locks. Keep dialog surface content's title ID equal to `labelledBy`. | S04/S14/S15 |

### Integration boundaries

The primitives use scoped `ui-*` classes from `app/globals.css`, respecting design token fallbacks. `Card`, `Badge`, `MetricCard`, `Alert`, `EmptyState` and `Dialog` are integrated into the existing workspace without changing API contracts. Other tools can adopt them incrementally; retain the existing nav/content structure until those screens receive dedicated components. Iconography uses the existing Lucide dependency. No external component framework is required.

### Keyboard and assistive technology behavior

1. The mobile menu button announces expanded/collapsed via `aria-expanded` and `aria-controls`; the sidebar is a labelled navigation landmark and responds to Escape. Closing it restores focus to the trigger. Background remains untabbable while the drawer is shown on narrow screens.
2. All modal entry buttons open a labelled, focus-managed dialog. The initial focus moves to an input or action; Tab and Shift+Tab wrap, Escape closes, and focus returns to the originating control.
3. Notifications provide polite or assertive announcements and a clearly labelled dismiss action. Loading states communicate `aria-busy` and visual affordance. Form failures remain visible long enough to be read and corrected.
4. Table headings are real `th` cells and numerical columns remain aligned. Ranking columns use descriptive labels; horizontal overflow does not clip information.
5. Charts have accessible descriptive labels and underlying tabular/contextual values where necessary; visual line and fill colors match the token palette. Static demonstration charts and metrics retain sample provenance labels.

### Visual QA checklist

- 1440, 1024, 768, 390 and 320 px widths: navigation, panels, modal and table overflow correctly.
- Zoom at 200%: action controls are visible without truncation; no fixed-height clipping.
- Keyboard-only: visible focus, navigation close, dialog focus trap and Escape, complete forms.
- Browser reduced-motion preference: no mandatory animations.
- Colors meet WCAG AA for common text; semantic statuses use labels in addition to hue. Confirm contrast against final tokens using the contrast validator from the design skill.
- No artificial organic traffic, ranking or backlink figures presented as live measurements.
