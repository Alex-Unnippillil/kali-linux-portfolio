'use client';
import FullPageCapture from './components/FullPageCapture';

export default function ChromeFullPageCapture() {
  return (
    <div
      className="w-full h-full md:w-[1024px] md:h-[768px] bg-[var(--kali-bg)] text-[var(--kali-fg)] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif]"
    >
      <FullPageCapture />
    </div>
  );
}
