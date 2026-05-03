INSERT OR IGNORE INTO salons (id, name, business_type, timezone, theme_color, is_active, created_at, updated_at)
VALUES ('default', 'Demo Salon', 'freelance', 'Asia/Tokyo', '#0f766e', 1, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO stylists (id, salon_id, name, display_name, email, bio, specialties, is_active, display_order, created_at, updated_at)
VALUES
  ('seed-stylist-yuki', 'default', 'YUKI', 'YUKI', 'yuki@example.com', 'カラーとケアが得意です。', 'カラー,トリートメント', 1, 1, datetime('now'), datetime('now')),
  ('seed-stylist-aoi', 'default', 'AOI', 'AOI', 'aoi@example.com', 'カットとスタイリング提案が得意です。', 'カット,スタイリング', 1, 2, datetime('now'), datetime('now'));

INSERT INTO staff_users (id, salon_id, email, name, password_hash, role, linked_stylist_id, is_active, created_at, updated_at)
VALUES ('seed-owner', 'default', 'owner@example.com', 'Demo Owner', '$2b$10$LfBx9V1Zl6tMPw1MSIh61.to.b9CUP3sSNVIy5nl21W.T65Gq7kpS', 'owner', NULL, 1, datetime('now'), datetime('now'))
ON CONFLICT(id) DO UPDATE SET
  email = excluded.email,
  name = excluded.name,
  password_hash = excluded.password_hash,
  role = excluded.role,
  is_active = 1,
  updated_at = datetime('now');

INSERT OR IGNORE INTO menus (id, stylist_id, name, category, duration_min, price, description, is_active, display_order, created_at, updated_at)
VALUES
  ('seed-menu-cut', 'seed-stylist-yuki', 'カット', 'cut', 60, 6600, '似合わせカット', 1, 1, datetime('now'), datetime('now')),
  ('seed-menu-color', 'seed-stylist-yuki', 'カラー', 'color', 90, 8800, 'ワンカラー', 1, 2, datetime('now'), datetime('now')),
  ('seed-menu-treatment', 'seed-stylist-aoi', 'トリートメント', 'care', 45, 5500, '集中ケア', 1, 3, datetime('now'), datetime('now'));

INSERT OR IGNORE INTO business_hours (id, stylist_id, day_of_week, open_time, close_time, is_closed)
VALUES
  ('seed-hour-yuki-0', 'seed-stylist-yuki', 0, '10:00', '19:00', 0),
  ('seed-hour-yuki-1', 'seed-stylist-yuki', 1, '10:00', '19:00', 1),
  ('seed-hour-yuki-2', 'seed-stylist-yuki', 2, '10:00', '20:00', 0),
  ('seed-hour-yuki-3', 'seed-stylist-yuki', 3, '10:00', '20:00', 0),
  ('seed-hour-yuki-4', 'seed-stylist-yuki', 4, '10:00', '20:00', 0),
  ('seed-hour-yuki-5', 'seed-stylist-yuki', 5, '10:00', '20:00', 0),
  ('seed-hour-yuki-6', 'seed-stylist-yuki', 6, '10:00', '19:00', 0),
  ('seed-hour-aoi-0', 'seed-stylist-aoi', 0, '10:00', '18:00', 0),
  ('seed-hour-aoi-1', 'seed-stylist-aoi', 1, '10:00', '18:00', 1),
  ('seed-hour-aoi-2', 'seed-stylist-aoi', 2, '10:00', '18:00', 0),
  ('seed-hour-aoi-3', 'seed-stylist-aoi', 3, '10:00', '18:00', 0),
  ('seed-hour-aoi-4', 'seed-stylist-aoi', 4, '10:00', '18:00', 0),
  ('seed-hour-aoi-5', 'seed-stylist-aoi', 5, '10:00', '18:00', 0),
  ('seed-hour-aoi-6', 'seed-stylist-aoi', 6, '10:00', '18:00', 0);
