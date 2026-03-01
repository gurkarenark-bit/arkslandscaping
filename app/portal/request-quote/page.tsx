export default function QuoteRequestPage() {
  return (
    <div className="card">
      <h3>Request New Quote</h3>
      <form>
        <label htmlFor="address">Address</label>
        <input id="address" name="address" required />
        <label htmlFor="service">Service requested</label>
        <input id="service" name="service" required />
        <label htmlFor="dates">Preferred dates</label>
        <input id="dates" name="dates" />
        <label htmlFor="availability">Availability for in-person quote</label>
        <textarea id="availability" name="availability" />
        <label htmlFor="photos">Photo URLs (for MVP)</label>
        <textarea id="photos" name="photos" />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}
