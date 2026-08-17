import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, CreditCard, RefreshCw, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { commercialApi } from '../../lib/commercialApi';
import './HeroSection.css';

export function HeroSection() {
  const [activeLook, setActiveLook] = useState(0);
  const { data, isLoading } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const heroLooks = data?.products.slice(0, 4) || [];

  useEffect(() => {
    if (heroLooks.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveLook((current) => (current + 1) % heroLooks.length);
    }, 2600);

    return () => window.clearInterval(timer);
  }, [heroLooks.length]);

  useEffect(() => {
    if (activeLook >= heroLooks.length) {
      setActiveLook(0);
    }
  }, [activeLook, heroLooks.length]);

  const goToPrevious = () => {
    if (!heroLooks.length) return;
    setActiveLook((current) => (current === 0 ? heroLooks.length - 1 : current - 1));
  };

  const goToNext = () => {
    if (!heroLooks.length) return;
    setActiveLook((current) => (current + 1) % heroLooks.length);
  };

  const heroStyle = {
    '--hero-bg-image': heroLooks[activeLook]?.image ? `url("${heroLooks[activeLook].image}")` : 'none',
  } as CSSProperties;

  return (
    <section className="hero" style={heroStyle}>
      <div className="hero-shell">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <img className="hero-logo" src="/amoras-logo.png" alt="Amoras Capital" />
          <span className="hero-kicker">Catalogo sincronizado</span>
          <h1 className="hero-title">Pecas publicadas diretamente do sistema Amoras</h1>
          <p className="hero-subtitle">
            A vitrine mostra somente roupas cadastradas e publicadas no banco, com preco e estoque vindo do ERP.
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
          {heroLooks.length > 0 ? (
            <>
              <div className="hero-carousel-track">
                {heroLooks.map((look, index) => (
                  <div
                    key={look.id}
                    className={`hero-carousel-slide ${index === activeLook ? 'active' : ''}`}
                  >
                    <img className="hero-carousel-blur" src={look.image} alt="" aria-hidden="true" />
                    <img className="hero-carousel-main" src={look.image} alt={look.name} />
                  </div>
                ))}
              </div>
              <button className="hero-carousel-btn previous" onClick={goToPrevious} aria-label="Look anterior">
                <ChevronLeft size={22} />
              </button>
              <button className="hero-carousel-btn next" onClick={goToNext} aria-label="Proximo look">
                <ChevronRight size={22} />
              </button>
              <div className="hero-carousel-caption">
                <span>Produto {activeLook + 1} de {heroLooks.length}</span>
                <strong>{heroLooks[activeLook]?.name}</strong>
                <small>{heroLooks[activeLook]?.shortDescription || heroLooks[activeLook]?.categoryName}</small>
              </div>
              <div className="hero-carousel-dots" aria-label="Selecionar produto do banner">
                {heroLooks.map((look, index) => (
                  <button
                    key={look.id}
                    className={index === activeLook ? 'active' : ''}
                    onClick={() => setActiveLook(index)}
                    aria-label={`Ver ${look.name}`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="hero-empty-state">
              <img src="/amoras-logo.png" alt="Amoras Capital" />
              <strong>{isLoading ? 'Carregando catalogo...' : 'Nenhuma roupa publicada ainda'}</strong>
              <span>Quando um produto for publicado pelo ERP, ele aparece aqui automaticamente.</span>
            </div>
          )}
          <div className="hero-media-badge">
            <strong>AMORAS10</strong>
            <span>10% off na primeira compra</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
