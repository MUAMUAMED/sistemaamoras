import { motion } from 'framer-motion';
import { Heart, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProductPath } from '../../data/catalog';
import { commercialApi } from '../../lib/commercialApi';
import { useCartStore } from '../../store/cart';
import './ProductGrid.css';

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

export function ProductGrid() {
  const addItem = useCartStore((state) => state.addItem);
  const { data, isLoading } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const products = data?.products.slice(0, 4) || [];

  return (
    <section className="product-grid-section" id="produtos">
      <div className="container">
        <motion.div
          className="product-grid-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span>Lancamentos</span>
          <h2>As pecas que acabaram de chegar</h2>
          <p>Uma selecao com vestidos fluidos, conjuntos faceis e detalhes inspirados na logo Amoras.</p>
        </motion.div>

        {isLoading && <p className="product-grid-loading">Carregando pecas publicadas...</p>}
        {!isLoading && products.length === 0 && (
          <p className="product-grid-loading">Nenhuma peca publicada ainda. Publique produtos pelo ERP.</p>
        )}

        <div className="product-grid">
          {products.map((product, index) => (
            <motion.article
              key={product.name}
              className="product-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <Link to={getProductPath(product)} className="product-image-container">
                <img src={product.image} alt={product.name} className="product-image" />
                <span className="product-tag">{product.tag}</span>
              </Link>
              <div className="product-card-actions">
                <button className="product-heart" aria-label={`Favoritar ${product.name}`}>
                  <Heart size={18} />
                </button>
                <button
                  className="product-add-btn"
                  onClick={() => addItem(product, product.sizes[0], product.colors[0])}
                >
                  <ShoppingBag size={18} />
                  <span>Adicionar</span>
                </button>
              </div>
              <div className="product-info">
                <div>
                  <Link to={getProductPath(product)}>
                    <h3 className="product-name">{product.name}</h3>
                  </Link>
                  <p className="product-installments">6x sem juros</p>
                </div>
                <p className="product-price">{formatPrice(product.price)}</p>
                <div className="product-colors" aria-label="Cores disponiveis">
                  {product.colors.map((color) => (
                    <span key={color} style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="product-grid-cta">
          <a className="btn btn-primary" href="/produtos/novidades">Ver toda colecao</a>
          <a className="btn btn-outline" href="/produtos/bazar">Comprar bazar</a>
        </div>
      </div>
    </section>
  );
}
