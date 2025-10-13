export interface Slide {
  title: string;
  body: string;
  notes: string;
}

export const slides: Slide[] = [
  {
    title: 'Welcome',
    body: 'Welcome to the About section! This brief talk will highlight key features.',
    notes: 'Greet the audience and introduce the focus of the presentation.',
  },
  {
    title: 'Portfolio',
    body: 'This app showcases various cybersecurity tools and projects.',
    notes: 'Describe the different applications and their purposes.',
  },
  {
    title: 'Thanks',
    body: 'Thanks for taking the tour!',
    notes: 'Wrap up the talk and encourage further exploration.',
  },
];

export default slides;
