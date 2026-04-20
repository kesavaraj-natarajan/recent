import { Product } from './types';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Organic Desi Tomatoes',
    price: 45,
    unit: 'kg',
    category: 'Vegetables',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Kisan Seva Farm',
    farmerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43210',
    farmLocation: 'Nashik, Maharashtra',
    description: 'Sun-ripened desi tomatoes grown without synthetic pesticides. Sweet and tangy.',
    stock: 25,
    coordinates: { lat: 19.9975, lng: 73.7898 },
    rating: 4.8,
    reviews: [
      { id: 'r1', userName: 'Rahul M.', rating: 5, comment: 'Best tomatoes I\'ve ever had!', date: '2026-03-01' },
      { id: 'r2', userName: 'Anjali D.', rating: 4, comment: 'Very fresh and tasty.', date: '2026-03-05' }
    ]
  },
  {
    id: '2',
    name: 'Fresh Shimla Apples',
    price: 140,
    unit: 'kg',
    category: 'Fruits',
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Himalayan Orchards',
    farmerPhoto: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43211',
    farmLocation: 'Shimla, HP',
    description: 'Crisp and sweet Shimla apples, harvested just yesterday.',
    stock: 50,
    coordinates: { lat: 31.1048, lng: 77.1734 },
    rating: 4.5,
    reviews: [
      { id: 'r3', userName: 'Priya W.', rating: 5, comment: 'Super crisp!', date: '2026-03-02' }
    ]
  },
  {
    id: '3',
    name: 'Raw Forest Honey',
    price: 350,
    unit: 'jar',
    category: 'Honey',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Coorg Bee Apiary',
    farmerPhoto: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43212',
    farmLocation: 'Coorg, Karnataka',
    description: 'Unfiltered, raw honey from Western Ghats wildflowers. Rich in enzymes and flavor.',
    stock: 15,
    coordinates: { lat: 12.3375, lng: 75.8069 },
    rating: 4.9,
    reviews: [
      { id: 'r4', userName: 'Vikram B.', rating: 5, comment: 'Incredible flavor profile.', date: '2026-03-08' }
    ]
  },
  {
    id: '4',
    name: 'Farm Fresh Desi Eggs',
    price: 180,
    unit: 'dozen',
    category: 'Dairy',
    image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Pavitra Farms',
    farmerPhoto: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43213',
    farmLocation: 'Pune, Maharashtra',
    description: 'Deep orange yolks from hens that roam free on green pastures.',
    stock: 20,
    coordinates: { lat: 18.5204, lng: 73.8567 },
    rating: 4.7,
    reviews: [
      { id: 'r5', userName: 'Sneha K.', rating: 5, comment: 'The yolks are so vibrant!', date: '2026-03-07' }
    ]
  },
  {
    id: '5',
    name: 'Organic Fresh Palak',
    price: 30,
    unit: 'bunch',
    category: 'Vegetables',
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Kisan Seva Farm',
    farmerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43210',
    farmLocation: 'Nashik, Maharashtra',
    description: 'Tender baby spinach leaves, triple-washed and ready to eat.',
    stock: 30,
    coordinates: { lat: 19.9975, lng: 73.7898 },
    rating: 4.2,
    reviews: [
      { id: 'r6', userName: 'Amit R.', rating: 4, comment: 'Very clean and fresh.', date: '2026-03-09' }
    ]
  },
  {
    id: '6',
    name: 'Artisan Whole Wheat Pav',
    price: 60,
    unit: 'pack',
    category: 'Grains',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Desi Bakers',
    farmerPhoto: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43214',
    farmLocation: 'Bangalore, KA',
    description: 'Naturally leavened whole wheat pav with a perfect crust and soft crumb.',
    stock: 10,
    coordinates: { lat: 12.9716, lng: 77.5946 },
    rating: 4.6,
    reviews: [
      { id: 'r7', userName: 'Arjun S.', rating: 5, comment: 'Perfect crust!', date: '2026-03-10' }
    ]
  },
  {
    id: '7',
    name: 'Fresh Organic Basil',
    price: 40,
    unit: 'bunch',
    category: 'Herbs',
    image: 'https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Green Valley Herbs',
    farmerPhoto: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43215',
    farmLocation: 'Ooty, Tamil Nadu',
    description: 'Aromatic sweet basil leaves, perfect for pesto or garnishing.',
    stock: 20,
    coordinates: { lat: 11.4102, lng: 76.6991 },
    rating: 4.9,
    reviews: [
      { id: 'r8', userName: 'Meera K.', rating: 5, comment: 'Smells amazing!', date: '2026-03-11' }
    ]
  },
  {
    id: '8',
    name: 'Fresh Curry Leaves',
    price: 15,
    unit: 'bunch',
    category: 'Herbs',
    image: 'https://images.unsplash.com/photo-1567375698348-5d9d5ae99de0?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Chennai Greens',
    farmerPhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43216',
    farmLocation: 'Chennai, Tamil Nadu',
    description: 'Freshly picked aromatic curry leaves from local gardens.',
    stock: 50,
    coordinates: { lat: 13.0827, lng: 80.2707 },
    rating: 4.8,
    reviews: [
      { id: 'r9', userName: 'Karthik R.', rating: 5, comment: 'Very fresh!', date: '2026-03-12' }
    ]
  },
  {
    id: '9',
    name: 'Madurai Malli (Jasmine)',
    price: 120,
    unit: 'string',
    category: 'Flowers',
    image: 'https://images.unsplash.com/photo-1592751433068-18567f8b9e6e?auto=format&fit=crop&q=80&w=800',
    farmerName: 'Madurai Florals',
    farmerPhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150',
    farmerMobile: '+91 98765 43217',
    farmLocation: 'Madurai, Tamil Nadu',
    description: 'Fragrant Madurai jasmine flowers, freshly strung.',
    stock: 30,
    coordinates: { lat: 9.9252, lng: 78.1198 },
    rating: 5.0,
    reviews: [
      { id: 'r10', userName: 'Lakshmi S.', rating: 5, comment: 'Beautiful fragrance.', date: '2026-03-13' }
    ]
  }
];
