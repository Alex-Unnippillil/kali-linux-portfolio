'use client';

import { useWhiskerPrefs } from './WhiskerSettings';

const WhiskerMenu = () => {
  const [prefs] = useWhiskerPrefs();

  return (
    <div>
      {prefs.showFavorites && <div>Favorites Section</div>}
      {prefs.showRecent && <div>Recent Section</div>}
    </div>
  );
};

export default WhiskerMenu;
