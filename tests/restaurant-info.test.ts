import { describe, expect, it } from "vitest";
import { getRestaurantContact, restaurantInfo } from "../src/lib/restaurant-info";
import { settings } from "./fixtures";

describe("verified restaurant contact details", () => {
  it("keeps configured business details authoritative", () => {
    const contact = getRestaurantContact({ ...settings, hours: "Monday: Closed\nTuesday: 12 PM - 8 PM" });
    expect(contact.phone).toBe(settings.phone);
    expect(contact.email).toBe(settings.email);
    expect(contact.address).toBe(settings.address);
    expect(contact.hours).toEqual(["Monday: Closed", "Tuesday: 12 PM - 8 PM"]);
  });
  it("uses verified public information when configuration is absent or blank", () => {
    for (const settings of [null, { phone: " ", email: "", address: "", hours: " " }]) {
      const contact = getRestaurantContact(settings);
      expect(contact.phone).toBe(restaurantInfo.phone);
      expect(contact.email).toBe("info@aahaaindiankitchen.com");
      expect(contact.address).toContain("1034 Weiland Rd");
      expect(contact.hours).toHaveLength(7);
      expect(contact.hours[0]).toBe("Monday: Closed");
    }
  });
});
