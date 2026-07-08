import { MessageCircle, Share2, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { commercialApi } from '../../lib/commercialApi';
import './SocialProofSection.css';

const reviews = [
  { name: 'Marina', text: 'O vestido chegou lindo, bem embalado e com caimento perfeito.' },
  { name: 'Luiza', text: 'A paleta da marca e muito delicada. Comprei conjunto e bolsa juntos.' },
  { name: 'Camila', text: 'Atendimento rapido no WhatsApp e troca super tranquila.' },
];

export function SocialProofSection() {
  const { data } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const posts = data?.products.slice(0, 4) || [];

  return (
    <section className="social-proof">
      <div className="container">
        <div className="social-proof-header">
          <span>Amoras no dia a dia</span>
          <h2>Looks com cara de carinho, prontos para aparecer no feed</h2>
        </div>

        <div className="review-grid">
          {reviews.map((review) => (
            <article className="review-card" key={review.name}>
              <div className="review-stars">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star key={index} size={16} fill="currentColor" />
                ))}
              </div>
              <p>{review.text}</p>
              <strong>{review.name}</strong>
            </article>
          ))}
        </div>

        <div className="instagram-strip">
          <div className="instagram-copy">
            <Share2 size={24} />
            <strong>@amoras.capital</strong>
            <span>Novidades, provador e bastidores da colecao.</span>
          </div>
          {posts.length > 0 && (
            <div className="instagram-posts">
              {posts.map((product) => (
                <img src={product.image} alt={product.name} key={product.id} />
              ))}
            </div>
          )}
        </div>

        <a className="whatsapp-float" href="https://wa.me/" aria-label="Falar no WhatsApp">
          <MessageCircle size={22} />
          <span>Comprar pelo WhatsApp</span>
        </a>
      </div>
    </section>
  );
}
