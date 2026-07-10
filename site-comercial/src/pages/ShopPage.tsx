import { Link, useParams } from 'react-router-dom';
import { Heart, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Footer } from '../components/layout/Footer';
import {
  categoryDescriptions,
  categoryLabels,
  getProductPath,
} from '../data/catalog';
import { commercialApi } from '../lib/commercialApi';
import { useCartStore } from '../store/cart';
import './ShopPage.css';

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;
const productExcerpt = (value: string) => {
  const clean = value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .find((block) => block.trim().length > 90)
    ?.trim() || value.trim();

  return clean.length > 132 ? `${clean.slice(0, 132).trim()}...` : clean;
};

export function ShopPage() {
  const { categorySlug } = useParams();
  const addItem = useCartStore((state) => state.addItem);
  const { data, isLoading } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const categories = data?.categories || [];
  const activeCategory = categorySlug || 'novidades';
  const products =
    activeCategory === 'novidades'
      ? data?.products || []
      : (data?.products || []).filter((product) => product.category === activeCategory);
  const activeCategoryData = categories.find((category) => category.slug === activeCategory);
  const activeTitle = activeCategoryData?.name || categoryLabels[activeCategory] || 'Novidades';
  const activeDescription =
    activeCategoryData?.description ||
    categoryDescriptions[activeCategory] ||
    'Pecas publicadas no site comercial com preco, tamanho e estoque sincronizados pelo ERP.';

  return (
    <div className="shop-page">
      <section className="shop-hero">
        <div className="container shop-hero-grid">
          <div>
            <span className="shop-kicker">Loja Amoras Capital</span>
            <h1>{activeTitle}</h1>
            <p>{activeDescription}</p>
          </div>
          <div className="shop-hero-card">
            <img src="/amoras-logo.png" alt="Amoras Capital" />
            <strong>AMORAS10</strong>
            <span>10% off na primeira compra</span>
          </div>
        </div>
      </section>

      <section className="shop-content">
        <div className="container">
          <div className="shop-toolbar">
            <nav className="shop-tabs" aria-label="Categorias">
              <Link to="/produtos/novidades" className={activeCategory === 'novidades' ? 'active' : ''}>
                Novidades
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/produtos/${category.slug}`}
                  className={category.slug === activeCategory ? 'active' : ''}
                >
                  {category.name}
                </Link>
              ))}
            </nav>
            <button className="shop-filter-btn">
              <SlidersHorizontal size={18} />
              Filtros
            </button>
          </div>

          {isLoading && <p className="shop-empty">Carregando catalogo comercial...</p>}
          {!isLoading && products.length === 0 && (
            <p className="shop-empty">Nenhuma peca publicada nesta categoria ainda.</p>
          )}

          <div className="shop-grid">
            {products.map((product) => (
              <article className="shop-product-card" key={product.id}>
                <Link to={getProductPath(product)} className="shop-product-image">
                  <img src={product.image} alt={product.name} />
                  <span>{product.tag}</span>
                </Link>
                <div className="shop-product-info">
                  <div className="shop-product-title-row">
                    <Link to={getProductPath(product)}>
                      <h2>{product.name}</h2>
                    </Link>
                    <button aria-label={`Favoritar ${product.name}`}>
                      <Heart size={18} />
                    </button>
                  </div>
                  <p>{product.shortDescription || productExcerpt(product.description)}</p>
                  <div className="shop-product-price">
                    <strong>{formatPrice(product.price)}</strong>
                    {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
                  </div>
                  <div className="shop-product-colors">
                    {product.colors.map((color) => (
                      <i key={color} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <button
                    className="shop-buy-btn"
                    onClick={() => addItem(product, product.sizes[0], product.colors[0])}
                  >
                    <ShoppingBag size={18} />
                    Adicionar a sacola
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
