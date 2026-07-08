import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CreditCard, Heart, Minus, Plus, Ruler, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { Footer } from '../components/layout/Footer';
import { getProductPath } from '../data/catalog';
import { commercialApi } from '../lib/commercialApi';
import { useCartStore } from '../store/cart';
import './ProductDetail.css';

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

export function ProductDetail() {
  const { productSlug } = useParams();
  const { data: product, isLoading } = useQuery({
    queryKey: ['commercial-product', productSlug],
    queryFn: () => commercialApi.productBySlug(productSlug || ''),
    enabled: Boolean(productSlug),
  });
  const { data: catalog } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const addItem = useCartStore((state) => state.addItem);
  const [selectedImage, setSelectedImage] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!product) return;
    setSelectedImage(product.gallery[0]);
    setSelectedColor(product.colors[0]);
    setSelectedSize(product.sizes[0]);
  }, [product]);

  const relatedProducts = useMemo(
    () => {
      if (!product) return [];
      return (catalog?.products || [])
        .filter((item) => item.category === product.category && item.id !== product.id)
        .slice(0, 3);
    },
    [catalog?.products, product]
  );

  if (isLoading || !product) {
    return (
      <div className="product-detail-page">
        <section className="product-detail">
          <div className="container">
            <p className="product-loading">Carregando peca comercial...</p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <section className="product-detail">
        <div className="container">
          <Link className="product-back-link" to={`/produtos/${product.category}`}>
            <ArrowLeft size={18} />
            Voltar para categoria
          </Link>

          <div className="product-detail-grid">
            <div className="product-gallery">
              <div className="product-main-image">
                <img src={selectedImage} alt={product.name} />
                <span>{product.tag}</span>
              </div>
              <div className="product-thumbs" aria-label="Fotos do produto">
                {product.gallery.map((image) => (
                  <button
                    key={image}
                    className={image === selectedImage ? 'active' : ''}
                    onClick={() => setSelectedImage(image)}
                    aria-label={`Ver foto de ${product.name}`}
                  >
                    <img src={image} alt="" />
                  </button>
                ))}
              </div>
            </div>

            <aside className="product-panel">
              <span className="product-category">Amoras Capital</span>
              <h1>{product.name}</h1>
              <p className="product-description">{product.description}</p>

              <div className="product-price-row">
                <strong>{formatPrice(product.price)}</strong>
                {product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}
                <span>6x sem juros</span>
              </div>

              <div className="product-option">
                <div className="product-option-title">
                  <strong>Cor</strong>
                  <span style={{ backgroundColor: selectedColor }} />
                </div>
                <div className="product-color-list">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      className={color === selectedColor ? 'active' : ''}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  ))}
                </div>
              </div>

              <div className="product-option">
                <div className="product-option-title">
                  <strong>Tamanho</strong>
                  <a href="#medidas"><Ruler size={16} /> Guia de medidas</a>
                </div>
                <div className="product-size-list">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      className={size === selectedSize ? 'active' : ''}
                      onClick={() => setSelectedSize(size)}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="product-quantity">
                <strong>Quantidade</strong>
                <div>
                  <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Diminuir quantidade">
                    <Minus size={16} />
                  </button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity((value) => value + 1)} aria-label="Aumentar quantidade">
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="product-actions">
                <button
                  className="product-add-main"
                  onClick={() => addItem(product, selectedSize, selectedColor, quantity)}
                >
                  <ShoppingBag size={20} />
                  Adicionar a sacola
                </button>
                <button className="product-favorite" aria-label="Favoritar produto">
                  <Heart size={20} />
                </button>
              </div>

              <div className="product-service-list">
                <span><Truck size={18} /> Envio para todo Brasil</span>
                <span><CreditCard size={18} /> Pix, credito e parcelamento</span>
                <span><ShieldCheck size={18} /> Troca facil em ate 7 dias</span>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="product-info-section">
        <div className="container product-info-grid">
          <div>
            <h2>Detalhes da peca</h2>
            <ul>
              {product.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </div>

          <div id="medidas">
            <h2>Especificacoes</h2>
            <dl>
              {Object.entries(product.specs).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="product-related">
          <div className="container">
            <div className="product-related-header">
              <span>Combine tambem</span>
              <h2>Outras pecas da categoria</h2>
            </div>
            <div className="product-related-grid">
              {relatedProducts.map((item) => (
                <Link to={getProductPath(item)} className="product-related-card" key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <strong>{item.name}</strong>
                  <span>{formatPrice(item.price)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
