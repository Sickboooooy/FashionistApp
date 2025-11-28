import { Product } from '@/types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Beige Lounge Pants',
    description: 'Ultra-comfortable beige wide-leg lounge pants with a drawstring waist. Perfect for a relaxed yet chic look.',
    price: 89.99,
    imageUrl: '/images/beige-pants.jpg',
    category: 'Bottoms',
    shop_the_look: [
      {
        item_name: 'White Crop Top',
        affiliate_url: '#',
        image_url: 'https://placehold.co/200x200/ffffff/000000?text=Crop+Top'
      }
    ]
  },
  {
    id: '2',
    name: 'Sheer Black Tights',
    description: 'Premium sheer black tights with a fleece lining for warmth and style. A winter wardrobe essential.',
    price: 45.00,
    imageUrl: '/images/black-tights.jpg',
    category: 'Accessories'
  },
  {
    id: '3',
    name: 'Noir Striped Knit Top',
    description: 'Elegant black short-sleeve knit top with delicate white horizontal stripes and textured detailing.',
    price: 65.00,
    imageUrl: '/images/black-striped-top.jpg',
    category: 'Tops'
  },
  {
    id: '4',
    name: 'Ivory Striped Knit Top',
    description: 'Classic ivory short-sleeve knit top with black horizontal stripes. A versatile piece for any occasion.',
    price: 65.00,
    imageUrl: '/images/white-striped-top.jpg',
    category: 'Tops'
  },
  {
    id: '5',
    name: 'Rose Textured Tee',
    description: 'Soft pink textured t-shirt with a relaxed fit. Adds a subtle pop of color and texture to your outfit.',
    price: 55.00,
    imageUrl: '/images/pink-textured-top.jpg',
    category: 'Tops'
  }
];

export const MOCK_GENERATIONS = [
  {
    id: '1',
    imageUrl: '/images/gen-editorial-1.jpg',
    prompt: 'Editorial shot in Paris at sunset',
    date: '2023-10-25',
    likes: 124
  },
  {
    id: '2',
    imageUrl: '/images/gen-editorial-2.jpg',
    prompt: 'Studio lighting, high contrast',
    date: '2023-10-24',
    likes: 89
  },
  {
    id: '3',
    imageUrl: '/images/gen-editorial-1.jpg',
    prompt: 'Urban chic style in Tokyo',
    date: '2023-10-23',
    likes: 256
  }
];
