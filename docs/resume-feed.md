# Resume Feed Specification

The **About Alex** application renders resume details from a JSON feed so that
profile updates ship without redeploying the React bundle.

## Endpoint

- Static export: `/data/resume/alex.json`
- Local fallback: `components/apps/alex/resume.json`

Both files share the same schema. During runtime the widget fetches the public
URL and falls back to the bundled JSON if the request fails.

## Schema

```ts
export type ResumeFeed = {
  skills: Array<{
    name: string;
    category?: string;
  }>;
  projects: Array<{
    name: string;
    link: string;
    summary?: string;
    tags?: string[];
  }>;
  experience: Array<{
    date: string;
    description: string;
    tags?: string[];
  }>;
};
```

### Field notes

- **skills** render as visual chips grouped by `category`. Provide a readable
  label (e.g. "Networking & Security").
- **projects** supply the CTA link plus optional `summary` copy and `tags` that
  become mini chips under each project.
- **experience** entries fuel the timeline filter. Tags should stay short and
  lowercase to match the existing button styling.

## Example

```json
{
  "skills": [
    { "name": "Network Defense", "category": "Networking & Security" },
    { "name": "Docker", "category": "Tooling & Automation" }
  ],
  "projects": [
    {
      "name": "Text-Encryption-Decryption-AES-PKCS7",
      "link": "https://github.com/Alex-Unnippillil/Text-Encryption-Decryption-AES-PKCS7",
      "summary": "Python CLI that encrypts and decrypts text files with AES and PKCS7 padding.",
      "tags": ["Python", "Cryptography"]
    }
  ],
  "experience": [
    {
      "date": "2024",
      "description": "Cybersecurity Internship at Example Corp focusing on incident response playbooks.",
      "tags": ["work"]
    }
  ]
}
```

## Maintenance checklist

1. Update both JSON files when resume content changes so the fallback stays in
   sync with the public feed.
2. Extend the Jest tests in `__tests__/components/apps/aboutAlex.resume.test.tsx`
   if you add new fields that affect rendering or analytics.
3. Keep `docs/app-ecosystem-roadmap.md` and `docs/tasks.md` aligned with the
   widget status when you ship major resume updates.
