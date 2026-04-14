export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
  category: 'Vegetables' | 'Fruits' | 'Grains' | 'Dairy' | 'Honey' | 'Herbs' | 'Flowers';
  image: string;
  farmerName: string;
  farmerPhoto?: string;
  farmerMobile: string;
  farmLocation: string;
  description: string;
  stock: number;
  coordinates: {
    lat: number;
    lng: number;
  };
  rating: number;
  reviews: Review[];
}

export interface CartItem extends Product {
  quantity: number;
}
