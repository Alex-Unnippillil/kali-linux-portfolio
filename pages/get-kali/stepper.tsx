import DownloadStepper from '../../components/get-kali/DownloadStepper';

export default function GetKaliStepperPage() {
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Build a Kali Image</h1>
      <DownloadStepper />
    </main>
  );
}

