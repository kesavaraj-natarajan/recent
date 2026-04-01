/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const PRODUCT_IMAGE_MAPPING: Record<string, string> = {
  'aloe vera': 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&q=80&w=800',
  'tomato': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
  'apple': 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&q=80&w=800',
  'honey': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
  'milk': 'https://images.unsplash.com/photo-1563636619-e9108b455242?auto=format&fit=crop&q=80&w=800',
  'wheat': 'https://images.unsplash.com/photo-1501430654243-c93fce111d99?auto=format&fit=crop&q=80&w=800',
  'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
  'basil': 'https://images.unsplash.com/photo-1618375531912-97cc58584191?auto=format&fit=crop&q=80&w=800',
  'mint': 'https://images.unsplash.com/photo-1594761053847-d56023b8e768?auto=format&fit=crop&q=80&w=800',
  'spinach': 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
  'carrot': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&q=80&w=800',
  'potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=800',
  'onion': 'https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=800',
  'garlic': 'https://images.unsplash.com/photo-1589927986089-35812388d1f4?auto=format&fit=crop&q=80&w=800',
  'ginger': 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=800',
  'turmeric': 'https://images.unsplash.com/photo-1615485242231-8286bc92e9c2?auto=format&fit=crop&q=80&w=800',
};

const CATEGORY_IMAGE_MAPPING: Record<string, string> = {
  'vegetables': 'https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?auto=format&fit=crop&q=80&w=800',
  'fruits': 'https://images.unsplash.com/photo-1619566636858-adb3ef26400b?auto=format&fit=crop&q=80&w=800',
  'grains': 'https://images.unsplash.com/photo-1501430654243-c93fce111d99?auto=format&fit=crop&q=80&w=800',
  'dairy': 'https://images.unsplash.com/photo-1550583724-125581f77833?auto=format&fit=crop&q=80&w=800',
  'honey': 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
  'herbs': 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&q=80&w=800',
};

export function getDefaultProductImage(name: string, category?: string): string {
  const lowerName = name.toLowerCase();
  
  // 1. Check for direct name matches
  for (const [key, url] of Object.entries(PRODUCT_IMAGE_MAPPING)) {
    if (lowerName.includes(key)) {
      return url;
    }
  }

  // 2. Check for category matches if provided
  if (category) {
    const lowerCategory = category.toLowerCase();
    if (CATEGORY_IMAGE_MAPPING[lowerCategory]) {
      return CATEGORY_IMAGE_MAPPING[lowerCategory];
    }
  }

  // 3. Fallback to picsum with name as seed
  return `https://picsum.photos/seed/${encodeURIComponent(name || 'product')}/800/600`;
}
