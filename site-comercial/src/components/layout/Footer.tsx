import { ArrowRight, Mail, MessageCircle, Share2 } from 'lucide-react';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-newsletter-panel">
          <div>
            <span>Clube Amoras</span>
            <h2>Receba novidades, bazar e cupons antes de todo mundo</h2>
          </div>
          <form className="footer-newsletter-form">
            <input type="email" placeholder="Seu e-mail" aria-label="Seu e-mail" />
            <button type="submit" aria-label="Cadastrar e-mail">
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/amoras-logo.png" alt="Amoras Capital" />
            <p>
              Moda feminina delicada, leve e comercial para mulheres que gostam de se vestir com cor,
              carinho e personalidade.
            </p>
            <div className="footer-social">
              <a href="#" aria-label="Instagram"><Share2 size={20} /></a>
              <a href="#" aria-label="WhatsApp"><MessageCircle size={20} /></a>
              <a href="#" aria-label="Email"><Mail size={20} /></a>
            </div>
          </div>

          <div className="footer-links">
            <h3>Comprar</h3>
            <a href="/produtos/novidades">Novidades</a>
            <a href="/produtos/vestidos">Vestidos</a>
            <a href="/produtos/conjuntos">Conjuntos</a>
            <a href="/produtos/bazar">Bazar</a>
          </div>

          <div className="footer-links">
            <h3>Ajuda</h3>
            <a href="/contato">Atendimento</a>
            <a href="/contato">Trocas e devolucoes</a>
            <a href="/contato">Prazos de entrega</a>
            <a href="/contato">Formas de pagamento</a>
          </div>

          <div className="footer-links">
            <h3>Marca</h3>
            <a href="/sobre">Sobre a Amoras</a>
            <a href="/sobre">Nossa historia</a>
            <a href="/contato">Seja revendedora</a>
            <a href="/contato">Contato</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 Amoras Capital. Todos os direitos reservados.</p>
          <span>Site comercial em evolucao</span>
        </div>
      </div>
    </footer>
  );
}
