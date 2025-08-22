export interface Game {
  slug: string;
  name: string;
  image: string;
}

export const games: Game[] = [
  {
    slug: 'password_generator',
    name: 'Password Generator',
    image: '/images/logos/logo_1024.png',
  },
];

export function getGame(slug: string): Game | undefined {
  return games.find((g) => g.slug === slug);
}
