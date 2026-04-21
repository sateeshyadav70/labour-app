import { apiDelete, apiGet, apiPatch, apiPost, unwrapApiResponse } from "./api";

const pickData = (response) => unwrapApiResponse(response) || response || {};

export const loadWishlist = async (token) => {
  const response = await apiGet("/user/wishlist", { token });
  const data = pickData(response);
  return data.wishlistItems || [];
};

export const toggleWishlistItem = async (payload, token) => {
  const response = await apiPost("/user/wishlist", payload, { token });
  const data = pickData(response);
  return {
    wishlistItems: data.wishlistItems || [],
    item: data.item || null,
    saved: Boolean(data.saved),
  };
};

export const clearWishlist = async (token) => {
  const response = await apiDelete("/user/wishlist", { token });
  const data = pickData(response);
  return data.wishlistItems || [];
};

export const loadCart = async (token) => {
  const response = await apiGet("/user/cart", { token });
  const data = pickData(response);
  return data.cartItems || [];
};

export const addCartItem = async (payload, token) => {
  const response = await apiPost("/user/cart", payload, { token });
  const data = pickData(response);
  return {
    cartItems: data.cartItems || [],
    item: data.item || null,
  };
};

export const updateCartItem = async (itemId, payload, token) => {
  const response = await apiPatch(`/user/cart/${itemId}`, payload, { token });
  const data = pickData(response);
  return {
    cartItems: data.cartItems || [],
    item: data.item || null,
  };
};

export const removeCartItem = async (itemId, token) => {
  const response = await apiDelete(`/user/cart/${itemId}`, { token });
  const data = pickData(response);
  return data.cartItems || [];
};

export const clearCart = async (token) => {
  const response = await apiDelete("/user/cart", { token });
  const data = pickData(response);
  return data.cartItems || [];
};
