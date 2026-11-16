type Portion = { label: string; value: string };
export type PackageDetails = { inclusions: string[]; portions: Portion[]; bread: string[]; notes: string[] };

function entries(value: string) {
  return value.replace(/\.$/, "").split(";").map(part => part.trim()).filter(Boolean);
}
function sentenceCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function parsePackageDetails(description: string): PackageDetails | null {
  const lines = description.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const portionsIndex = lines.findIndex(line => line.startsWith("Approximate portions:"));
  if (portionsIndex < 1) return null;
  const portions = entries(lines[portionsIndex].slice("Approximate portions:".length)).map(value => {
    const match = /^(appetizers|entrees|biryani|rice|sambar\/rasam|dessert|salna|raita)\s+(.+)$/.exec(value);
    return match ? { label: sentenceCase(match[1]), value: match[2] } : { label: "Portion details", value };
  });
  const bread: string[] = [];
  const notes: string[] = [];
  for (const line of lines.slice(portionsIndex + 1)) {
    if (line.startsWith("Bread:")) bread.push(...line.slice("Bread:".length).trim().replace(/\.$/, "").split(/\s*,?\s+OR\s+/i));
    else notes.push(line);
  }
  return {
    inclusions: lines.slice(0, portionsIndex).flatMap(entries).map(sentenceCase),
    portions, bread, notes,
  };
}
