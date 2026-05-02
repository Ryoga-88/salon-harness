import type { ApiResponse, Reservation, Stylist, Menu, Coupon } from '@salon-harness/shared';

export class SalonHarnessClient {
  constructor(private readonly baseUrl: string, private readonly apiKey: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...init.headers
      }
    });
    const body = await res.json() as ApiResponse<T>;
    if (!res.ok || !body.success) {
      throw new Error(body.success ? `API error: ${res.status}` : body.error);
    }
    return body.data;
  }

  stylists() {
    return this.request<Stylist[]>('/api/stylists');
  }

  menus(stylistId?: string) {
    return this.request<Menu[]>(`/api/menus${stylistId ? `?stylist_id=${encodeURIComponent(stylistId)}` : ''}`);
  }

  coupons(stylistId: string, friendId: string) {
    return this.request<Coupon[]>(`/api/coupons?stylist_id=${encodeURIComponent(stylistId)}&friend_id=${encodeURIComponent(friendId)}`);
  }

  reservations(params = '') {
    return this.request<Reservation[]>(`/api/reservations${params}`);
  }
}
