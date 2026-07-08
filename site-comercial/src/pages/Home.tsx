import { HeroSection } from '../components/home/HeroSection';
import { CategoryCarousel } from '../components/home/CategoryCarousel';
import { ProductGrid } from '../components/home/ProductGrid';
import { ManifestoSection } from '../components/home/ManifestoSection';
import { SocialProofSection } from '../components/home/SocialProofSection';
import { Footer } from '../components/layout/Footer';
import './Home.css';

export function Home() {
  return (
    <div className="home">
      <HeroSection />
      <CategoryCarousel />
      <ProductGrid />
      <ManifestoSection />
      <SocialProofSection />
      <Footer />
    </div>
  );
}
