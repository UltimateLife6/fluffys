import Image from 'next/image';

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({ className = 'brand-logo', priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/brand/fluffys-logo.png"
      alt="Fluffy's Bistro, Cajun Asian Fusion"
      width={1000}
      height={1153}
      priority={priority}
      className={className}
    />
  );
}
