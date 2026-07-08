import { Link } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { getProductPath } from '../../data/catalog';
import { useCartStore } from '../../store/cart';
import './CartDrawer.css';

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, getTotal } = useCartStore();
  const total = getTotal();

  return (
    <>
      <div className={`cart-backdrop ${isOpen ? 'open' : ''}`} onClick={closeCart} />
      <aside className={`cart-drawer ${isOpen ? 'open' : ''}`} aria-hidden={!isOpen}>
        <header className="cart-drawer-header">
          <div>
            <span>Sacola Amoras</span>
            <h2>{items.length ? `${items.length} item(ns)` : 'Sua sacola esta vazia'}</h2>
          </div>
          <button onClick={closeCart} aria-label="Fechar sacola">
            <X size={22} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={42} />
            <strong>Escolha suas pecas favoritas</strong>
            <p>Vestidos, conjuntos e acessorios entram aqui antes do checkout.</p>
            <Link to="/produtos/novidades" onClick={closeCart}>Ver novidades</Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <Link to={getProductPath(item.product)} onClick={closeCart}>
                    <img src={item.product.image} alt={item.product.name} />
                  </Link>
                  <div className="cart-item-info">
                    <Link to={getProductPath(item.product)} onClick={closeCart}>
                      <strong>{item.product.name}</strong>
                    </Link>
                    <span>Tam. {item.size}</span>
                    <span className="cart-item-color">
                      Cor <i style={{ backgroundColor: item.color }} />
                    </span>
                    <div className="cart-item-bottom">
                      <div className="cart-quantity">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Diminuir">
                          <Minus size={14} />
                        </button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Aumentar">
                          <Plus size={14} />
                        </button>
                      </div>
                      <b>{formatPrice(item.product.price * item.quantity)}</b>
                    </div>
                  </div>
                  <button className="cart-remove" onClick={() => removeItem(item.id)} aria-label="Remover item">
                    <Trash2 size={17} />
                  </button>
                </article>
              ))}
            </div>

            <footer className="cart-summary">
              <div>
                <span>Subtotal</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <p>Frete e cupom calculados no fechamento do pedido.</p>
              <button>Finalizar pedido</button>
              <Link to="/produtos/novidades" onClick={closeCart}>Continuar comprando</Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
