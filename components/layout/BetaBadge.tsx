const BetaBadge = () => {
  if (process.env.NEXT_PUBLIC_SHOW_BETA !== '1') {
    return null;
  }

  return (
    <button
      type="button"
      className="fixed bottom-space-4 right-space-4 rounded bg-yellow-500/90 px-space-2 py-space-1 text-xs font-semibold text-black"
    >
      Beta
    </button>
  );
};

export default BetaBadge;
