import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Flame, MapPin, UtensilsCrossed } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { featured, photos, socials } from '@/lib/data';

export default function Home() {
  const instagram = socials[0];

  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="script-accent">Cajun Asian Fusion</p>
            <h1>
              Bold flavors.
              <span>Big appetites.</span>
            </h1>
            <p>
              Cajun heat meets Asian-inspired flavor. Discover unforgettable seafood, Korean BBQ bowls, po&apos;boys, and
              more at Fluffy&apos;s Bistro.
            </p>
            <div className="button-row">
              <Link href="/menu" className="button primary">
                Explore Our Menu <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link href="/catering" className="button secondary">
                Book Catering
              </Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <Image
                src={photos.hero}
                alt="Illustrative photo of a seafood boil with shrimp, corn, and sausage"
                fill
                priority
                sizes="(max-width: 800px) 100vw, 50vw"
              />
            </div>
            <BrandLogo className="hero-logo" />
          </div>
        </div>
      </section>

      <section className="flavor-band" aria-label="Brand highlights">
        <div className="shell">
          <span>Fun</span>
          <span>Flavor</span>
          <span>Fusion</span>
          <span>Freshness</span>
        </div>
      </section>

      <section className="section shell">
        <div className="section-top">
          <div>
            <p className="kicker">The good stuff</p>
            <h2>
              Flavor that <em>hits.</em>
            </h2>
          </div>
          <Link href="/menu" className="text-link">
            Full menu <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="feature-grid">
          {featured.map((item) => (
            <Link
              href={`/menu?category=${encodeURIComponent(item.category)}`}
              className="feature-card"
              key={item.title}
            >
              <div className="feature-photo">
                <Image src={item.image} alt={item.alt} fill sizes="(max-width: 700px) 100vw, 33vw" />
              </div>
              <div className="feature-body">
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <p className="photo-note">
          Food images are illustrative placeholders. Replace them with Fluffy&apos;s own photography before launch.
        </p>
      </section>

      <section className="catering-band">
        <div className="shell catering-band-inner">
          <div>
            <p className="kicker">Let&apos;s make it an event</p>
            <h2>Bring the flavor to your next event!</h2>
            <p>Planning a party, celebration, or company gathering? Ask us about catering.</p>
          </div>
          <Link href="/catering" className="button primary">
            Start a catering inquiry <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="section shell">
        <div className="find-band">
          <div className="find-band-copy">
            <p className="kicker">Find your next bite</p>
            <h2>We bring the flavor to you.</h2>
            <p>Great food has no fixed address yet. Catch Fluffy&apos;s Bistro on the move and check in for the next stop.</p>
            <div className="info-line">
              <MapPin size={22} aria-hidden="true" />
              <div>
                <strong>New location coming soon</strong>
                <span>No confirmed public stops are listed. The weekly schedule is posted on Instagram.</span>
              </div>
            </div>
            <div className="button-row">
              <Link className="button primary" href="/find-us">
                Where to find us
              </Link>
              <a className="button secondary" href={instagram.href} target="_blank" rel="noopener noreferrer">
                Instagram schedule
              </a>
            </div>
          </div>
          <div className="find-mascot">
            <BrandLogo className="find-logo" />
          </div>
        </div>
      </section>

      <section className="section shell values">
        <div className="value">
          <Flame aria-hidden="true" />
          <strong>Bold flavors</strong>
          <span>Cajun heat with Asian-inspired plates.</span>
        </div>
        <div className="value">
          <UtensilsCrossed aria-hidden="true" />
          <strong>Made fresh</strong>
          <span>Bowls, seafood, po&apos;boys, and sweets.</span>
        </div>
        <div className="value">
          <MapPin aria-hidden="true" />
          <strong>On the move</strong>
          <span>Follow along for the next stop.</span>
        </div>
      </section>
    </>
  );
}
