import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { SearchOverlay } from '../search/SearchOverlay';
import { useCartStore } from '../../store/cart';
import './Header.css';

const navItems = [
  { label: 'Novidades', href: '/produtos/novidades' },
  { label: 'Vestidos', href: '/produtos/vestidos' },
  { label: 'Conjuntos', href: '/produtos/conjuntos' },
  { label: 'Acessorios', href: '/produtos/acessorios' },
  { label: 'Bazar', href: '/produtos/bazar' },
];

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { toggleCart, getItemsCount } = useCartStore();
  const cartItemsCount = getItemsCount();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`header ${isScrolled ? 'header-scrolled' : ''}`}>
      <div className="header-promo">
        <span>10% off na primeira compra com o cupom AMORAS10</span>
        <span>Troca facil em ate 7 dias</span>
        <span>Atendimento pelo WhatsApp</span>
      </div>
      <div className="header-container">
        <button
          className="header-menu-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/" className="header-logo">
          <img src="/amoras-logo.png" alt="Amoras Capital" />
          <span>Amoras Capital</span>
        </Link>

        <nav className="header-nav">
          {navItems.map((item) => (
            <Link key={item.label} to={item.href} className="header-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          <button className="header-icon-btn" aria-label="Buscar" onClick={() => setIsSearchOpen(true)}>
            <Search size={20} />
          </button>
          <button className="header-icon-btn" aria-label="Favoritos">
            <Heart size={20} />
          </button>
          <Link to="/admin" className="header-icon-btn" aria-label="Admin comercial">
            <User size={20} />
          </Link>
          <button
            className="header-icon-btn header-cart-btn"
            onClick={toggleCart}
            aria-label="Carrinho"
          >
            <ShoppingBag size={20} />
            {cartItemsCount > 0 && (
              <span className="header-cart-badge">{cartItemsCount}</span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="header-mobile-menu">
          <nav className="header-mobile-nav">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="header-mobile-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/sobre"
              className="header-mobile-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sobre a marca
            </Link>
          </nav>
        </div>
      )}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}
