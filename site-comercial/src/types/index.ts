// Tipos principais do E-commerce Amoras Capital

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  images: ProductImage[];
  category: Category;
  subcategory?: Subcategory;
  sizes: Size[];
  colors: string[];
  stock: number;
  status: 'active' | 'inactive';
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  order: number;
  isLifestyle: boolean;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
}

export interface Size {
  id: number;
  name: string;
  abbreviation: string;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size: Size;
  color: string;
}

export interface Customer {
  id: number;
  email: string;
  name: string;
  phone?: string;
  addresses: Address[];
  createdAt: string;
}

export interface Address {
  id: number;
  customerId: number;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export interface Order {
  id: number;
  customerId: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: string;
  shippingAddress: Address;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  product: Product;
  quantity: number;
  size: Size;
  color: string;
  price: number;
  subtotal: number;
}

export interface FilterOptions {
  categories?: number[];
  subcategories?: number[];
  priceMin?: number;
  priceMax?: number;
  sizes?: number[];
  colors?: string[];
  search?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
}
