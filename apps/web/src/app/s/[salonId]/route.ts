import { NextResponse } from 'next/server';
import { salonBookingHref } from '@/lib/liff-public';

/** Web 側にだけ誤って飛んだ `/s/:id` を LIFF へ転送する（環境変数の取り違え対策） */
export async function GET(
  _request: Request,
  context: { params: Promise<{ salonId: string }> }
): Promise<Response> {
  const { salonId } = await context.params;
  if (!salonId?.trim()) {
    return NextResponse.json({ success: false, error: 'Invalid salon id' }, { status: 400 });
  }
  const target = salonBookingHref(salonId);
  return NextResponse.redirect(target, 307);
}
