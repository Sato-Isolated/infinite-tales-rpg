/**
 * Inventory-related type definitions
 */

export type Item = {
  description: string;
  effect: string;
};

export type ItemWithId = Item & { item_id: string };

export type InventoryUpdate = {
  type: 'add_item' | 'remove_item';
  item_id: string;
  item_added?: Item;
};

export type InventoryState = { [item_id: string]: Item };
