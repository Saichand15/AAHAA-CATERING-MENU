import { parsePackageDetails } from "@/lib/package-details";

export function PackageDescription({ description }: { description: string }) {
  const details = parsePackageDetails(description);
  if (!details) return <p className="menu-description">{description}</p>;
  return <div className="package-description">
    <section><h4>What&apos;s included</h4><ul className="package-inclusions">{details.inclusions.map((item, index) => <li className={item.length > 32 ? "wide-inclusion" : undefined} key={index}>{item}</li>)}</ul></section>
    <section><h4>Approximate portions</h4><p className="portion-intro">Tray sizes are approximate. Confirm quantities with our team for your guests&apos; appetite.</p>
      <table className="package-portion-table" aria-label="Approximate package portions"><thead><tr><th scope="col">Menu item</th><th scope="col">Tray / quantity</th></tr></thead><tbody>{details.portions.map((portion, index) => <tr key={index}><th scope="row">{portion.label}</th><td>{portion.value}</td></tr>)}</tbody></table>
    </section>
    {details.bread.length > 0 && <section><h4>Bread quantity <span>Choose one</span></h4><ul className="package-bread">{details.bread.map((option, index) => <li key={index}>{option}</li>)}</ul></section>}
    {details.notes.length > 0 && <section className="package-notes"><h4>Before you choose</h4><ul>{details.notes.map((note, index) => <li key={index}>{note}</li>)}</ul></section>}
  </div>;
}
