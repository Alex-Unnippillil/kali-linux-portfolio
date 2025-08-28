import { useEffect, useState } from 'react';
import { getTheme, setTheme, getUnlockedThemes } from '../utils/theme';
const SettingsDrawer = ({ highScore = 0 }) => {
    const [open, setOpen] = useState(false);
    const [theme, setThemeState] = useState('default');
    const unlocked = getUnlockedThemes(highScore);
    useEffect(() => {
        setThemeState(getTheme());
    }, []);
    const changeTheme = (t) => {
        setThemeState(t);
        setTheme(t);
    };
    return (<div>
      <button aria-label="settings" onClick={() => setOpen(!open)}>
        Settings
      </button>
      {open && (<div role="dialog">
          <label>
            Theme
            <select aria-label="theme-select" value={theme} onChange={(e) => changeTheme(e.target.value)}>
              {unlocked.map((t) => (<option key={t} value={t}>
                  {t}
                </option>))}
            </select>
          </label>
        </div>)}
    </div>);
};
export default SettingsDrawer;
