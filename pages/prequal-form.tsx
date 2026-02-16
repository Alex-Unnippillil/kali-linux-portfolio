import React, { useState } from 'react';

const PreQualForm: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [timeline, setTimeline] = useState('');
  const [budget, setBudget] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: string[] = [];
    if (!goal) {
      next.push('Clarify the primary goal for your engagement.');
    }
    if (timeline !== 'now') {
      next.push('Review project planning resources to refine your timeline.');
    }
    if (budget !== 'yes') {
      next.push('Explore budgeting guides to align expectations.');
    }
    setSuggestions(next);
    setSubmitted(true);
  };

  const strongFit = submitted && suggestions.length === 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded bg-white p-6 shadow-md">
        <h1 className="text-xl font-bold">Pre-Qualification</h1>
        <div>
          <label htmlFor="goal" className="mb-1 block text-sm font-medium">
            Project Goal
          </label>
          <select
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="">Select...</option>
            <option value="pentest">Penetration Testing</option>
            <option value="consulting">Security Consulting</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="timeline" className="mb-1 block text-sm font-medium">
            Timeline to Start
          </label>
          <select
            id="timeline"
            value={timeline}
            onChange={(e) => setTimeline(e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="">Select...</option>
            <option value="now">Within 1 month</option>
            <option value="later">1-3 months</option>
            <option value="much-later">More than 3 months</option>
          </select>
        </div>
        <div>
          <label htmlFor="budget" className="mb-1 block text-sm font-medium">
            Approved Budget
          </label>
          <select
            id="budget"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full rounded border p-2"
          >
            <option value="">Select...</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <button type="submit" className="w-full rounded bg-blue-600 p-2 text-white">
          Submit
        </button>
      </form>
      {submitted && (
        <div className="ml-6 max-w-md text-sm">
          {strongFit ? (
            <div>
              <p className="mb-2 font-semibold text-green-700">
                Looks like we&apos;re a strong fit!
              </p>
              <p className="mb-2">
                Book a tentative slot so our meeting can focus on substance.
              </p>
              <a
                href="https://calendly.com/example/intro"
                className="text-blue-600 underline"
              >
                Schedule a Call
              </a>
            </div>
          ) : (
            <div>
              <p className="mb-2 font-semibold text-yellow-700">
                Before booking, you may find these resources helpful:
              </p>
              <ul className="list-disc pl-5">
                {suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              <p className="mt-2">
                These steps ensure outreach quality improves and meetings focus on
                substance.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PreQualForm;
