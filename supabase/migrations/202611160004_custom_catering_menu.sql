-- Starter choices requested by the owner; catering portions and prices require a manager quote.
-- These dish names already appear in the restaurant and catering menus.
alter table public.menu_items add column is_custom_menu boolean not null default false;
alter table public.menu_items add constraint custom_menu_catering_package
  check (not is_custom_menu or (menu_type='catering' and kind='package' and jsonb_array_length(options)>0));

insert into public.menu_items (
  id,menu_type,is_custom_menu,name,description,category,kind,price_minor,unit,
  minimum_quantity,quantity_step,dietary,allergens,image_url,options,available,published,sort_order
) values (
  '86e6bb27-f927-4858-8efe-c663207752c9','catering',true,'Build your own catering menu',
  'Choose dishes by category to create your own catering menu. Select at least one dish; you can skip categories you do not need. These are starter choices, not a fixed package. Add preferred quantities, other dishes or dietary requirements in Special instructions. Our manager confirms catering availability, portions, allergens and the full price before any order is confirmed.',
  'Customized catering','package',null,'custom menu',1,1,'{}','{}',null,
  '[
    {"id":"appetizers","name":"Appetizers","min":0,"max":2,"choices":[
      {"id":"gobi_manchurian","label":"Gobi Manchurian","price_minor":0},
      {"id":"paneer_65","label":"Paneer 65","price_minor":0},
      {"id":"chilli_paneer","label":"Chilli Paneer","price_minor":0}
    ]},
    {"id":"entrees","name":"Entrees / Curries","min":0,"max":3,"choices":[
      {"id":"paneer_tikka_masala","label":"Paneer Tikka Masala","price_minor":0},
      {"id":"kadai_paneer","label":"Kadai Paneer","price_minor":0},
      {"id":"yellow_dal_tadka","label":"Yellow Dal Tadka","price_minor":0}
    ]},
    {"id":"biryani","name":"Biryani","min":0,"max":2,"choices":[
      {"id":"veg_biryani","label":"Veg Biryani","price_minor":0},
      {"id":"chennai_chicken","label":"Chennai Chicken Dum Biryani","price_minor":0},
      {"id":"chennai_goat","label":"Chennai Goat Dum Biryani","price_minor":0}
    ]},
    {"id":"bread","name":"Bread","min":0,"max":2,"choices":[
      {"id":"plain_naan","label":"Plain Naan","price_minor":0},
      {"id":"butter_naan","label":"Butter Naan","price_minor":0},
      {"id":"chapathi","label":"Chapathi","price_minor":0}
    ]},
    {"id":"desserts","name":"Desserts","min":0,"max":2,"choices":[
      {"id":"gulab_jamun","label":"Gulab Jamun","price_minor":0},
      {"id":"gajar_halwa","label":"Gajar Halwa","price_minor":0},
      {"id":"payasam","label":"Payasam","price_minor":0}
    ]}
  ]'::jsonb,true,true,300
);
