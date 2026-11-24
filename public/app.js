const h = React.createElement;
const rows = ["A", "B", "C", "D"];
const occupied = ["A3", "A4", "B6", "D7", "D8"];
const ticketTypes = { standard: { description: "Standard admission" } };

function ticketDescription(seat) {
  const type = seat === "C4" ? "companion" : "standard";
  return ticketTypes[type].description;
}

async function requestBooking(seats, total) {
  const params = new URLSearchParams({ total: String(total) });
  for (const seat of seats) params.append("seat", seat);
  const response = await fetch("/api/quote?" + params, { method: "POST" });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "The box office could not confirm these seats.");
}

function App() {
  const [selected, setSelected] = React.useState([]);
  const [reserved, setReserved] = React.useState([]);
  const [result, setResult] = React.useState(null);
  const [pending, setPending] = React.useState(false);
  const fee = selected.length > 0 ? 2 : 0;
  const total = selected.length * 12 + fee;

  function toggle(seat) {
    setResult(null);
    setSelected(current => current.includes(seat) ? current.filter(s => s !== seat) : [...current, seat].sort());
  }

  async function book() {
    setPending(true);
    setResult(null);
    try {
      const tickets = selected.map(seat => seat + " · " + ticketDescription(seat));
      await requestBooking(selected, total);
      setReserved([...reserved, ...selected]);
      setResult({ ok: true, text: "Reserved for this visit: " + tickets.join(", ") + "." });
      setSelected([]);
    } catch (error) {
      const text = error instanceof TypeError && selected.includes("C4")
        ? "The ticket type for C4 could not be loaded. Choose another seat." : error.message;
      setResult({ ok: false, text, details: error.stack || String(error) });
      await fetch("/events", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: error.message, stack: error.stack || String(error) }),
      }).catch(() => {});
    } finally {
      setPending(false);
    }
  }

  return h(React.Fragment, null,
    h("header", null, h("strong", null, "The Lantern"), h("span", null, "Box office")),
    h("section", { className: "show" },
      h("p", { className: "eyebrow" }, "Evening screening"),
      h("h1", null, "Midnight Express"),
      h("p", null, "Screen 01　 /　 19:30　 /　 Standard admission $12")),
    h("div", { className: "layout" },
      h("section", { className: "map", "aria-label": "Seat map" },
        h("h2", null, "Choose your seats"),
        h("div", { className: "screen" }, "SCREEN"),
        h("div", { className: "grid" }, rows.map(row => h("div", { className: "row", key: row },
          h("span", { className: "row-name" }, row),
          Array.from({ length: 8 }, (_, i) => {
            const seat = row + (i + 1);
            const taken = occupied.includes(seat) || reserved.includes(seat);
            return h("button", { key: seat, className: "seat", disabled: pending || taken,
              "data-taken": taken, "aria-label": "Seat " + seat, "aria-pressed": selected.includes(seat),
              onClick: () => toggle(seat) }, i + 1);
          })))),
        h("div", { className: "legend" }, ["Available", "Selected", "Taken"].map(
          label => h("span", { key: label, className: label.toLowerCase() }, label)))),
      h("section", { className: "order", "aria-label": "Booking summary" },
        h("h2", null, "Your booking"),
        h("p", { className: "selection" }, selected.length ? selected.join(", ") : "No seats selected"),
        h("div", { className: "amount" }, h("span", null, "Tickets × " + selected.length), h("b", null, "$" + selected.length * 12)),
        h("div", { className: "amount" }, h("span", null, "Booking fee ($2 per order)"), h("b", null, "$" + fee)),
        h("div", { className: "total" }, h("span", null, "Total"), h("strong", null, "$" + total)),
        h("button", { className: "book", onClick: book, disabled: !selected.length || pending }, pending ? "Reserving…" : "Reserve seats"),
        result && h("div", { className: result.ok ? "success" : "error", role: result.ok ? "status" : "alert" },
          h("strong", null, result.ok ? "Booking confirmed" : "Booking failed"), h("p", null, result.text),
          !result.ok && h("details", null, h("summary", null, "Stack trace"), h("pre", null, result.details))))));
}
ReactDOM.createRoot(document.getElementById("root")).render(h(App));
