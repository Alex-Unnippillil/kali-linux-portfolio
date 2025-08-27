import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { Presets } from './utils';

const drawQRCode = (canvas, text, opts = {}) => {
  const { errorCorrectionLevel = 'M', margin = 4, width = 256, rounded = false, logo } = opts;
  const qr = QRCode.create(text, { errorCorrectionLevel });
  const size = qr.modules.size;
  const scale = width / (size + margin * 2);
  canvas.width = canvas.height = width;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, width);
  ctx.fillStyle = '#000';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules.get(c, r)) {
        const x = (c + margin) * scale;
        const y = (r + margin) * scale;
        if (rounded) {
          const rad = scale / 2;
          ctx.beginPath();
          ctx.arc(x + rad, y + rad, rad, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, scale, scale);
        }
      }
    }
  }
  return new Promise((resolve) => {
    if (logo) {
      const img = new Image();
      img.onload = () => {
        const logoSize = width * 0.2;
        ctx.drawImage(img, (width - logoSize) / 2, (width - logoSize) / 2, logoSize, logoSize);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = logo;
    } else {
      resolve(canvas.toDataURL('image/png'));
    }
  });
};

const QRTool = () => {
  const [tab, setTab] = useState('generate');
  const [preset, setPreset] = useState('text');
  const [form, setForm] = useState({
    text: '',
    ssid: '',
    password: '',
    security: 'WPA',
    url: '',
    name: '',
    org: '',
    title: '',
    phone: '',
    email: '',
    smsNumber: '',
    smsMessage: '',
    emailAddress: '',
    emailSubject: '',
    emailBody: '',
  });
  const [options, setOptions] = useState({ errorCorrectionLevel: 'M', margin: 4, rounded: false, logo: null });
  const [dataUrl, setDataUrl] = useState('');
  const [decodedText, setDecodedText] = useState('');
  const [message, setMessage] = useState('');
  const [scanning, setScanning] = useState(false);
  const generateCanvasRef = useRef(null);
  const scanCanvasRef = useRef(null);
  const videoRef = useRef(null);
  const animationRef = useRef(null);

  const buildContent = () => {
    switch (preset) {
      case 'wifi':
        return Presets.wifi({ ssid: form.ssid, password: form.password, security: form.security });
      case 'url':
        return Presets.url(form.url);
      case 'vcard':
        return Presets.vcard({ name: form.name, org: form.org, title: form.title, phone: form.phone, email: form.email });
      case 'sms':
        return Presets.sms({ number: form.smsNumber, message: form.smsMessage });
      case 'email':
        return Presets.email({ address: form.emailAddress, subject: form.emailSubject, body: form.emailBody });
      default:
        return form.text;
    }
  };

  const generate = async () => {
    const text = buildContent();
    if (!text) return;
    const url = await drawQRCode(generateCanvasRef.current, text, options);
    setDataUrl(url);
  };

  const download = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = 'qr.png';
    link.href = dataUrl;
    link.click();
  };

  const handleLogo = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setOptions((o) => ({ ...o, logo: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      const canvas = document.createElement('canvas');
      const url = await drawQRCode(canvas, line, options);
      const a = document.createElement('a');
      a.download = `${line}.png`;
      a.href = url;
      a.click();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = scanCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      setDecodedText(code ? code.data : 'No QR code found');
    };
    img.onerror = () => setDecodedText('Could not load image');
    img.src = URL.createObjectURL(file);
  };

  const scan = () => {
    if (!scanning) return;
    if (videoRef.current && scanCanvasRef.current) {
      const canvas = scanCanvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        setDecodedText(code.data);
      }
    }
    animationRef.current = requestAnimationFrame(scan);
  };

  const startCamera = async () => {
    if (
      window.location.protocol !== 'https:' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      setMessage('Camera requires HTTPS or localhost');
      return;
    }
    try {
      setMessage('Requesting camera permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setMessage('Place the QR code within the square');
      setScanning(true);
      scan();
    } catch (err) {
      setMessage('Camera permission denied or unavailable');
    }
  };

  const pauseCamera = () => {
    setScanning(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setMessage('Paused');
  };

  const resumeCamera = () => {
    if (!videoRef.current) return;
    setScanning(true);
    setMessage('Place the QR code within the square');
    scan();
  };

  const stopCamera = () => {
    pauseCamera();
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setMessage('');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const presetFields = () => {
    switch (preset) {
      case 'wifi':
        return (
          <div className="space-y-2">
            <input className="w-full p-2 rounded text-black" placeholder="SSID" value={form.ssid} onChange={(e) => setForm({ ...form, ssid: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Security" value={form.security} onChange={(e) => setForm({ ...form, security: e.target.value })} />
          </div>
        );
      case 'url':
        return <input className="w-full p-2 rounded text-black" placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />;
      case 'vcard':
        return (
          <div className="space-y-2">
            <input className="w-full p-2 rounded text-black" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Org" value={form.org} onChange={(e) => setForm({ ...form, org: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
        );
      case 'sms':
        return (
          <div className="space-y-2">
            <input className="w-full p-2 rounded text-black" placeholder="Number" value={form.smsNumber} onChange={(e) => setForm({ ...form, smsNumber: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Message" value={form.smsMessage} onChange={(e) => setForm({ ...form, smsMessage: e.target.value })} />
          </div>
        );
      case 'email':
        return (
          <div className="space-y-2">
            <input className="w-full p-2 rounded text-black" placeholder="Email" value={form.emailAddress} onChange={(e) => setForm({ ...form, emailAddress: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Subject" value={form.emailSubject} onChange={(e) => setForm({ ...form, emailSubject: e.target.value })} />
            <input className="w-full p-2 rounded text-black" placeholder="Body" value={form.emailBody} onChange={(e) => setForm({ ...form, emailBody: e.target.value })} />
          </div>
        );
      default:
        return <input className="w-full p-2 rounded text-black" placeholder="Text" value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />;
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white overflow-auto">
      <div className="mb-4 flex space-x-2">
        <button className={`px-4 py-2 rounded ${tab === 'generate' ? 'bg-blue-700' : 'bg-gray-700'}`} onClick={() => setTab('generate')}>Generate</button>
        <button className={`px-4 py-2 rounded ${tab === 'scan' ? 'bg-blue-700' : 'bg-gray-700'}`} onClick={() => setTab('scan')}>Scan</button>
      </div>
      {tab === 'generate' && (
        <div>
          <div className="mb-2">
            <select className="w-full p-2 rounded text-black" value={preset} onChange={(e) => setPreset(e.target.value)}>
              <option value="text">Text</option>
              <option value="wifi">Wi-Fi</option>
              <option value="url">URL</option>
              <option value="vcard">vCard</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          {presetFields()}
          <div className="flex space-x-2 my-2">
            <select className="p-2 rounded text-black" value={options.errorCorrectionLevel} onChange={(e) => setOptions((o) => ({ ...o, errorCorrectionLevel: e.target.value }))}>
              <option value="L">L</option>
              <option value="M">M</option>
              <option value="Q">Q</option>
              <option value="H">H</option>
            </select>
            <input type="number" className="p-2 rounded text-black w-20" value={options.margin} onChange={(e) => setOptions((o) => ({ ...o, margin: parseInt(e.target.value, 10) }))} />
            <label className="flex items-center space-x-1"><input type="checkbox" checked={options.rounded} onChange={(e) => setOptions((o) => ({ ...o, rounded: e.target.checked }))} /><span>Rounded</span></label>
          </div>
          <div className="flex space-x-2 my-2">
            <input type="file" accept="image/*" onChange={handleLogo} aria-label="Logo" />
            <input type="file" accept="text/csv" onChange={handleCSV} aria-label="CSV batch" />
          </div>
          <div className="flex space-x-2 mb-2">
            <button onClick={generate} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded">Generate</button>
            <button onClick={download} className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded">Download</button>
          </div>
          <canvas ref={generateCanvasRef} className="bg-white w-full h-full" />
        </div>
      )}
      {tab === 'scan' && (
        <div>
          <input type="file" accept="image/*" onChange={handleFile} className="mb-2" aria-label="Upload image to scan" />
          <div className="flex space-x-2 mb-2">
            <button onClick={startCamera} className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded">Start</button>
            <button onClick={pauseCamera} className="px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded">Pause</button>
            <button onClick={resumeCamera} className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded">Resume</button>
            <button onClick={stopCamera} className="px-4 py-2 bg-red-700 hover:bg-red-600 rounded">Stop</button>
          </div>
          <div className="relative w-64 h-64 bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-green-500" />
            </div>
          </div>
          {message && <p className="mt-2">{message}</p>}
          {decodedText && <p className="mt-2 break-all">Decoded: {decodedText}</p>}
          <canvas ref={scanCanvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default QRTool;

export const displayQrTool = () => {
  return <QRTool />;
};
