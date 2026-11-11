import { createRoot } from "react-dom/client";
import LetterheadDocument from "../../src/react/LetterheadDocument.jsx";
import LetterheadSettings, { useLetterheadSettings } from "../../src/react/LetterheadSettings.jsx";

const lines = Array.from({ length: 32 }, (_, i) => ({
  id: i + 1,
  text: `Service item ${i + 1}`,
  qty: 1 + (i % 3),
  price: 120 + i * 15,
}));

function InvoicePrint() {
  const [settings, update, reset, saveError] = useLetterheadSettings("react-example-letterhead", {
    image: "../assets/letterhead.png",
    top: 52,
    bottom: 58,
    side: 15,
  });

  const total = lines.reduce((sum, l) => sum + l.qty * l.price, 0);

  return (
    <>
      <LetterheadSettings settings={settings} onChange={update} onReset={reset} saveError={saveError} />

      <LetterheadDocument
        background={settings.image}
        top={settings.top + "mm"}
        bottom={settings.bottom + "mm"}
        side={settings.side + "mm"}
        guides={settings.guides}
      >
        <h1>Invoice #2048</h1>
        <p>
          Rendered with <code>&lt;LetterheadDocument&gt;</code>. Use the page settings button to
          change the background or the margins, then print (Ctrl+P).
        </p>
        <table className="items">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.text}</td>
                <td>{l.qty}</td>
                <td>{l.price.toFixed(2)}</td>
                <td>{(l.qty * l.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="total">Total: {total.toFixed(2)}</p>
      </LetterheadDocument>
    </>
  );
}

createRoot(document.getElementById("root")).render(<InvoicePrint />);
