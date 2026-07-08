import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, CreditCard, RefreshCw, Truck } from 'lucide-react';
import './HeroSection.css';

const heroLooks = [
  {
    title: 'Vestido Jardim',
    subtitle: 'Midi leve para dias de sol',
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1100&q=85',
  },
  {
    title: 'Conjunto Rosa Cha',
    subtitle: 'Look pronto e delicado',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1100&q=85',
  },
  {
    title: 'Blusa Bordado Flor',
    subtitle: 'Detalhes inspirados na logo',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=1100&q=85',
  },
  {
    title: 'Saia Midi Aurora',
    subtitle: 'Movimento suave e feminino',
    image: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=1100&q=85',
  },
];

export function HeroSection() {
  const [activeLook, setActiveLook] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveLook((current) => (current + 1) % heroLooks.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setActiveLook((current) => (current === 0 ? heroLooks.length - 1 : current - 1));
  };

  const goToNext = () => {
    setActiveLook((current) => (current + 1) % heroLooks.length);
  };

  return (
    <section className="hero">
      <div className="hero-shell">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <img className="hero-logo" src="/amoras-logo.png" alt="Amoras Capital" />
          <span className="hero-kicker">Nova colecao autoral</span>
          <h1 className="hero-title">Roupas leves, femininas e cheias de delicadeza</h1>
          <p className="hero-subtitle">
            Vestidos, conjuntos e pecas para dias de sol, encontros especiais e uma rotina com mais cor.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary hero-cta" href="#produtos">
              Comprar novidades <ArrowRight size={18} />
            </a>
            <a className="btn btn-outline" href="#categorias">
              Ver categorias
            </a>
          </div>
          <div className="hero-benefits" aria-label="Beneficios de compra">
            <span><Truck size={17} /> Envio para todo Brasil</span>
            <span><CreditCard size={17} /> Pix e cartao</span>
            <span><RefreshCw size={17} /> Troca facil</span>
          </div>
        </motion.div>

        <motion.div
          className="hero-media"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.35 }}
        >
          <div className="hero-carousel-track">
            {heroLooks.map((look, index) => (
              <img
                key={look.title}
                src={look.image}
                alt={look.title}
                className={index === activeLook ? 'active' : ''}
              />
            ))}
          </div>
          <button className="hero-carousel-btn previous" onClick={goToPrevious} aria-label="Look anterior">
            <ChevronLeft size={22} />
          </button>
          <button className="hero-carousel-btn next" onClick={goToNext} aria-label="Proximo look">
            <ChevronRight size={22} />
          </button>
          <div className="hero-carousel-caption">
            <span>Look {activeLook + 1} de {heroLooks.length}</span>
            <strong>{heroLooks[activeLook].title}</strong>
            <small>{heroLooks[activeLook].subtitle}</small>
          </div>
          <div className="hero-carousel-dots" aria-label="Selecionar look do banner">
            {heroLooks.map((look, index) => (
              <button
                key={look.title}
                className={index === activeLook ? 'active' : ''}
                onClick={() => setActiveLook(index)}
                aria-label={`Ver ${look.title}`}
              />
            ))}
          </div>
          <div className="hero-media-badge">
            <strong>AMORAS10</strong>
            <span>10% off na primeira compra</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
