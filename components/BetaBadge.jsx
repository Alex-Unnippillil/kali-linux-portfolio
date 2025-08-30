export default function BetaBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== 'true') return null;
  return <span>Beta</span>;
}
