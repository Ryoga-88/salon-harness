export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; reason?: string };

export type StaffRole = 'owner' | 'editor' | 'stylist';

export type ReservationStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type MenuCategory = 'cut' | 'color' | 'perm' | 'treatment' | 'other';
export type CouponType = 'percentage' | 'fixed_amount' | 'menu_swap';

export interface Salon {
  id: string;
  name: string;
  business_type: 'freelance' | 'solo_salon' | 'shared_salon' | 'multi_stylist';
  timezone: string;
  theme_color: string | null;
}

export interface StaffUser {
  id: string;
  salon_id: string;
  email: string;
  name: string;
  role: StaffRole;
  linked_stylist_id: string | null;
}

export interface Stylist {
  id: string;
  salon_id: string;
  name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_r2_key: string | null;
  specialties: string | null;
  is_active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: string;
  stylist_id: string;
  name: string;
  category: MenuCategory;
  duration_min: number;
  price: number;
  description: string | null;
  is_first_time_only: number;
  is_active: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Coupon {
  id: string;
  stylist_id: string;
  code: string;
  name: string;
  description: string | null;
  type: CouponType;
  value: number;
  applicable_menu_ids: string | null;
  is_first_time_only: number;
  min_total_price: number | null;
  max_discount: number | null;
  valid_from: string;
  valid_until: string;
  usage_limit_total: number | null;
  usage_limit_per_user: number;
  used_count: number;
  display_in_liff: number;
  source: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Reservation {
  id: string;
  stylist_id: string;
  friend_id: string;
  menu_ids: string;
  start_at: string;
  end_at: string;
  total_price: number;
  price_before_discount: number | null;
  discount_amount: number;
  applied_coupon_id: string | null;
  status: ReservationStatus;
  source: string | null;
  customer_note: string | null;
  stylist_note: string | null;
  reminder_sent_at: string | null;
  completed_at: string | null;
  thank_you_sent_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  start_at: string;
  end_at: string;
}
