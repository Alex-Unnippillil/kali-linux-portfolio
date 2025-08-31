export default function DownloadPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print fixed top-4 right-4 bg-ubt-blue text-white px-3 py-1 rounded"
    >
      Download as PDF
    </button>
  );
}
