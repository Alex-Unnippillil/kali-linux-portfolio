import React from 'react';
import { render } from '@testing-library/react';
import IssueList from '../apps/metasploit-post/components/IssueList';
import issues from '../apps/metasploit-post/issues.json';

describe('IssueList', () => {
  it('renders issues with ids and severity tags', () => {
    const { container } = render(<IssueList />);
    (issues as any[]).forEach((issue) => {
      const el = container.querySelector(`#issue-${issue.id}`);
      expect(el).toBeTruthy();
      expect(el?.textContent).toContain(issue.severity);
    });
  });
});

