import { MessageCircle, Share2, Star } from 'lucide-react';
import './SocialProofSection.css';

const reviews = [
  { name: 'Marina', text: 'O vestido chegou lindo, bem embalado e com caimento perfeito.' },
  { name: 'Luiza', text: 'A paleta da marca e muito delicada. Comprei conjunto e bolsa juntos.' },
  { name: 'Camila', text: 'Atendimento rapido no WhatsApp e troca super tranquila.' },
];

const posts = [
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=700&q=82',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=700&q=82',
  'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=700&q=82',
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=700&q=82',
];

export function SocialProofSection() {
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
          <div className="instagram-posts">
            {posts.map((post) => (
              <img src={post} alt="Look Amoras Capital" key={post} />
            ))}
          </div>
        </div>

        <a className="whatsapp-float" href="https://wa.me/" aria-label="Falar no WhatsApp">
          <MessageCircle size={22} />
          <span>Comprar pelo WhatsApp</span>
        </a>
      </div>
    </section>
  );
}
