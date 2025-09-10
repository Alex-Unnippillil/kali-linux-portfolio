import Avatar from '../../components/ui/Avatar';

const team = [
  { name: 'Alex', src: '/images/logos/bitmoji.png' },
  { name: 'Taylor' },
  { name: 'Jordan' },
];

export default function TeamPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Team</h1>
      <ul className="space-y-4">
        {team.map((member) => (
          <li key={member.name} className="flex items-center space-x-4">
            <Avatar src={member.src ?? ''} name={member.name} size={64} />
            <span className="font-medium">{member.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
