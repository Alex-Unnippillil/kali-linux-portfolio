export function buildAnalogyPrompt(text: string, simple: boolean): string {
  if (!simple) return text;
  const map: Record<string, string> = {
    'Use this lab to explore static security data.':
      'Picture a sandbox where you can play with pretend computer stories that never leave the box.',
  };
  return map[text] || `Explain ${text} in a gentle, everyday way.`;
}
