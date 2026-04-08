"use client";

export default function PrintButton() {
  return (
    <button
      className="print-btn"
      onClick={() => window.print()}
    >
      Drukuj / Zapisz PDF
    </button>
  );
}
