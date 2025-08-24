import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KeyConverter from '@components/apps/key-converter';

jest.mock('jose', () => ({
  importJWK: jest.fn(() => Promise.resolve({})),
  importPKCS8: jest.fn(() => Promise.resolve({})),
  importSPKI: jest.fn(() => Promise.reject(new Error('fail'))),
  importX509: jest.fn(() => Promise.reject(new Error('fail'))),
  exportJWK: jest.fn(() => Promise.resolve({ kty: 'RSA', n: 'AA', d: 'secret' })),
  exportPKCS8: jest.fn(() => Promise.resolve('PKCS8')),
  exportSPKI: jest.fn(() => Promise.resolve('SPKI')),
  calculateJwkThumbprint: jest.fn(() => Promise.resolve('thumb')),
}));

const RSA_PEM = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDIZjD4nhI6yfxW
wElQ0I3Ws4ijx+dLhB6dUhOR6YlvPwjJg7IREgqIIsDzhnvJY5osOobBbR0AjAsh
xnTSG6sWfPhXInR6KX/XV4RhVN2sAfPA5x6vu2yiRx7UBdNwlK7jr6yWYdHLm86n
1GGEOQBSllbe5urHNUPPhkpc7SqY419dqlFG8flhR2ZeI+756a43xJDuDp1GT0mo
WxeplblSHcj9F2WdVF68yOcJRsg2JwA5jbfQXGlX/vbNH89QtUy9ZHQNg9NAfkG0
0QuUqbK6rkd0V2r7PVx42fBW1mk2HsuF8Y5NnxBupY+tn7PawDEJTAEUXvzKHqNO
qaFuShZlAgMBAAECggEAL2oOWCR+R66Wp6fjMN3HUW80+xtHHFTsMWjD/Jf2zn1p
hNRGA0fzefZPFM9S5nlMdv5597XrUL/RunIMHdIyDqYO0/7w9B5xgu/QAH9l21ay
54dHeWis8VBGeP/P4Sksn+5mtUX7r2Lz6D2VvQUHkILFlwOntO5jVux9F7N9iqKG
K7t/4USOPqrD+0Q1GnSbfHPqDQNOIZ7GEZ9JtzMRXn3nZJauwlnz4ycpvD1MqHJu
PGhDjrL8cHbcF4woivlyLmG661DStuL3fgKJ5wADquQfAiQeQg7+eJ5c4UqIdG+3
jb/akW+ZiqXVbg990vtFLitmn416E0o7mcvNKYECWQKBgQDonmIpi/d3kl3VO8zp
oKF1UDqn2E1Da8Ugqiku7scsbjFtDCFjOi20Z52V14B/BSHWFKvZzHBCjw4nncL4
gnICc0nh1vDHcQymiPhca+likv3tH+H5OVwX7B1pPXnPjq/8goWHnoowGWqyh0+F
k+EHz6et+72bZaDg2xfbZUHl2wKBgQDcisDZCEUbKd1F4dmKcHdw68ZtR5eg5XRF
+j5E8e+5vPB0mUKPKlARXkPm6iNi0ZvjI2vSvWJGwcEFXP3OuvJXIwsQQ6eEiMmQ
UyObWujAPb/XNIsZOq1zk2z1hZv4Afgregmn5Y+X8z0Kt+GAWv7baFJj4yuStgLh
IEVqro5IvwKBgALdSGoojhCL3dntVZWe474VEdPVRwZIgnHnhoBMcmlqpfMozhRx
t/RbvkYFFFD8GDGRqZgR+2PmbQ8x0x/KQ2siTkuYoPhjvPsj/qLstUAAfV35IYg3
G5ozzxzno+NZZ3NdjBVib2MuPPEb12/WpVO6S99JlUkflD6QlBeghJI3AoGAdkSu
gHTP4m5D7Drel0ASvWqjAW14Id+KyBAXno+DuD5bUJvztqTBRV8g2M9M5Kx1hYw0
QVIwRrOW2FJzBY75cMMpJrKxPgDA3vXGzYQl9xnmK/lQctoltComL1BUQN6FgIM0
dGZF5/2YCYxskJG7xFuge1KSxl13E9VjhH9RbC8CgYEAi/CenddCiucRJQJ14cqY
j1yq+4sBv2gEbLj7VSf/OpD2qGLES6m61mUIKAiiZqQkS2JKOBRvc45czywbwKaQ
Oc5dNNzQfotRTI+I0rA2eSfofyTIC89QaznhZC75uKcWpzAGlXKfaLAbZl07fvpF
4dW+gqv+Kpd+TIXqul1ZNJw=
-----END PRIVATE KEY-----`;

const RSA_ENC = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIFLTBXBgkqhkiG9w0BBQ0wSjApBgkqhkiG9w0BBQwwHAQI7TsaYGo9UFACAggA
MAwGCCqGSIb3DQIJBQAwHQYJYIZIAWUDBAEqBBB2JbMk39amM6kD8TFeuuTOBIIE
0DgoINRHY2JEbjpxJcx+DQpug9YcZftjySljtn2ZvL5skU+LxpNxv6gUkpNxfSl7
uke9c5OsAUV0nakr3XFEukjAkN7037GO3EF0yIuUy3K5WGStLx1LUwlj0eV8qURJ
V0zUF97QB0DlBteIlEytjh/kUDzp5AtVuZl4FzJiHYD4GACSQgfP9SNwjuU2jmxX
FqHGXO3RXWlNo3Htx1oY7kYANg0PmRjvQ+gYqBNuxWE4gc1ZpcT/TWpGji2Lcu17
ag5ArLpnG3W+g/wgdNmu0IveRdT8qGuhtB5v6KyY01HcY3cBA0kix/8U49ttHRcq
VDk4NFgWQnsUShg/yYZ91TsVhIi/sTDxL/jthKzVAKyd6FghQKbW977tl/gcBwHZ
SUpGUV+hFLW+EkH/4WmWiaIQJgFU4FvkybdNB9Bqhx2U0kyylU59eh/UbKYf4tVJ
+5glGxmSP9OZnN/SbZixtnARV19o4axtA4wO7bpARWd20SnDimYAYxhzG1nJVOWq
uDTNqlyN+k1FxDgKMmbhhXes/QU7/v395tAp/L5u1z30hjV1WtHq7kQflZc+NOvD
iHVzECD2F1ObWFgfEMg8+dMSGGbnwYj2S/fKFzydA9wQbZHM4emY16Ztj6RqH1B7
AjCrCtyubhNZa43pbtUCC8RHS8PBfr5zPvOtoI8fyWU+4Wnf4fj7tUraQmbVKWUz
kXmxHfWeQo9M1oEGxL3lCdLRBlW27+y7hD6d/ZD9s5ukETL/QsYyj73Vf2z5MUnu
e9ahphTTCVdfWIlr+qHJ17rHKUI2EUEUjkfzFbqx4XnCT8d9li2ldWB78Qj7x9j2
y+sO0Snl6ibRh73i8XCCLrTdUkME/YaP4XeWHjnsBfWA0+FK6IqQn3pLZ9RwH1A6
VuuDQEylM3vwlyRNDKTFtZr2oL8UA2Hb/Mjikl5zJKcBcIfN/SXP7H4gkczp38qO
0IKa6ZfXuy0jF9ztCQv2yiTioj4RMAyPIpp2B8FdBgNTJb+zpvqtigO559XDU/6t
3cyAPPV7PJGWXIFaC4unTvBdHLFbXgkYsYiQHd5dbv3N6nUmPqykskx4Y+9HOdSt
vyKeZU3twsDw2do3CgRX/D0uJE+s15jGJgcI6renlxm5ZblJ3rOBJ4x6qTO4p6BK
/+5pL71Gn2mM/IIej77XCDHIgucJi0PPLzVdH6r9c9IAmLkJZ5W1+/j9RHgfRTsz
wg3+EfW6Bh3RoPtrX38gzyY0K4EDX3uBOMAAvjP6e8BtopcPQn5H69xpnqFzGDRi
hlpLGO5q83X0ce0dCBJQvbyKSrIrQ5aswHP5TxfIUEORa/1kmxYdz8OQShriBbHj
F7fLxaCdCajqHhBVZBbINqbppQcdQoOIR0GP1Oh/Lqu3eGIcdWvp5vDUeSrEyas5
vFnKUy60BhsRwpfoEen6AGhApBpoApvmutWhQoUFT/ZGLFfDjO8v7H3Jzy4zFzdU
QKS1Py6IPPWeScDreCTBO0Z0FudfoHMnAFUWWg/11bali+ChkbbOPNg0GHwnecek
Xtl+iPdsdaztPsQReEDAWlfVkDpEtwcLzNmVxeAi1tvDZwGVhzIv05HdgumQCEGs
fnnNk6ujlZBnd7ZgewDGJviDFmlYrd1FAggU3Wmv2wCm
-----END ENCRYPTED PRIVATE KEY-----`;

const ED_JWK_INVALID_USE = {
  kty: 'OKP',
  crv: 'Ed25519',
  d: 'ZnBo7KunDMOurKfjLESIZ5BUMbWnH6Aal49eG90N6Lg',
  x: 'fFPn393wh5gXG5OvEMh5KTldzRx9DwTdlvUOtwCcAGE',
  use: 'foo',
};

describe('KeyConverter', () => {
  it('converts RSA PEM to JWK and redacts private material', async () => {
    render(<KeyConverter />);
    fireEvent.change(screen.getByPlaceholderText('Key material'), {
      target: { value: RSA_PEM },
    });
    fireEvent.click(screen.getByText('Convert'));
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Result')).toHaveTextContent(
        '"kty": "RSA"'
      )
    );
    expect(screen.getByPlaceholderText('Result')).toHaveTextContent(
      '"d": "[redacted]"'
    );
  });

  it('accepts passphrase for encrypted keys', async () => {
    render(<KeyConverter />);
    fireEvent.change(screen.getByPlaceholderText('Key material'), {
      target: { value: RSA_ENC },
    });
    fireEvent.change(screen.getByPlaceholderText('Passphrase'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByText('Convert'));
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Result')).toHaveTextContent(
        '"kty": "RSA"'
      )
    );
  });

  it('validates key use', async () => {
    render(<KeyConverter />);
    const select = screen.getByDisplayValue('PEM');
    fireEvent.change(select, { target: { value: 'jwk' } });
    fireEvent.change(screen.getByPlaceholderText('Key material'), {
      target: { value: JSON.stringify(ED_JWK_INVALID_USE) },
    });
    fireEvent.click(screen.getByText('Convert'));
    await waitFor(() =>
      expect(screen.getByText(/Invalid key use/)).toBeInTheDocument()
    );
  });
});

