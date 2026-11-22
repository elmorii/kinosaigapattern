// Client-side cart manager with localStorage persistence & multi-product Payhip checkout

export interface CartItem {
  id: string; // Permanent unique ID, e.g. "K13"
  title: string;
  price: number;
  image: string;
  payhipCode: string;
  checkoutUrl?: string;
  slug: string;
}

const STORAGE_KEY = 'kinusaiga_cart_v1';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to read cart from localStorage', e);
    return [];
  }
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    dispatchCartUpdate(items);
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
}

export function addToCart(item: CartItem): { success: boolean; alreadyExists: boolean } {
  const current = getCart();
  const exists = current.some((i) => i.id.toUpperCase() === item.id.toUpperCase());

  if (exists) {
    // Avoid duplicate digital download purchases
    return { success: true, alreadyExists: true };
  }

  const updated = [...current, item];
  saveCart(updated);
  return { success: true, alreadyExists: false };
}

export function removeFromCart(id: string): CartItem[] {
  const current = getCart();
  const updated = current.filter((i) => i.id.toUpperCase() !== id.toUpperCase());
  saveCart(updated);
  return updated;
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    dispatchCartUpdate([]);
  } catch (e) {
    console.error('Failed to clear cart', e);
  }
}

export function getCartCount(): number {
  return getCart().length;
}

export function getCartSubtotal(): number {
  const items = getCart();
  return items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
}

/**
 * Builds checkout URL for items in cart using Payhip.
 */
export function buildCheckoutUrl(items?: CartItem[]): { url: string; error?: string } {
  const cartItems = items || getCart();
  if (cartItems.length === 0) {
    return { url: '', error: 'Your cart is empty.' };
  }

  const validCodes = cartItems.filter((i) => i.payhipCode && i.payhipCode.trim() !== '');
  if (validCodes.length === 0) {
    return {
      url: '',
      error: 'Our digital pattern collection will be available for purchase soon. Stay tuned!',
    };
  }

  if (validCodes.length === 1 && validCodes[0].checkoutUrl) {
    return { url: validCodes[0].checkoutUrl };
  }

  const params = validCodes
    .map((item) => `cart_links[]=${encodeURIComponent(item.payhipCode.trim())}`)
    .join('&');

  return {
    url: `https://payhip.com/buy?${params}`,
  };
}

export const buildPayhipCheckoutUrl = buildCheckoutUrl;

export async function resolveCheckoutUrl(items?: CartItem[]): Promise<{ url: string; error?: string }> {
  return buildCheckoutUrl(items);
}

/**
 * Removes purchased items from cart upon successful checkout.
 * If productIds is provided (string or array), only those items are removed.
 * If no productIds provided, clears all items in the cart.
 */
export function removePurchasedItems(productIds?: string | string[]): CartItem[] {
  if (typeof window === 'undefined') return [];
  if (!productIds || (Array.isArray(productIds) && productIds.length === 0)) {
    clearCart();
    return [];
  }

  const idsToRemove = (Array.isArray(productIds) ? productIds : [productIds]).map((id) =>
    id.toUpperCase().trim()
  );

  const current = getCart();
  const updated = current.filter((item) => !idsToRemove.includes(item.id.toUpperCase().trim()));
  saveCart(updated);
  return updated;
}

/**
 * Launches in-site checkout via modal, with fallback to direct redirect.
 */
export function launchCheckout(url: string, title?: string, itemIds?: string | string[]): void {
  if (typeof window === 'undefined' || !url) return;
  const win = window as any;
  if (typeof win.openKinuCheckout === 'function') {
    win.openKinuCheckout(url, title || 'Secure Digital Checkout', itemIds);
  } else {
    if (itemIds) {
      try {
        const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
        sessionStorage.setItem('kinu_pending_purchase', JSON.stringify(ids));
      } catch (e) {}
    }
    window.location.href = url;
  }
}

export const launchPayhipCheckout = launchCheckout;

function dispatchCartUpdate(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  const count = items.length;
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);

  window.dispatchEvent(
    new CustomEvent('kinusaiga:cart-updated', {
      detail: { items, count, subtotal },
    })
  );
}

// Global script helper to initialize cart listeners across pages
if (typeof window !== 'undefined') {
  // Listen for storage events across browser tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      dispatchCartUpdate(getCart());
    }
  });

  // Check if returning from a completed external checkout redirect
  try {
    const params = new URLSearchParams(window.location.search);
    const hasSuccessParam =
      params.has('order') ||
      params.has('order_id') ||
      params.has('purchase_complete') ||
      (params.has('status') && params.get('status') === 'success') ||
      params.has('payhip_success');

    if (hasSuccessParam) {
      const pendingRaw = sessionStorage.getItem('kinu_pending_purchase');
      if (pendingRaw) {
        const pendingIds = JSON.parse(pendingRaw);
        removePurchasedItems(pendingIds);
        sessionStorage.removeItem('kinu_pending_purchase');
      } else {
        clearCart();
      }
    }
  } catch (e) {}

  // Expose API to window for easy inline access if needed
  (window as unknown as { KinusaigaCart: unknown }).KinusaigaCart = {
    getCart,
    addToCart,
    removeFromCart,
    removePurchasedItems,
    clearCart,
    getCartCount,
    getCartSubtotal,
    buildPayhipCheckoutUrl,
    launchPayhipCheckout,
  };
}
