# Terminal app

The Kali-themed terminal is a simulated shell that mirrors common shortcuts while keeping
its output safe for sharing.

## Copying without ANSI color codes

- Use the toolbar **Copy** button (or press `Ctrl` + `Shift` + `C`) to export the session
  history. The clipboard payload is scrubbed with an ANSI parser so the escape sequences
  used for colors are removed automatically.
- After copying, paste into any editor, ticket, or chat with your normal paste shortcut
  (`Ctrl` + `V` / `Cmd` + `V`). Only the plain text prompt and command output are included.

## Pasting plain text back into the terminal

- When you want to paste text into the web terminal itself, use the **Paste** button or
  press `Ctrl` + `Shift` + `V`. Even if the source text contained ANSI colour codes, the
  transcript that the copy action produces stores only printable characters, so anything
  you paste later remains plain text.
- If you need to clear the copied history, run `clear` or use the settings modal to reset
  the palette and start a fresh session.
