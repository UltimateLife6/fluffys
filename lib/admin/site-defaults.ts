import { contact, socials } from '@/lib/data';
import { plainText, safeUrl } from '@/lib/admin/security';

export type SiteContent = {
  heroLine: string;
  heroAccent: string;
  heroBody: string;
  aboutParagraphs: string[];
  aboutCloseTitle: string;
  aboutCloseBody: string;
  phoneDisplay: string;
  phoneHref: string;
  email: string;
  instagram: string;
  facebook: string;
  hoursNote: string;
  doordash: string;
  uberEats: string;
  grubhub: string;
};

export const defaultSiteContent: SiteContent = {
  heroLine: 'Bold flavors.',
  heroAccent: 'Big appetites.',
  heroBody:
    "Cajun heat meets Asian-inspired flavor. Discover unforgettable seafood, Korean BBQ bowls, po'boys, and more at Fluffy's Bistro.",
  aboutParagraphs: [
    "Fluffy's Bistro brings two bold culinary worlds together: the comforting heat of Cajun cooking and the vibrant flavors of Asian-inspired cuisine.",
    "From Korean BBQ bowls to Cajun seafood and crispy po'boys, our menu is built around big flavors and satisfying meals.",
    "We're bringing that experience to different communities, one stop at a time.",
  ],
  aboutCloseTitle: 'Good food is worth finding.',
  aboutCloseBody: "Follow Fluffy's Bistro for upcoming stops, or bring the flavor to your next event.",
  phoneDisplay: contact.phoneDisplay,
  phoneHref: contact.phoneHref,
  email: contact.email,
  instagram: socials[0].href,
  facebook: socials[1].href,
  hoursNote: 'A public address and hours are not listed until Fluffy’s confirms them.',
  doordash: '',
  uberEats: '',
  grubhub: '',
};

export function cleanSiteContent(input: SiteContent): SiteContent {
  return {
    ...defaultSiteContent,
    ...input,
    heroLine: input.heroLine.trim() || defaultSiteContent.heroLine,
    heroAccent: input.heroAccent.trim() || defaultSiteContent.heroAccent,
    heroBody: input.heroBody.trim() || defaultSiteContent.heroBody,
    aboutParagraphs: input.aboutParagraphs.map((paragraph) => plainText(paragraph, 2000)).filter(Boolean),
    phoneDisplay: plainText(input.phoneDisplay, 40) || defaultSiteContent.phoneDisplay,
    phoneHref: safeUrl(input.phoneHref.trim() || defaultSiteContent.phoneHref, 'phone') || defaultSiteContent.phoneHref,
    email: input.email.trim() || defaultSiteContent.email,
    instagram: safeUrl(input.instagram.trim()),
    facebook: safeUrl(input.facebook.trim()),
    hoursNote: plainText(input.hoursNote, 500),
    doordash: safeUrl(input.doordash.trim()),
    uberEats: safeUrl(input.uberEats.trim()),
    grubhub: safeUrl(input.grubhub.trim()),
    aboutCloseTitle: input.aboutCloseTitle.trim() || defaultSiteContent.aboutCloseTitle,
    aboutCloseBody: input.aboutCloseBody.trim() || defaultSiteContent.aboutCloseBody,
  };
}
