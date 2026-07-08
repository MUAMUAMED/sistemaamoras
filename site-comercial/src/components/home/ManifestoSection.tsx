import { motion } from 'framer-motion';
import { Flower2, PackageCheck, Sparkles, MessageCircle } from 'lucide-react';
import './ManifestoSection.css';

const features = [
  { icon: Flower2, title: 'Estetica delicada', text: 'Rosa cha, bordados, florais e acabamento feminino.' },
  { icon: Sparkles, title: 'Look pronto', text: 'Pecas faceis de combinar para vender mais rapido.' },
  { icon: PackageCheck, title: 'Compra segura', text: 'Informacoes claras de prazo, troca e pagamento.' },
  { icon: MessageCircle, title: 'WhatsApp perto', text: 'Atendimento direto para tirar duvidas e fechar pedidos.' },
];

export function ManifestoSection() {
  return (
    <section className="manifesto">
      <div className="manifesto-feature-band">
        <div className="container manifesto-features">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div className="manifesto-feature" key={feature.title}>
                <Icon size={22} />
                <div>
                  <strong>{feature.title}</strong>
                  <span>{feature.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="container">
        <div className="manifesto-grid">
          <motion.div
            className="manifesto-image"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <img
              src="https://images.unsplash.com/photo-1512316609839-ce289d3eba0a?w=900&q=84"
              alt="Detalhe de moda feminina delicada"
            />
          </motion.div>

          <motion.div
            className="manifesto-content"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <span className="manifesto-label">Alma da marca</span>
            <h2>Uma loja com o cuidado visual da sua etiqueta</h2>
            <p>
              A nova Amoras Capital parte da logo: o circulo de selo, a flor central, o rosa suave e o bordô
              criam uma presenca feminina, acessivel e afetiva.
            </p>
            <p>
              O site agora trabalha como vitrine comercial: mostra a colecao, guia a compra por categoria,
              destaca beneficios e usa imagens editoriais para dar desejo sem esconder o produto.
            </p>
            <a className="btn btn-secondary" href="/sobre">Conhecer a Amoras</a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
