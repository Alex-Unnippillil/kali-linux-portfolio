# ICU Message Formatting Guidelines

This project uses [ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/) strings to provide
locale-aware pluralisation, gender selection, and runtime interpolation. The i18n runtime is defined in `i18n/message.ts` and
ships with default English (`en`) and Spanish (`es`) catalogues located in `i18n/locales/`.

## Adding or Updating Messages

1. **Edit the catalogues** – Each locale catalogue is a flat JSON map. Keys use dot notation to match feature areas (for
   example `trash.daysRemaining`). Values must be ICU-formatted strings. Keep leading spaces in the ICU text if the segment is
   meant to be concatenated with other segments, as seen in the project gallery filters.
2. **Plural rules** – Use the `{count, plural, one {...} other {...}}` pattern. If you need language-specific rules add extra
   selectors such as `=0` or `few`.
3. **Gender-aware messaging** – Use `{gender, select, male {...} female {...} other {...}}` to ensure inclusive phrasing. The
   runtime passes through unknown options to the `other` branch.
4. **Fallbacks** – When a message is missing from the requested locale the formatter automatically falls back to the default
   locale (`en`). Always keep the English catalogue complete so translators have a reference.
5. **Testing** – Add or update Jest snapshots in `__tests__/i18n.message.test.ts` whenever you change plural or gender rules. Run
   `yarn test i18n.message.test.ts --updateSnapshot` to refresh the reference output.

## Using the Formatter in Code

```ts
import { getMessageFormatter } from '@/i18n/message';

const formatter = getMessageFormatter('es'); // Defaults to English when omitted
const label = formatter.format('youtube.playlistCount', { count: playlists.length });
```

* Call `getMessageFormatter(locale)` from React hooks (for example inside `useMemo`) to avoid recalculating instances.
* If you need to detect the browser locale, use `detectLocale()` and pass the result into `getMessageFormatter()` so server and
  client renders stay consistent.
* Never manually assemble plural suffixes (`count === 1 ? '' : 's'`) – always go through the formatter so languages with
  non-English plural rules render correctly.

## Translator Tips

* Keep placeholders such as `{count}` or `{name}` intact. You can reposition them to match the grammar of the target language.
* Retain quotation marks around interpolated search terms (`"{search}"`) so UI copy stays consistent.
* When in doubt, check the existing English string and the snapshot tests to see how the message is rendered with real values.
