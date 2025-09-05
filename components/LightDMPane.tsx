import ExplainerPane from './ExplainerPane';

export default function LightDMPane() {
  return (
    <ExplainerPane
      lines={[
        'Select LightDM when prompted to choose a display manager.',
        'LightDM offers a lightweight login screen and integrates well with Xfce.'
      ]}
      resources={[
        { label: 'Xfce FAQ', url: 'https://docs.xfce.org/faq' }
      ]}
    />
  );
}

