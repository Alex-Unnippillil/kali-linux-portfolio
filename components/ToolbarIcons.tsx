import { Icon } from './Icon';
import { WINDOW_GLYPH_NAMES } from './icons/windowGlyphs';

export function CloseIcon() {
  return <Icon name={WINDOW_GLYPH_NAMES.close} size={16} alt="Close" />;
}

export function MinimizeIcon() {
  return <Icon name={WINDOW_GLYPH_NAMES.minimize} size={16} alt="Minimize" />;
}

export function MaximizeIcon() {
  return <Icon name={WINDOW_GLYPH_NAMES.maximize} size={16} alt="Maximize" />;
}

export function RestoreIcon() {
  return <Icon name={WINDOW_GLYPH_NAMES.restore} size={16} alt="Restore" />;
}

export function PinIcon() {
  return <Icon name={WINDOW_GLYPH_NAMES.pin} size={16} alt="Pin" />;
}
