import type { BusinessSettings } from "./types";

// Public restaurant details verified against the official catering page on 2026-11-16.
export const restaurantInfo = {
  website: "https://aahaaindiankitchen.com",
  phone: "+1 872-872-2422",
  secondaryPhone: "+1 847-777-8122",
  email: "info@aahaaindiankitchen.com",
  address: "1034 Weiland Rd, Buffalo Grove, IL 60089",
  instagram: "https://www.instagram.com/aahaaindiankitchen/",
  facebook: "https://www.facebook.com/profile.php?id=61593766438421",
  hours: [
    "Monday: Closed",
    "Tuesday: 11 AM - 2:30 PM, 5 PM - 10 PM",
    "Wednesday: 11 AM - 2:30 PM, 5 PM - 10 PM",
    "Thursday: 11 AM - 2:30 PM, 5 PM - 10 PM",
    "Friday: 11 AM - 3 PM, 5 PM - 10 PM",
    "Saturday: 11 AM - 3 PM, 5 PM - 10 PM",
    "Sunday: 11 AM - 3 PM, 5 PM - 9 PM",
  ].join("\n"),
};

export type RestaurantContactSettings = Pick<BusinessSettings, "phone" | "email" | "address" | "hours">;

export function getRestaurantContact(settings: RestaurantContactSettings | null) {
  return {
    phone: settings?.phone.trim() || restaurantInfo.phone,
    email: settings?.email.trim() || restaurantInfo.email,
    address: settings?.address.trim() || restaurantInfo.address,
    hours: (settings?.hours.trim() || restaurantInfo.hours).split(/\r?\n/).map(line => line.trim()).filter(Boolean),
  };
}
