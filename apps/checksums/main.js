/* eslint-env browser */
if (isBrowser) {
  const input = document.getElementById('input');
  const output = document.getElementById('output');
  const button = document.getElementById('compute');

  if (!window.crypto?.subtle) {
    output.value = 'Web Crypto API not supported.';
    button.disabled = true;
  } else {
    button.addEventListener('click', async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode(input.value);
      try {
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        output.value = hashHex;
      } catch (err) {
        output.value = 'Error computing hash';
      }
    });
  }
}
