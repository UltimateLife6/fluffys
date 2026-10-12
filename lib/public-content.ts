import { categories as staticCategories, contact, featured as staticFeatured, socials } from '@/lib/data';
import { activePromotions, publishedMenu, publishedPackages, publishedSite, publishedStops } from '@/lib/admin/gateway';
import { defaultSiteContent, type SiteContent } from '@/lib/admin/site-defaults';

export async function getPublicMenu(preview = false) {
  try {
    return (await publishedMenu(preview)) ?? staticCategories;
  } catch {
    return staticCategories;
  }
}

export async function getPublicSite(): Promise<SiteContent> {
  try {
    return (await publishedSite()) ?? defaultSiteContent;
  } catch {
    return defaultSiteContent;
  }
}

export async function getPublicStops() {
  try {
    return await publishedStops();
  } catch {
    return [];
  }
}

export async function getPublicPromotions() {
  try {
    return await activePromotions();
  } catch {
    return [];
  }
}

export async function getPublicPackages() {
  try {
    return await publishedPackages();
  } catch {
    return [];
  }
}

export async function getFeaturedCards() {
  const menu = await getPublicMenu();
  if (menu === staticCategories) return staticFeatured;
  return staticFeatured
    .map((card) => {
      const category = menu.find((entry) => entry.name === card.category);
      if (!category) return null;
      return {
        ...card,
        description: category.description,
        image: category.image,
        alt: category.imageAlt,
        imagePosition: category.imagePosition,
      };
    })
    .filter((card) => card !== null);
}

export async function getContact() {
  const site = await getPublicSite();
  return {
    phoneDisplay: site.phoneDisplay || contact.phoneDisplay,
    phoneHref: site.phoneHref || contact.phoneHref,
    email: site.email || contact.email,
    instagram: site.instagram || socials[0].href,
    facebook: site.facebook || socials[1].href,
    doordash: site.doordash,
    uberEats: site.uberEats,
    grubhub: site.grubhub,
  };
}
