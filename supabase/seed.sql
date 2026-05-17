-- =====================================================================
-- PetroConnect — Seed categories
-- =====================================================================

insert into public.categories (slug, name, kind, icon, sort_order) values
  ('electronics','Electronics','product','laptop',1),
  ('vehicles','Vehicles & Parts','product','car',2),
  ('furniture','Furniture','product','sofa',3),
  ('home-appliances','Home Appliances','product','refrigerator',4),
  ('fashion','Fashion','product','shirt',5),
  ('books','Books & Stationery','product','book',6),
  ('industrial','Industrial / Safety Gear','product','hard-hat',7),
  ('tools','Tools & Equipment','product','wrench',8),
  ('sports','Sports & Outdoors','product','dumbbell',9),
  ('other-product','Other','product','package',99),

  ('tutoring','Tutoring & Training','service','graduation-cap',1),
  ('technical','Technical / Engineering','service','cog',2),
  ('translation','Translation','service','languages',3),
  ('photography','Photography','service','camera',4),
  ('home-services','Home Services','service','home',5),
  ('logistics','Logistics & Moving','service','truck',6),
  ('it-services','IT / Software','service','code',7),
  ('consulting','Consulting','service','briefcase',8),
  ('other-service','Other','service','sparkles',99)
on conflict (slug) do nothing;
