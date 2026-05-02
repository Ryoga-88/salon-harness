import type { Coupon, Menu } from '@salon-harness/shared';

export type CouponInvalidReason =
  | 'not_found'
  | 'inactive'
  | 'expired'
  | 'first_time_only'
  | 'usage_limit_exceeded'
  | 'usage_limit_per_user_exceeded'
  | 'menu_not_applicable'
  | 'min_price_not_met';

export interface CouponValidationOk {
  valid: true;
  coupon: Coupon;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
}

export interface CouponValidationNg {
  valid: false;
  reason: CouponInvalidReason;
  message: string;
}

export type CouponValidationResult = CouponValidationOk | CouponValidationNg;

const messages: Record<CouponInvalidReason, string> = {
  not_found: 'このクーポンは見つかりません',
  inactive: 'このクーポンは現在利用できません',
  expired: 'このクーポンは有効期限が切れています',
  first_time_only: 'このクーポンは初回のお客様限定です',
  usage_limit_exceeded: 'このクーポンは利用上限に達しました',
  usage_limit_per_user_exceeded: 'このクーポンはすでに利用済みです',
  menu_not_applicable: 'このクーポンは選択したメニューには適用できません',
  min_price_not_met: 'このクーポンの最低利用金額に達していません'
};

export function invalidCoupon(reason: CouponInvalidReason): CouponValidationNg {
  return { valid: false, reason, message: messages[reason] };
}

export function calculateDiscount(coupon: Coupon, menus: Pick<Menu, 'id' | 'price'>[]): number {
  const originalPrice = menus.reduce((sum, menu) => sum + menu.price, 0);
  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.floor((originalPrice * coupon.value) / 100);
  } else if (coupon.type === 'fixed_amount') {
    discount = coupon.value;
  } else {
    discount = 0;
  }
  if (coupon.max_discount !== null) discount = Math.min(discount, coupon.max_discount);
  return Math.max(0, Math.min(discount, originalPrice));
}

export function validateCoupon(args: {
  coupon: Coupon | null;
  menus: Pick<Menu, 'id' | 'price'>[];
  nowIso: string;
  completedReservations: number;
  userUsageCount: number;
}): CouponValidationResult {
  if (!args.coupon) return invalidCoupon('not_found');
  const coupon = args.coupon;
  if (!coupon.is_active) return invalidCoupon('inactive');
  if (coupon.valid_from > args.nowIso || coupon.valid_until < args.nowIso) return invalidCoupon('expired');
  if (coupon.usage_limit_total !== null && coupon.used_count >= coupon.usage_limit_total) {
    return invalidCoupon('usage_limit_exceeded');
  }
  if (args.userUsageCount >= coupon.usage_limit_per_user) return invalidCoupon('usage_limit_per_user_exceeded');
  if (coupon.is_first_time_only && args.completedReservations > 0) return invalidCoupon('first_time_only');

  const applicable = coupon.applicable_menu_ids ? JSON.parse(coupon.applicable_menu_ids) as string[] : null;
  if (applicable && !args.menus.some((m) => applicable.includes(m.id))) return invalidCoupon('menu_not_applicable');

  const originalPrice = args.menus.reduce((sum, menu) => sum + menu.price, 0);
  if (coupon.min_total_price !== null && originalPrice < coupon.min_total_price) return invalidCoupon('min_price_not_met');
  const discountAmount = calculateDiscount(coupon, args.menus);
  return {
    valid: true,
    coupon,
    originalPrice,
    discountAmount,
    finalPrice: originalPrice - discountAmount
  };
}
