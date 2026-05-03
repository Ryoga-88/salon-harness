PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS salons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  line_official_account_id TEXT,
  ig_business_account_id TEXT,
  theme_color TEXT,
  logo_r2_key TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stylists (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  bio TEXT,
  avatar_r2_key TEXT,
  specialties TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id)
);
CREATE INDEX IF NOT EXISTS idx_stylists_salon ON stylists(salon_id, is_active);

CREATE TABLE IF NOT EXISTS stylist_profiles (
  stylist_id TEXT PRIMARY KEY,
  name_kana TEXT,
  title TEXT,
  experience_years INTEGER,
  accepts_direct_booking INTEGER NOT NULL DEFAULT 1,
  status_label TEXT,
  catchphrase TEXT,
  skill_tags TEXT,
  vibe_tags TEXT,
  target_audience TEXT,
  strength_note TEXT,
  nomination_fee INTEGER NOT NULL DEFAULT 0,
  max_daily_reservations INTEGER,
  simultaneous_capacity INTEGER NOT NULL DEFAULT 1,
  available_menu_ids TEXT,
  unavailable_menu_ids TEXT,
  holiday_note TEXT,
  profile_photo_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);

CREATE TABLE IF NOT EXISTS channel_connections (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  stylist_id TEXT,
  provider TEXT NOT NULL CHECK (provider IN ('line', 'instagram')),
  scope TEXT NOT NULL CHECK (scope IN ('salon', 'stylist')),
  account_name TEXT NOT NULL,
  provider_account_id TEXT,
  harness_api_url TEXT,
  harness_api_key TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id),
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);
CREATE INDEX IF NOT EXISTS idx_channel_connections_salon ON channel_connections(salon_id, provider, is_active);
CREATE INDEX IF NOT EXISTS idx_channel_connections_stylist ON channel_connections(stylist_id, provider, is_active);

CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  salon_id TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL,
  linked_stylist_id TEXT,
  last_login_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (salon_id) REFERENCES salons(id),
  FOREIGN KEY (linked_stylist_id) REFERENCES stylists(id)
);
CREATE INDEX IF NOT EXISTS idx_staff_salon ON staff_users(salon_id, is_active);

CREATE TABLE IF NOT EXISTS staff_sessions (
  id TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (staff_user_id) REFERENCES staff_users(id)
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON staff_sessions(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON staff_sessions(expires_at);

CREATE TABLE IF NOT EXISTS identity_links (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  metadata TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source, external_id)
);
CREATE INDEX IF NOT EXISTS idx_identity_links_uuid ON identity_links(uuid);

CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  price INTEGER NOT NULL,
  description TEXT,
  is_first_time_only INTEGER DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);
CREATE INDEX IF NOT EXISTS idx_menus_stylist ON menus(stylist_id, is_active);

CREATE TABLE IF NOT EXISTS business_hours (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id),
  UNIQUE(stylist_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS schedule_overrides (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  date TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  open_time TEXT,
  close_time TEXT,
  reason TEXT,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id),
  UNIQUE(stylist_id, date)
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  menu_ids TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  total_price INTEGER NOT NULL,
  status TEXT NOT NULL,
  source TEXT,
  customer_note TEXT,
  stylist_note TEXT,
  reminder_sent_at TEXT,
  completed_at TEXT,
  thank_you_sent_at TEXT,
  cancelled_at TEXT,
  cancellation_reason TEXT,
  applied_coupon_id TEXT,
  discount_amount INTEGER NOT NULL DEFAULT 0,
  price_before_discount INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);
CREATE INDEX IF NOT EXISTS idx_reservations_stylist_date ON reservations(stylist_id, start_at);
CREATE INDEX IF NOT EXISTS idx_reservations_friend ON reservations(friend_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

CREATE TABLE IF NOT EXISTS kartes (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  stylist_id TEXT NOT NULL,
  hair_type TEXT,
  hair_thickness TEXT,
  hair_amount TEXT,
  scalp_condition TEXT,
  formula TEXT,
  procedure_note TEXT,
  next_recommendation TEXT,
  recommended_next_visit_date TEXT,
  before_photo_r2_keys TEXT,
  after_photo_r2_keys TEXT,
  is_visible_to_customer INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES reservations(id),
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);
CREATE INDEX IF NOT EXISTS idx_kartes_friend ON kartes(friend_id, created_at);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  r2_key TEXT NOT NULL UNIQUE,
  karte_id TEXT,
  type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  uploaded_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (karte_id) REFERENCES kartes(id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  applicable_menu_ids TEXT,
  is_first_time_only INTEGER NOT NULL DEFAULT 0,
  min_total_price INTEGER,
  max_discount INTEGER,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  usage_limit_total INTEGER,
  usage_limit_per_user INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  display_in_liff INTEGER NOT NULL DEFAULT 1,
  source TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_stylist_active ON coupons(stylist_id, is_active, valid_until);

CREATE TABLE IF NOT EXISTS coupon_usages (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL,
  reservation_id TEXT NOT NULL,
  friend_id TEXT NOT NULL,
  discount_applied INTEGER NOT NULL,
  used_at TEXT NOT NULL,
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (reservation_id) REFERENCES reservations(id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon ON coupon_usages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usages_friend ON coupon_usages(friend_id, coupon_id);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  stylist_id TEXT NOT NULL,
  referrer_friend_id TEXT NOT NULL,
  referrer_code TEXT NOT NULL UNIQUE,
  referred_friend_id TEXT,
  reward_for_referrer INTEGER,
  reward_for_referred INTEGER,
  status TEXT NOT NULL,
  used_at TEXT,
  reward_granted_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (stylist_id) REFERENCES stylists(id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referrer_code);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_friend_id);

CREATE TABLE IF NOT EXISTS automation_jobs (
  id TEXT PRIMARY KEY,
  job_type TEXT NOT NULL,
  target_friend_id TEXT NOT NULL,
  target_reservation_id TEXT,
  scheduled_at TEXT NOT NULL,
  executed_at TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_automation_pending ON automation_jobs(status, scheduled_at);
