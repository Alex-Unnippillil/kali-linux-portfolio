import { getIntl } from '@/lib/i18n/intl';
import { messageIds } from '@/lib/i18n/messages';

describe('currency converter history pluralization', () => {
  const counts = [0, 1, 3];

  it('formats plural forms in English', () => {
    const intl = getIntl('en');
    const formatted = counts.map((count) =>
      intl.formatMessage({ id: messageIds.currencyConverter.historyCount }, { count }),
    );

    expect(formatted).toMatchInlineSnapshot(`
      [
        "No history yet",
        "1 saved rate",
        "3 saved rates",
      ]
    `);
  });

  it('formats plural forms in Spanish', () => {
    const intl = getIntl('es');
    const formatted = counts.map((count) =>
      intl.formatMessage({ id: messageIds.currencyConverter.historyCount }, { count }),
    );

    expect(formatted).toMatchInlineSnapshot(`
      [
        "Sin historial",
        "1 registro guardado",
        "3 registros guardados",
      ]
    `);
  });
});
