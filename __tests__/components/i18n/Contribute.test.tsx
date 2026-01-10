import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Contribute, type TranslationSource } from '@/components/i18n/Contribute';

describe('Contribute translation workbench', () => {
  const sources: TranslationSource[] = [
    {
      key: 'desktop.title',
      base: 'Welcome back to the Kali desktop',
      context: {
        section: 'Desktop',
        description: 'Top level heading that appears in the hero window.',
        notes: 'Keep it short and welcoming.',
      },
    },
    {
      key: 'desktop.subtitle',
      base: 'Launch any app from the dock or favorites list.',
      context: {
        section: 'Desktop',
      },
    },
  ];

  const initialTranslations = {
    'desktop.title': 'Bienvenido de nuevo al escritorio de Kali',
    'desktop.subtitle': 'Inicia cualquier aplicación desde el dock o favoritos.',
  };

  it('exports a diff with only the modified translation and context metadata', async () => {
    const user = userEvent.setup();
    render(
      <Contribute
        namespace="desktop"
        language="es"
        reviewer="Translation Guild"
        sources={sources}
        initialTranslations={initialTranslations}
      />
    );

    const titleInput = screen.getByTestId(
      'translation-input-desktop.title'
    ) as HTMLTextAreaElement;

    await user.clear(titleInput);
    await user.type(titleInput, 'Bienvenidos al escritorio de Kali');

    await user.click(screen.getByRole('button', { name: /generate export/i }));

    const exportOutput = (await screen.findByTestId(
      'translation-export-output'
    )) as HTMLTextAreaElement;

    const payload = JSON.parse(exportOutput.value);

    expect(payload.namespace).toBe('desktop');
    expect(payload.language).toBe('es');
    expect(Date.parse(payload.generatedAt)).not.toBeNaN();
    expect(Object.keys(payload.changes)).toEqual(['desktop.title']);
    expect(payload.changes['desktop.title']).toMatchObject({
      base: 'Welcome back to the Kali desktop',
      value: 'Bienvenidos al escritorio de Kali',
      context: expect.objectContaining({ section: 'Desktop' }),
    });

    const diffPreview = screen.getByTestId('translation-diff-desktop.title');
    expect(diffPreview.textContent).toContain('Bienvenidos al escritorio de Kali');

    await waitFor(() => {
      expect(screen.queryByTestId('translation-export-error')).toBeNull();
    });
  });

  it('surfaces validation errors when the schema rejects the export', async () => {
    const user = userEvent.setup();
    render(
      <Contribute
        namespace="desktop"
        language="e"
        sources={sources}
        initialTranslations={initialTranslations}
      />
    );

    const titleInput = screen.getByTestId(
      'translation-input-desktop.title'
    ) as HTMLTextAreaElement;

    await user.type(titleInput, '!');
    await user.click(screen.getByRole('button', { name: /generate export/i }));

    const error = await screen.findByTestId('translation-export-error');
    expect(error).toHaveTextContent(/language/i);
    expect(screen.queryByTestId('translation-export-output')).toBeNull();
  });
});
