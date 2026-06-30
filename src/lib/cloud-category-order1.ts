// src/lib/cloud-category-order.ts

import { getCategories, setCategories, updateCategoryOrder } from './cms-storage';
import { toast } from 'sonner';

// Simulate cloud sync for category order
// In a real app, this would call an API endpoint
export async function pullCategoryOrder(email: string): Promise<void> {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if there's a cloud backup for this user
    const cloudKey = `smileflex_cloud_category_order_${email}`;
    const cloudData = localStorage.getItem(cloudKey);
    
    if (cloudData) {
      const order = JSON.parse(cloudData);
      const currentCategories = getCategories();
      
      // Only update if cloud order is different
      const currentOrder = currentCategories.map(c => c.id);
      if (JSON.stringify(currentOrder) !== JSON.stringify(order)) {
        updateCategoryOrder(order);
        console.log(`📡 Category order synced from cloud for ${email}`);
        
        // Dispatch event to notify components
        window.dispatchEvent(new StorageEvent('storage', { 
          key: 'smileflex_categories' 
        }));
      }
    }
  } catch (error) {
    console.warn('Failed to pull category order from cloud:', error);
  }
}

export async function pushCategoryOrder(email: string): Promise<void> {
  try {
    const categories = getCategories();
    const order = categories.map(c => c.id);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Store in cloud backup
    const cloudKey = `smileflex_cloud_category_order_${email}`;
    localStorage.setItem(cloudKey, JSON.stringify(order));
    
    console.log(`☁️ Category order pushed to cloud for ${email}`);
  } catch (error) {
    console.warn('Failed to push category order to cloud:', error);
  }
}

// Sync category order when changes are made
export function syncCategoryOrder(email: string, categoryIds: string[]): void {
  updateCategoryOrder(categoryIds);
  // Push to cloud in background
  pushCategoryOrder(email).catch(console.warn);
}