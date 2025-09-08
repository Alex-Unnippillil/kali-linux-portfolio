let addNote: (content: string) => void;

describe('Sticky Notes sanitization', () => {
  beforeEach(async () => {
    document.body.innerHTML = '<div id="notes"></div><button id="add-note"></button>';
    ({ addNote } = await import('../apps/sticky_notes/main'));
  });

  it('strips HTML from note content', () => {
    addNote('<img src=x onerror=alert(1)>');
    const notes = document.getElementById('notes')!;
    expect(notes.querySelector('img')).toBeNull();
    expect(notes.querySelector('textarea')!.value).toBe('');
  });
});
