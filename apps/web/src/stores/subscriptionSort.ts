import { create } from "zustand";
import {
  DEFAULT_SUBSCRIPTION_SORT,
  isSubscriptionSortOrder,
  type SubscriptionSortOrder,
} from "../lib/subscriptionSort.js";

export const SUBSCRIPTION_SORT_STORAGE_KEY = "tolocha:subscriptionSort";

interface SubscriptionSortState {
  order: SubscriptionSortOrder;
  setOrder: (order: SubscriptionSortOrder) => void;
}

export function readStoredSubscriptionSort(): SubscriptionSortOrder {
  try {
    const stored = window.localStorage.getItem(SUBSCRIPTION_SORT_STORAGE_KEY);
    if (isSubscriptionSortOrder(stored)) return stored;
  } catch {
    // noop
  }
  return DEFAULT_SUBSCRIPTION_SORT;
}

export function writeStoredSubscriptionSort(order: SubscriptionSortOrder): void {
  try {
    window.localStorage.setItem(SUBSCRIPTION_SORT_STORAGE_KEY, order);
  } catch {
    // noop
  }
}

export const useSubscriptionSortStore = create<SubscriptionSortState>((set) => ({
  order: readStoredSubscriptionSort(),

  setOrder(order) {
    set({ order });
    writeStoredSubscriptionSort(order);
  },
}));
