// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { parsePackageDetails } from "../src/lib/package-details";
import { PackageDescription } from "../src/components/package-description";
import { buildCateringMenu } from "../scripts/catering-menu";
import pricing from "../supabase/catering-pricing.json";

afterEach(cleanup);
const packages = buildCateringMenu(pricing);

describe("readable catering package details", () => {
  it("preserves source inclusions, tray quantities, bread choices and notes for all 21 packages", () => {
    for (const [index, item] of packages.entries()) {
      const pack = pricing.packages[Math.floor(index / pricing.tiers.length)];
      const tier = pricing.tiers[index % pricing.tiers.length];
      const details = parsePackageDetails(item.description)!;
      expect(details.inclusions.join("; ").toLowerCase()).toBe(pack.inclusions.replace(/\.$/, "").toLowerCase());
      expect(details.portions).toHaveLength(8);
      expect(details.portions.map(portion => portion.value)).toEqual([
        tier.appetizer, tier.entree, tier.biryani, tier.rice, tier.curry, tier.dessert, tier.salna, tier.raita,
      ]);
      expect(details.bread).toEqual([`${tier.breadPieces} naan cut into 4`, `${tier.breadPieces} parotta/chapathi cut into 2`]);
      expect(details.notes).toContain("Paneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.");
      if (pack.id === "special") expect(details.notes).toContain("Special: third entree portion requires manager clarification.");
    }
  });
  it("renders clearly separated inclusions, accessible aligned portions and restrictions", () => {
    render(<PackageDescription description={packages[0].description} />);
    expect(screen.getByRole("heading", { name: "What's included" })).toBeTruthy();
    expect(screen.getByText("2 veg appetizers")).toBeTruthy();
    expect(screen.getByText("White rice or jeera rice")).toBeTruthy();
    const table = within(screen.getByRole("table", { name: "Approximate package portions" }));
    expect(table.getAllByRole("row")).toHaveLength(9);
    expect(table.getByRole("rowheader", { name: "Entrees" })).toBeTruthy();
    expect(table.getByRole("cell", { name: "Jumbo / 57 oz each (2 listed portions)" })).toBeTruthy();
    expect(screen.getByText("10 naan cut into 4")).toBeTruthy();
    expect(screen.getByText(/Paneer: one entree only/)).toBeTruthy();
  });
  it("preserves free-form or future details and safely renders text rather than HTML", () => {
    const text = "Custom catering details\n<script>not markup</script>";
    expect(parsePackageDetails(text)).toBeNull();
    const { container } = render(<PackageDescription description={text} />);
    expect(container.textContent).toBe(text);
    expect(container.querySelector("script")).toBeNull();
    const changed = packages[0].description + "\nAdditional manager information.";
    expect(parsePackageDetails(changed)?.notes).toContain("Additional manager information.");
  });
});
