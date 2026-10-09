export type MenuItem = {
  name: string;
  note?: string;
};

export type MenuCategory = {
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  items: MenuItem[];
};

export const contact = {
  phoneDisplay: '713-281-6764',
  phoneHref: 'tel:+17132816764',
  email: 'info@fluffysbistro.com',
};

export const socials = [
  { name: 'Instagram', href: 'https://www.instagram.com/fluffysbistro/' },
  { name: 'Facebook', href: 'https://www.facebook.com/FluffysBistro/' },
];

export const photos = {
  hero: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=1800&q=80',
  seafood: 'https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?w=1200&q=80',
  sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=1200&q=80',
  bowl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80',
  funnel: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=1200&q=80',
  lemonade: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=1200&q=80',
};

export const categories: MenuCategory[] = [
  {
    name: 'Korean BBQ Bowls',
    description: 'Rice, cabbage, peppers, squash, cucumber, spicy mayo, and Korean BBQ sauce.',
    image: photos.bowl,
    imageAlt: 'Illustrative photo of a rice bowl with vegetables',
    items: [{ name: 'Veggie' }, { name: 'Chicken' }, { name: 'Steak' }, { name: 'Chicken & Steak' }],
  },
  {
    name: 'Seafood',
    description: 'Plates and platters served with Cajun rice and garlic bread.',
    image: photos.seafood,
    imageAlt: 'Illustrative photo of seasoned shrimp',
    items: [
      { name: 'Catfish Plate' },
      { name: 'Shrimp Plate' },
      { name: 'Catfish + Shrimp Plate' },
      { name: 'Catfish Fluffy' },
    ],
  },
  {
    name: 'Po’Boys',
    description: 'Served with seasoned fries.',
    image: photos.sandwich,
    imageAlt: 'Illustrative photo of a filled sandwich',
    items: [{ name: 'Catfish' }, { name: 'Shrimp' }, { name: 'Oyster' }, { name: 'Fluffy' }],
  },
  {
    name: 'Sides',
    description: 'Something extra for the table.',
    image: photos.hero,
    imageAlt: 'Illustrative photo of a shared seafood spread',
    items: [
      { name: 'Cajun Rice', note: 'Made with pork and beef sausage.' },
      { name: 'Red Bean + Rice', note: 'Made with beef sausage and smoked turkey.' },
      { name: 'Fries' },
      { name: 'Chicken Egg Rolls', note: '3 egg rolls with duck sauce.' },
      { name: 'Crawfish Sauce' },
    ],
  },
  {
    name: 'Funnel Cakes',
    description: 'Served with a scoop of ice cream.',
    image: photos.funnel,
    imageAlt: 'Illustrative photo of ice cream, served with the funnel cakes',
    items: [
      { name: 'Classic', note: 'Powdered sugar, whipped cream, and vanilla ice cream.' },
      {
        name: 'Cinnamon Roll',
        note: 'Powdered sugar, cream cheese glaze, caramel, whipped cream, a cinnamon roll, and vanilla ice cream.',
      },
      {
        name: 'Strawberry Cheesecake',
        note: 'Powdered sugar, cream cheese glaze, strawberry drizzle, whipped cream, strawberries, cheesecake, and vanilla ice cream.',
      },
    ],
  },
  {
    name: 'Drinks',
    description: 'Freshly made 24 oz lemonades and frozen refreshments.',
    image: photos.lemonade,
    imageAlt: 'Illustrative photo of a citrus drink',
    items: [
      { name: 'Original Lemonade' },
      { name: 'Raspberry Lemonade' },
      { name: 'Peach Lemonade' },
      { name: 'Island Breeze Lemonade', note: 'Blue coconut and pineapple refresher.' },
      { name: 'Strawberry Lemonade' },
      { name: 'Frozens' },
    ],
  },
];

export const featured = [
  {
    title: 'Korean BBQ Bowls',
    category: 'Korean BBQ Bowls',
    description: categories[0].description,
    image: photos.bowl,
    alt: categories[0].imageAlt,
  },
  {
    title: 'Cajun Seafood',
    category: 'Seafood',
    description: categories[1].description,
    image: photos.seafood,
    alt: categories[1].imageAlt,
  },
  {
    title: 'Po’boys',
    category: 'Po’Boys',
    description: categories[2].description,
    image: photos.sandwich,
    alt: categories[2].imageAlt,
  },
  {
    title: 'Funnel Cakes',
    category: 'Funnel Cakes',
    description: categories[4].description,
    image: photos.funnel,
    alt: categories[4].imageAlt,
  },
  {
    title: 'Specialty Lemonades',
    category: 'Drinks',
    description: categories[5].description,
    image: photos.lemonade,
    alt: categories[5].imageAlt,
  },
];
