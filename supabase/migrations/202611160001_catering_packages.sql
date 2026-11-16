-- Verified from the restaurant-supplied Catering Pricing.pdf.
-- Prices are USD per whole package, not per person. Existing restaurant items stay separate.
alter table public.menu_items add column if not exists menu_type text not null default 'regular'
  check (menu_type in ('regular', 'catering'));
alter table public.menu_items alter column menu_type set default 'catering';
create index if not exists menu_items_menu_type_idx on public.menu_items(menu_type, published, sort_order);

insert into public.menu_items (id, name, menu_type, category, kind, description, price_minor, unit, minimum_quantity, quantity_step, dietary, allergens, image_url, options, available, published, sort_order)
select id, name, menu_type, category, kind, description, price_minor, unit, minimum_quantity, quantity_step, dietary, allergens, image_url, options, available, published, sort_order
from jsonb_populate_recordset(null::public.menu_items, $aahaa_catering$
[
  {
    "id": "909578f0-a365-413f-882c-0014a32ac71e",
    "name": "Aahaa Veg Package - 20 guests",
    "menu_type": "catering",
    "category": "Aahaa Veg Package",
    "kind": "package",
    "description": "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Jumbo / 57 oz each; entrees Jumbo / 57 oz each (2 listed portions); biryani Medium shallow / 175 oz; rice Jumbo / 57 oz; sambar/rasam Jumbo / 57 oz; dessert Jumbo / 57 oz; salna 16 oz; raita 16 oz.\nBread: 10 naan cut into 4, OR 10 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 32000,
    "unit": "package for 20 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [
      "Vegetarian"
    ],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 0
  },
  {
    "id": "63a2c453-a020-4f89-8477-93ee1b7e74e1",
    "name": "Aahaa Veg Package - 25-30 guests",
    "menu_type": "catering",
    "category": "Aahaa Veg Package",
    "kind": "package",
    "description": "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Half shallow / 84 oz each; entrees Half shallow / 84 oz each (2 listed portions); biryani Medium / 228 oz; rice Half shallow / 84 oz; sambar/rasam Half shallow / 84 oz; dessert Half shallow / 84 oz; salna 32 oz; raita 32 oz.\nBread: 15 naan cut into 4, OR 15 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 38000,
    "unit": "package for 25-30 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [
      "Vegetarian"
    ],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 1
  },
  {
    "id": "66848cab-4800-499c-856c-1d8d8f6d3c6f",
    "name": "Aahaa Veg Package - 35-40 guests",
    "menu_type": "catering",
    "category": "Aahaa Veg Package",
    "kind": "package",
    "description": "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Half / 104 oz each; entrees Half / 104 oz each (2 listed portions); biryani Medium / 228 oz + half / 104 oz; rice Half shallow / 84 oz; sambar/rasam Half / 104 oz; dessert Half / 104 oz; salna 32 oz; raita 32 oz.\nBread: 20 naan cut into 4, OR 20 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 60000,
    "unit": "package for 35-40 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [
      "Vegetarian"
    ],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 2
  },
  {
    "id": "aea2e847-f5fb-4584-8200-a5b7c0d0bb97",
    "name": "Aahaa Veg Package - 45-50 guests",
    "menu_type": "catering",
    "category": "Aahaa Veg Package",
    "kind": "package",
    "description": "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium shallow / 175 oz each; entrees Medium shallow / 175 oz each (2 listed portions); biryani Medium / 228 oz + medium shallow / 175 oz; rice Half / 104 oz; sambar/rasam Medium shallow / 175 oz; dessert Medium shallow / 175 oz; salna Half shallow / 84 oz; raita Half shallow / 84 oz.\nBread: 25 naan cut into 4, OR 25 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 75000,
    "unit": "package for 45-50 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [
      "Vegetarian"
    ],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 3
  },
  {
    "id": "86fdda6f-0c5d-410c-89d8-e1f58d8d9753",
    "name": "Aahaa Veg Package - 55-60 guests",
    "menu_type": "catering",
    "category": "Aahaa Veg Package",
    "kind": "package",
    "description": "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium / 228 oz each; entrees Medium / 228 oz each (2 listed portions); biryani 1 full tray (ounces not specified); rice Medium shallow / 175 oz; sambar/rasam Medium / 228 oz; dessert Medium / 228 oz; salna Half shallow / 84 oz; raita Half shallow / 84 oz.\nBread: 30 naan cut into 4, OR 30 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 90000,
    "unit": "package for 55-60 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [
      "Vegetarian"
    ],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 4
  },
  {
    "id": "7aa26dff-e4e8-4757-8a82-f874db3bae87",
    "name": "Aahaa Veg Package - 65-70 guests",
    "menu_type": "catering",
    "category": "Aahaa Veg Package",
    "kind": "package",
    "description": "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium / 228 oz + half shallow / 84 oz each; entrees Medium / 228 oz + half shallow / 84 oz each (2 listed portions); biryani Full / 343 oz + half / 104 oz; rice Medium shallow / 175 oz; sambar/rasam Medium / 228 oz; dessert Medium / 228 oz + 36 oz pan; salna Half / 104 oz; raita Half / 104 oz.\nBread: 35 naan cut into 4, OR 35 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 100000,
    "unit": "package for 65-70 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [
      "Vegetarian"
    ],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 5
  },
  {
    "id": "51457cf5-455f-4f26-884a-953622e4b22d",
    "name": "Aahaa Veg Package - 75-80 guests",
    "menu_type": "catering",
    "category": "Aahaa Veg Package",
    "kind": "package",
    "description": "2 veg appetizers; 2 veg entrees; veg biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Full / 343 oz each; entrees Full / 343 oz each (2 listed portions); biryani Full / 343 oz + medium / 228 oz; rice Full / 343 oz; sambar/rasam Full / 343 oz; dessert Full / 343 oz; salna Half / 104 oz; raita Half / 104 oz.\nBread: 40 naan cut into 4, OR 40 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 115000,
    "unit": "package for 75-80 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [
      "Vegetarian"
    ],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 6
  },
  {
    "id": "a346823e-961d-4f61-8a30-50b2412a05e6",
    "name": "Aahaa Non-Veg Package - 20 guests",
    "menu_type": "catering",
    "category": "Aahaa Non-Veg Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 1 chicken entree; veg or chicken biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Jumbo / 57 oz each; entrees Jumbo / 57 oz each (2 listed portions); biryani Medium shallow / 175 oz; rice Jumbo / 57 oz; sambar/rasam Jumbo / 57 oz; dessert Jumbo / 57 oz; salna 16 oz; raita 16 oz.\nBread: 10 naan cut into 4, OR 10 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 34000,
    "unit": "package for 20 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Chicken Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 100
  },
  {
    "id": "1785ff22-9246-4571-861f-b8cff1f03c77",
    "name": "Aahaa Non-Veg Package - 25-30 guests",
    "menu_type": "catering",
    "category": "Aahaa Non-Veg Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 1 chicken entree; veg or chicken biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Half shallow / 84 oz each; entrees Half shallow / 84 oz each (2 listed portions); biryani Medium / 228 oz; rice Half shallow / 84 oz; sambar/rasam Half shallow / 84 oz; dessert Half shallow / 84 oz; salna 32 oz; raita 32 oz.\nBread: 15 naan cut into 4, OR 15 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 42000,
    "unit": "package for 25-30 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Chicken Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 101
  },
  {
    "id": "071c7e90-2983-4208-839a-8c3cd97eff53",
    "name": "Aahaa Non-Veg Package - 35-40 guests",
    "menu_type": "catering",
    "category": "Aahaa Non-Veg Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 1 chicken entree; veg or chicken biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Half / 104 oz each; entrees Half / 104 oz each (2 listed portions); biryani Medium / 228 oz + half / 104 oz; rice Half shallow / 84 oz; sambar/rasam Half / 104 oz; dessert Half / 104 oz; salna 32 oz; raita 32 oz.\nBread: 20 naan cut into 4, OR 20 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 64000,
    "unit": "package for 35-40 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Chicken Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 102
  },
  {
    "id": "6ff05235-877b-4f4d-871a-db39bf6c3d7d",
    "name": "Aahaa Non-Veg Package - 45-50 guests",
    "menu_type": "catering",
    "category": "Aahaa Non-Veg Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 1 chicken entree; veg or chicken biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium shallow / 175 oz each; entrees Medium shallow / 175 oz each (2 listed portions); biryani Medium / 228 oz + medium shallow / 175 oz; rice Half / 104 oz; sambar/rasam Medium shallow / 175 oz; dessert Medium shallow / 175 oz; salna Half shallow / 84 oz; raita Half shallow / 84 oz.\nBread: 25 naan cut into 4, OR 25 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 80000,
    "unit": "package for 45-50 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Chicken Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 103
  },
  {
    "id": "d4f87d75-c07c-4414-84c9-9af0989b5fbe",
    "name": "Aahaa Non-Veg Package - 55-60 guests",
    "menu_type": "catering",
    "category": "Aahaa Non-Veg Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 1 chicken entree; veg or chicken biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium / 228 oz each; entrees Medium / 228 oz each (2 listed portions); biryani 1 full tray (ounces not specified); rice Medium shallow / 175 oz; sambar/rasam Medium / 228 oz; dessert Medium / 228 oz; salna Half shallow / 84 oz; raita Half shallow / 84 oz.\nBread: 30 naan cut into 4, OR 30 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 95000,
    "unit": "package for 55-60 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Chicken Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 104
  },
  {
    "id": "2fb79d7e-dd19-4680-86c0-fadac7f8ae1a",
    "name": "Aahaa Non-Veg Package - 65-70 guests",
    "menu_type": "catering",
    "category": "Aahaa Non-Veg Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 1 chicken entree; veg or chicken biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium / 228 oz + half shallow / 84 oz each; entrees Medium / 228 oz + half shallow / 84 oz each (2 listed portions); biryani Full / 343 oz + half / 104 oz; rice Medium shallow / 175 oz; sambar/rasam Medium / 228 oz; dessert Medium / 228 oz + 36 oz pan; salna Half / 104 oz; raita Half / 104 oz.\nBread: 35 naan cut into 4, OR 35 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 115000,
    "unit": "package for 65-70 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Chicken Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 105
  },
  {
    "id": "81b38c4d-f48d-481f-8ef2-dffc9647f6c5",
    "name": "Aahaa Non-Veg Package - 75-80 guests",
    "menu_type": "catering",
    "category": "Aahaa Non-Veg Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 1 chicken entree; veg or chicken biryani; white rice or jeera rice; sambar or rasam; bread; dessert; raita; salna.\nApproximate portions: appetizers Full / 343 oz each; entrees Full / 343 oz each (2 listed portions); biryani Full / 343 oz + medium / 228 oz; rice Full / 343 oz; sambar/rasam Full / 343 oz; dessert Full / 343 oz; salna Half / 104 oz; raita Half / 104 oz.\nBread: 40 naan cut into 4, OR 40 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.",
    "price_minor": 130000,
    "unit": "package for 75-80 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Veg Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Chicken Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Jeera Rice",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 106
  },
  {
    "id": "ed218217-b729-411c-8842-905a5e888071",
    "name": "Aahaa Special Package - 20 guests",
    "menu_type": "catering",
    "category": "Aahaa Special Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 2 non-veg entrees (chicken/goat/fish); Thalapakatti chicken or veg biryani; white rice or veg pulao; sambar, rasam or kara kulambu; bread; dessert; raita; salna.\nApproximate portions: appetizers Jumbo / 57 oz each; entrees Jumbo / 57 oz each (2 listed portions); biryani Medium shallow / 175 oz; rice Jumbo / 57 oz; sambar/rasam Jumbo / 57 oz; dessert Jumbo / 57 oz; salna 16 oz; raita 16 oz.\nBread: 10 naan cut into 4, OR 10 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.\nSpecial: third entree portion requires manager clarification.",
    "price_minor": 38000,
    "unit": "package for 20 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Thalapakatti Chicken Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Veg Pulao",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          },
          {
            "id": "curry_2",
            "label": "Kara Kulambu",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 200
  },
  {
    "id": "efafd889-35b5-499c-854c-8195015c74d0",
    "name": "Aahaa Special Package - 25-30 guests",
    "menu_type": "catering",
    "category": "Aahaa Special Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 2 non-veg entrees (chicken/goat/fish); Thalapakatti chicken or veg biryani; white rice or veg pulao; sambar, rasam or kara kulambu; bread; dessert; raita; salna.\nApproximate portions: appetizers Half shallow / 84 oz each; entrees Half shallow / 84 oz each (2 listed portions); biryani Medium / 228 oz; rice Half shallow / 84 oz; sambar/rasam Half shallow / 84 oz; dessert Half shallow / 84 oz; salna 32 oz; raita 32 oz.\nBread: 15 naan cut into 4, OR 15 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.\nSpecial: third entree portion requires manager clarification.",
    "price_minor": 48000,
    "unit": "package for 25-30 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Thalapakatti Chicken Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Veg Pulao",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          },
          {
            "id": "curry_2",
            "label": "Kara Kulambu",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 201
  },
  {
    "id": "3d685d21-e8c6-4e62-82bc-6eb8ff0d304d",
    "name": "Aahaa Special Package - 35-40 guests",
    "menu_type": "catering",
    "category": "Aahaa Special Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 2 non-veg entrees (chicken/goat/fish); Thalapakatti chicken or veg biryani; white rice or veg pulao; sambar, rasam or kara kulambu; bread; dessert; raita; salna.\nApproximate portions: appetizers Half / 104 oz each; entrees Half / 104 oz each (2 listed portions); biryani Medium / 228 oz + half / 104 oz; rice Half shallow / 84 oz; sambar/rasam Half / 104 oz; dessert Half / 104 oz; salna 32 oz; raita 32 oz.\nBread: 20 naan cut into 4, OR 20 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.\nSpecial: third entree portion requires manager clarification.",
    "price_minor": 70000,
    "unit": "package for 35-40 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Thalapakatti Chicken Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Veg Pulao",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          },
          {
            "id": "curry_2",
            "label": "Kara Kulambu",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 202
  },
  {
    "id": "375c889b-08b8-48cc-8ea8-4d9b9c052cb1",
    "name": "Aahaa Special Package - 45-50 guests",
    "menu_type": "catering",
    "category": "Aahaa Special Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 2 non-veg entrees (chicken/goat/fish); Thalapakatti chicken or veg biryani; white rice or veg pulao; sambar, rasam or kara kulambu; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium shallow / 175 oz each; entrees Medium shallow / 175 oz each (2 listed portions); biryani Medium / 228 oz + medium shallow / 175 oz; rice Half / 104 oz; sambar/rasam Medium shallow / 175 oz; dessert Medium shallow / 175 oz; salna Half shallow / 84 oz; raita Half shallow / 84 oz.\nBread: 25 naan cut into 4, OR 25 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.\nSpecial: third entree portion requires manager clarification.",
    "price_minor": 86500,
    "unit": "package for 45-50 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Thalapakatti Chicken Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Veg Pulao",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          },
          {
            "id": "curry_2",
            "label": "Kara Kulambu",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 203
  },
  {
    "id": "d3ce6a71-cfd8-4d4d-8707-c5ae27506f2e",
    "name": "Aahaa Special Package - 55-60 guests",
    "menu_type": "catering",
    "category": "Aahaa Special Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 2 non-veg entrees (chicken/goat/fish); Thalapakatti chicken or veg biryani; white rice or veg pulao; sambar, rasam or kara kulambu; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium / 228 oz each; entrees Medium / 228 oz each (2 listed portions); biryani 1 full tray (ounces not specified); rice Medium shallow / 175 oz; sambar/rasam Medium / 228 oz; dessert Medium / 228 oz; salna Half shallow / 84 oz; raita Half shallow / 84 oz.\nBread: 30 naan cut into 4, OR 30 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.\nSpecial: third entree portion requires manager clarification.",
    "price_minor": 105000,
    "unit": "package for 55-60 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Thalapakatti Chicken Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Veg Pulao",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          },
          {
            "id": "curry_2",
            "label": "Kara Kulambu",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 204
  },
  {
    "id": "5724aa67-932b-471f-8d5e-829a6461b65f",
    "name": "Aahaa Special Package - 65-70 guests",
    "menu_type": "catering",
    "category": "Aahaa Special Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 2 non-veg entrees (chicken/goat/fish); Thalapakatti chicken or veg biryani; white rice or veg pulao; sambar, rasam or kara kulambu; bread; dessert; raita; salna.\nApproximate portions: appetizers Medium / 228 oz + half shallow / 84 oz each; entrees Medium / 228 oz + half shallow / 84 oz each (2 listed portions); biryani Full / 343 oz + half / 104 oz; rice Medium shallow / 175 oz; sambar/rasam Medium / 228 oz; dessert Medium / 228 oz + 36 oz pan; salna Half / 104 oz; raita Half / 104 oz.\nBread: 35 naan cut into 4, OR 35 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.\nSpecial: third entree portion requires manager clarification.",
    "price_minor": 125000,
    "unit": "package for 65-70 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Thalapakatti Chicken Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Veg Pulao",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          },
          {
            "id": "curry_2",
            "label": "Kara Kulambu",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 205
  },
  {
    "id": "92e04f49-78e7-49f0-80ff-d3d4067faaec",
    "name": "Aahaa Special Package - 75-80 guests",
    "menu_type": "catering",
    "category": "Aahaa Special Package",
    "kind": "package",
    "description": "1 veg and 1 chicken appetizer; 1 veg and 2 non-veg entrees (chicken/goat/fish); Thalapakatti chicken or veg biryani; white rice or veg pulao; sambar, rasam or kara kulambu; bread; dessert; raita; salna.\nApproximate portions: appetizers Full / 343 oz each; entrees Full / 343 oz each (2 listed portions); biryani Full / 343 oz + medium / 228 oz; rice Full / 343 oz; sambar/rasam Full / 343 oz; dessert Full / 343 oz; salna Half / 104 oz; raita Half / 104 oz.\nBread: 40 naan cut into 4, OR 40 parotta/chapathi cut into 2.\nPaneer: one entree only. Add appetizer/entree preferences in instructions; manager confirms dishes.\nSpecial: third entree portion requires manager clarification.",
    "price_minor": 140000,
    "unit": "package for 75-80 guests",
    "minimum_quantity": 1,
    "quantity_step": 1,
    "dietary": [],
    "allergens": [],
    "image_url": null,
    "options": [
      {
        "id": "biryani",
        "name": "Biryani",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "biryani_0",
            "label": "Thalapakatti Chicken Biryani",
            "price_minor": 0
          },
          {
            "id": "biryani_1",
            "label": "Veg Biryani",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "rice",
        "name": "Rice",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "rice_0",
            "label": "White Rice",
            "price_minor": 0
          },
          {
            "id": "rice_1",
            "label": "Veg Pulao",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "curry",
        "name": "Sambar / Rasam / Curry",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "curry_0",
            "label": "Sambar",
            "price_minor": 0
          },
          {
            "id": "curry_1",
            "label": "Rasam",
            "price_minor": 0
          },
          {
            "id": "curry_2",
            "label": "Kara Kulambu",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "bread",
        "name": "Bread (choose one type)",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "bread_0",
            "label": "Plain Naan",
            "price_minor": 0
          },
          {
            "id": "bread_1",
            "label": "Butter Naan",
            "price_minor": 0
          },
          {
            "id": "bread_2",
            "label": "Parotta",
            "price_minor": 0
          },
          {
            "id": "bread_3",
            "label": "Chapathi",
            "price_minor": 0
          }
        ]
      },
      {
        "id": "dessert",
        "name": "Dessert",
        "min": 1,
        "max": 1,
        "choices": [
          {
            "id": "dessert_0",
            "label": "Pineapple Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_1",
            "label": "Mango Kesari",
            "price_minor": 0
          },
          {
            "id": "dessert_2",
            "label": "Gajar Halwa",
            "price_minor": 0
          },
          {
            "id": "dessert_3",
            "label": "Gulab Jamun",
            "price_minor": 0
          },
          {
            "id": "dessert_4",
            "label": "Payasam",
            "price_minor": 0
          }
        ]
      }
    ],
    "available": true,
    "published": true,
    "sort_order": 206
  }
]
$aahaa_catering$::jsonb)
on conflict (id) do nothing;
