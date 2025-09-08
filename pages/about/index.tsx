import Avatar from '../../components/ui/Avatar';

export default function AboutPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">About</h1>
      <div className="flex items-center space-x-4">
        <Avatar src="/images/logos/bitmoji.png" name="Alex" size={80} />
        <p>
          This project showcases the Kali Linux portfolio and the people working behind the scenes.
        </p>
      </div>
    </div>
  );
}
