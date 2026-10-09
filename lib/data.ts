export type MenuItem = {
  name: string;
  note?: string;
};

export type MenuCategory = {
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  imagePosition?: string;
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
  hero: '/food/cajun-seafood.jpg',
  seafood: '/food/cajun-seafood.jpg',
  sandwich: '/food/poboy.jpg',
  bowl: '/food/korean-bbq-bowl.jpg',
  funnel: '/food/funnel-cake.jpg',
  lemonade: '/food/lemonade.jpg',
  sides: '/food/sides.jpg',
};

export const photoCredit =
  "Food photos are illustrative placeholders, not pictures of dishes from Fluffy's Bistro. Bowl, seafood, lemonade, and rice photos are from Unsplash. Funnel cake by Benny Mazur, CC BY 2.0. Shrimp po'boy by Kent Wang, CC BY-SA 2.0, via Wikimedia Commons.";

export const categories: MenuCategory[] = [
  {
    name: 'Korean BBQ Bowls',
    description: 'Rice, cabbage, peppers, squash, cucumber, spicy mayo, and Korean BBQ sauce.',
    image: photos.bowl,
    imageAlt: 'Illustrative photo of a rice bowl with beef, vegetables, and sauce',
    imagePosition: 'center 72%',
    items: [{ name: 'Veggie' }, { name: 'Chicken' }, { name: 'Steak' }, { name: 'Chicken & Steak' }],
  },
  {
    name: 'Seafood',
    description: 'Plates and platters served with Cajun rice and garlic bread.',
    image: photos.seafood,
    imageAlt: 'Illustrative photo of shrimp and rice in a seasoned sauce',
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
    imageAlt: "Illustrative photo of a shrimp po'boy on French bread",
    imagePosition: 'center 42%',
    items: [{ name: 'Catfish' }, { name: 'Shrimp' }, { name: 'Oyster' }, { name: 'Fluffy' }],
  },
  {
    name: 'Sides',
    description: 'Something extra for the table.',
    image: photos.sides,
    imageAlt: 'Illustrative photo of a seasoned rice plate',
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
    imageAlt: 'Illustrative photo of a funnel cake dusted with powdered sugar',
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
    imageAlt: 'Illustrative photo of colorful fruit drinks with citrus and ice',
    imagePosition: 'center 35%',
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
    imagePosition: categories[0].imagePosition,
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
    imagePosition: categories[2].imagePosition,
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
    imagePosition: categories[5].imagePosition,
  },
];
