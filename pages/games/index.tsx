import Link from 'next/link';
import Image from 'next/image';
import { games } from '../../lib/games';

export default function GamesIndex() {
  return (
    <div className="p-4 grid grid-cols-1 gap-4">
      {games.map((game) => (
        <Link key={game.slug} href={`/games/${game.slug}`} className="flex items-center space-x-2">
          <Image src={game.image} alt={game.name} width={64} height={64} />
          <span>{game.name}</span>
        </Link>
      ))}
    </div>
  );
}
