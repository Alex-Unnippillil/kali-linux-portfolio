import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SanitizationPlayground, {
  encodeHTML,
  encodeJS,
  encodeURL,
  encodeSQL,
} from '../apps/sanitization-playground';

describe('encoders', () => {
  const payload = "<script>alert('x')</script>";

  it('html encoder escapes markup', () => {
    expect(encodeHTML(payload)).toBe('&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;');
  });

  it('js encoder escapes for scripts', () => {
    expect(encodeJS(payload)).toBe('\\x3Cscript\\x3Ealert(\\x27x\\x27)\\x3C/script\\x3E');
  });

  it('url encoder uses encodeURIComponent', () => {
    expect(encodeURL(payload)).toBe('%3Cscript%3Ealert(\'x\')%3C%2Fscript%3E');
  });

  it('sql encoder doubles single quotes', () => {
    expect(encodeSQL("' OR 1=1; --")).toBe("'' OR 1=1; --");
  });
});

describe('SanitizationPlayground component', () => {
  it('shows encoded output for each tab', () => {
    const { getByText, getByRole, getByTestId, getAllByText } = render(<SanitizationPlayground />);
    const input = "<script>alert('x')</script>";
    const textarea = getByRole('textbox');
    fireEvent.change(textarea, { target: { value: input } });

    fireEvent.click(getByText('HTML'));
    expect(getByTestId('output').textContent).toBe(encodeHTML(input));

    fireEvent.click(getByText('JavaScript'));
    expect(getByTestId('output').textContent).toBe(encodeJS(input));

    fireEvent.click(getAllByText('URL')[1]);
    expect(getByTestId('output').textContent).toBe(encodeURL(input));

    fireEvent.click(getAllByText('SQL')[1]);
    expect(getByTestId('output').textContent).toBe(encodeSQL(input));
  });
});
