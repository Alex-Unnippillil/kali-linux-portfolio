import React from 'react';
import { render } from '@testing-library/react';
import { LocaleProvider, useFormatter } from '../utils/format';

function NumberProbe({
  value,
  options,
}: {
  value: number;
  options?: Intl.NumberFormatOptions;
}) {
  const { formatNumber } = useFormatter();
  return <div>{formatNumber(value, options)}</div>;
}

function DateProbe({
  value,
  options,
}: {
  value: string | number | Date;
  options?: Intl.DateTimeFormatOptions;
}) {
  const { formatDateTime } = useFormatter();
  return <div>{formatDateTime(value as any, options)}</div>;
}

function DateTimeProbe({
  value,
  options,
}: {
  value: string | number | Date;
  options?: Intl.DateTimeFormatOptions;
}) {
  const { formatDateTime } = useFormatter();
  return <div>{formatDateTime(value as any, options)}</div>;
}

// Helper components for clarity
const NumericSnapshot = ({
  locale,
  numberingSystem,
  value,
}: {
  locale: string;
  numberingSystem: string;
  value: number;
}) => (
  <LocaleProvider value={{ locale, numberingSystem }}>
    <NumberProbe value={value} options={{ maximumFractionDigits: 2 }} />
  </LocaleProvider>
);

const DateSnapshot = ({
  locale,
  calendar,
  date,
}: {
  locale: string;
  calendar: string;
  date: string;
}) => (
  <LocaleProvider value={{ locale, calendar }}>
    <DateTimeProbe
      value={date}
      options={{ dateStyle: 'full', timeZone: 'UTC' }}
    />
  </LocaleProvider>
);

describe('locale formatter snapshots', () => {
  it('renders Arabic-Indic digits for numbers', () => {
    const { container } = render(
      <NumericSnapshot locale="ar-EG" numberingSystem="arab" value={1234567.89} />,
    );
    expect(container.firstChild?.textContent).toMatchInlineSnapshot(
      `"١٬٢٣٤٬٥٦٧٫٨٩"`,
    );
  });

  it('formats Buddhist calendar dates with localized year', () => {
    const { container } = render(
      <DateSnapshot
        locale="th-TH"
        calendar="buddhist"
        date="2024-04-13T06:30:00Z"
      />,
    );
    expect(container.firstChild?.textContent).toMatchInlineSnapshot(
      `"วันเสาร์ที่ 13 เมษายน พ.ศ. 2567"`,
    );
  });

  it('formats ISO calendar dates consistently', () => {
    const { container } = render(
      <LocaleProvider value={{ locale: 'en-GB', calendar: 'iso8601' }}>
        <DateProbe
          value="2024-12-31T23:59:59Z"
          options={{
            dateStyle: 'long',
            timeStyle: 'medium',
            timeZone: 'UTC',
          }}
        />
      </LocaleProvider>,
    );
    expect(container.firstChild?.textContent).toMatchInlineSnapshot(
      `"2024 December 31 at 23:59:59"`,
    );
  });
});
