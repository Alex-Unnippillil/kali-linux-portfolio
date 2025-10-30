# Design system notes

## Contrast audit (April 2024)

| Area | Before | After | WCAG AA contrast |
| --- | --- | --- | --- |
| Global muted text token (`--color-muted`) | Base theme `#1a2533` on background `#0b121a` (1.2:1) | `#94a3b8` on `#0b121a` | 7.3:1 |
| Dark theme muted text | `#1f1f1f` on `#000000` (1.3:1) | `#8b9bb5` on `#000000` | 7.4:1 |
| Neon theme muted text | `#222222` on `#000000` (1.3:1) | `#c084fc` on `#000000` | 8.0:1 |
| Matrix theme muted text | `#003300` on `#001100` (1.2:1) | `#3cb371` on `#001100` | 7.3:1 |
| Blackjack card fronts | Text `#000000` on `#111b24` (1.2:1) | Text `#f5faff` on `#111b24` | 16.6:1 |
| Blackjack card backs | Text `#111b24` on `#09121c` (1.1:1) | Text `#f5faff` on `#09121c` | 17.9:1 |
| Printable resume page | Body text `#000000` on `#111b24` (1.2:1) | Body text `#f5faff` on `#111b24` | 16.6:1 |

## Follow-up testing

- Run `yarn pa11y` (or the CI equivalent) to execute the updated pa11y scenarios against:
  - `/` (desktop shell)
  - `/apps`
  - `/apps/blackjack`
  - `/apps/nmap-nse`
  - `/apps/weather_widget`
- Validate manual spot checks for muted text in the terminal, Nmap catalogue, and weather widget call-to-actions.

These changes keep accent-driven surfaces intact while ensuring muted copy never drops below the WCAG AA 4.5:1 threshold.
