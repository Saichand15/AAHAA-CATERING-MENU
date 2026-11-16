-- Preserve every existing package price, dish choice and group order.
-- The server derives a manager-quote requirement from these choices, never from client pricing.
do $$
begin
  if exists(
    select 1 from public.menu_items item, jsonb_array_elements(item.options) group_row
    where item.menu_type='catering' and item.kind='package' and not item.is_custom_menu
      and jsonb_array_length(group_row->'choices')>=20
      and not exists(select 1 from jsonb_array_elements(group_row->'choices') choice where choice->>'id'='customized')
  ) then raise exception 'A package group already has 20 choices. Review it before adding Customized.'; end if;
end $$;
update public.menu_items item set options=(
  select jsonb_agg(
    case when exists(select 1 from jsonb_array_elements(group_row.value->'choices') choice where choice->>'id'='customized')
      then group_row.value
      else jsonb_set(group_row.value,'{choices}',(group_row.value->'choices') ||
        '[{"id":"customized","label":"Customized - manager review","price_minor":0,"requires_quote":true}]'::jsonb)
    end order by group_row.ordinality
  )
  from jsonb_array_elements(item.options) with ordinality as group_row(value,ordinality)
),updated_at=now()
where menu_type='catering' and kind='package' and not is_custom_menu
  and jsonb_array_length(options)>0;
