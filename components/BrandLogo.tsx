import Image from 'next/image';

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({ className = 'brand-logo', priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand/fluffys-logo-display.png"
      alt="Fluffy's Bistro, Cajun Asian Fusion"
      width={823}
      height={1079}
      priority={priority}
      className={className}
    />
  );
}
