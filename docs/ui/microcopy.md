# UI Microcopy Guidelines

These standards keep the desktop shell and in-app prompts consistent and clear. Apply them to every UI label, tooltip, toast, dialog, and empty state.

## Voice and Tone

- **Direct second-person voice.** Speak to the user with "you" and action verbs. Avoid passive constructions.
- **Confident and calm.** Keep sentences short, respectful, and free from urgency or hype.
- **Empathetic, not apologetic.** Explain what the user can do next instead of focusing on internal problems.

## Tense

- **Present tense for current state.** “Settings update immediately” instead of “will update.”
- **Simple future only when scheduling.** Use “Updates will restart the VM at 02:00” when a delayed action is unavoidable.

## Capitalization

- **Sentence case for UI labels and buttons.** Capitalize only the first word and proper nouns: “Open terminal,” “Enable SSH”.
- **Title case for modal titles and navigation sections.** Example: “Networking Tools”.
- **Keep acronyms uppercase.** e.g., “VPN,” “SSH”.

## Banned Phrases

| Phrase | Reason | Recommended swap |
| --- | --- | --- |
| `click here` | Lacks context and is inaccessible for screen readers. | Use a descriptive action: “Open logs”. |
| `just`, `simply` | Minimizes effort and can frustrate users. | Describe the action plainly: “Select a target network.” |
| `obviously`, `of course` | Sounds condescending. | State the fact without judgment. |
| `easy`, `quickly` (when used as promises) | Over-promises experience. | Describe the exact outcome or steps. |
| `sorry for the inconvenience` | Focuses on apology instead of solution. | Explain the impact and next step. |

These terms are linted in CI. If a situation truly requires one, document the exception in the PR.

## Examples

| Context | Do | Avoid |
| --- | --- | --- |
| Button label | “Save changes” | “Save Changes” (Title Case) |
| Empty state | “You have no scans yet. Start a new scan to capture hosts.” | “There are no scans right now. `Click here` to create one.” |
| Error toast | “SSH tunnel failed. Reconnect with a new key.” | “`Sorry for the inconvenience`. We couldn’t connect.” |
| Tooltip | “Requires sudo privileges.” | “You `obviously` need sudo access.” |

## Writing Checklist

1. Can the user understand the action without extra context?
2. Does the copy describe the outcome instead of the interface mechanics?
3. Are banned phrases absent?
4. Is the sentence written in present tense (unless scheduling future work)?
5. Do headings and labels follow the capitalization rules above?
