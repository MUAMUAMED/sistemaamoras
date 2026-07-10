import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getProductPath } from '../../data/catalog';
import { commercialApi } from '../../lib/commercialApi';
import './SearchOverlay.css';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const productExcerpt = (value: string) => {
  const clean = value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .find((block) => block.trim().length > 90)
    ?.trim() || value.trim();

  return clean.length > 96 ? `${clean.slice(0, 96).trim()}...` : clean;
};

export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const { data } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const results = useMemo(() => {
    const products = data?.products || [];
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return products.slice(0, 4);
    }

    return products.filter((product) =>
      `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(normalized)
    );
  }, [data?.products, query]);

  return (
    <div className={`search-overlay ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
      <div className="search-panel">
        <header>
          <div>
            <span>Busca rapida</span>
            <h2>Encontre sua proxima peca</h2>
          </div>
          <button onClick={onClose} aria-label="Fechar busca">
            <X size={22} />
          </button>
        </header>

        <label className="search-input">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busque por vestido, conjunto, bolsa..."
            autoFocus={isOpen}
          />
        </label>

        <div className="search-results">
          {results.map((product) => (
            <Link to={getProductPath(product)} key={product.id} onClick={onClose}>
              <img src={product.image} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <span>{product.shortDescription || productExcerpt(product.description)}</span>
              </div>
              <b>{formatPrice(product.price)}</b>
            </Link>
          ))}
          {results.length === 0 && (
            <p className="search-empty">Nada encontrado. Tente buscar por vestido, conjunto ou acessorio.</p>
          )}
        </div>
      </div>
    </div>
  );
}
