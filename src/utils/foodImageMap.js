/**
 * High-quality food photography fallback mapper for menu items
 * Prioritizes item's custom image_url if present; otherwise intelligently matches
 * dish name, description, or category to appetizing food photography.
 */

const FOOD_IMAGE_CATALOG = [
  // Paneer dishes
  {
    keywords: ['paneer butter', 'butter masala', 'shahi paneer', 'paneer makhani'],
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['kadhai paneer', 'kadai paneer', 'paneer kadhai'],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['paneer tikka', 'tandoori paneer', 'paneer starter'],
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['paneer', 'cottage cheese'],
    url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&auto=format&fit=crop&q=80',
  },

  // Soups
  {
    keywords: ['tomato soup', 'cream of tomato'],
    url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['sweet corn', 'corn soup'],
    url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['hot & sour', 'hot and sour', 'manchow', 'soup'],
    url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400&auto=format&fit=crop&q=80',
  },

  // Lentils & Dal
  {
    keywords: ['dal makhani', 'makhani imperial', 'dal makhni', 'black lentil'],
    url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['dal', 'tadka', 'yellow dal', 'daal', 'chana'],
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&auto=format&fit=crop&q=80',
  },

  // Chicken & Meat
  {
    keywords: ['butter chicken', 'murgh makhani', 'smoked butter chicken'],
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['tandoori chicken', 'chicken tikka', 'chicken', 'murgh', 'mutton', 'kebab'],
    url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80',
  },

  // Seafood & Prawns
  {
    keywords: ['prawn', 'prawns', 'shrimp', 'chili garlic prawn', 'fish'],
    url: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=400&auto=format&fit=crop&q=80',
  },

  // Breads / Naan / Roti
  {
    keywords: ['naan', 'butter naan', 'garlic naan', 'roti', 'paratha', 'kulcha', 'bread', 'tandoori roti'],
    url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&auto=format&fit=crop&q=80',
  },

  // Biryani & Rice
  {
    keywords: ['biryani', 'dum biryani', 'pulao', 'fried rice', 'jeera rice', 'steamed rice'],
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80',
  },

  // Starters & Snacks
  {
    keywords: ['tikka', 'tandoori', 'crispy', 'starter', 'appetizer', 'snack'],
    url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['momo', 'momos', 'dimsum', 'dumpling'],
    url: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['pizza', 'margherita', 'cheese pizza', 'crust'],
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['burger', 'sandwich', 'french fries', 'fries', 'wrap'],
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['pasta', 'noodles', 'chowmein', 'spaghetti', 'alfredo', 'arrabbiata'],
    url: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281782?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['salad', 'healthy', 'sprouts', 'raita'],
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80',
  },

  // Beverages & Mocktails
  {
    keywords: ['mango', 'crush', 'smoothie', 'shake', 'milkshake', 'mango basil'],
    url: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['shikanji', 'saffron', 'lemonade', 'cooler', 'mojito', 'mocktail', 'lime soda', 'drink', 'beverage'],
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['coffee', 'cold coffee', 'tea', 'chai', 'latte', 'cappuccino'],
    url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80',
  },

  // Desserts & Sweets
  {
    keywords: ['gulab jamun', 'rasgulla', 'sweet', 'dessert', 'halwa', 'ice cream', 'brownie', 'kulfi'],
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&auto=format&fit=crop&q=80',
  },
];

export const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80';

/**
 * Returns a high-res image URL for a food item.
 * @param {object} item - Menu item object with name, description, category, and optional image_url
 * @returns {string} - Image URL
 */
export function getFoodImage(item) {
  if (item?.image_url && typeof item.image_url === 'string' && item.image_url.trim().length > 5) {
    return item.image_url.trim();
  }

  const searchableText = `${item?.name || ''} ${item?.description || ''} ${item?.category || ''}`.toLowerCase();

  for (const entry of FOOD_IMAGE_CATALOG) {
    if (entry.keywords.some((kw) => searchableText.includes(kw))) {
      return entry.url;
    }
  }

  return DEFAULT_FOOD_IMAGE;
}
