import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { commercialApi } from '../../lib/commercialApi';
import './CategoryCarousel.css';

export function CategoryCarousel() {
  const { data } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const categories = data?.categories.length
    ? data.categories.map((category) => ({
        name: category.name,
        href: `/produtos/${category.slug}`,
        text: category.description || 'Selecao comercial criada para a vitrine Amoras.',
        image: category.imageUrl || '/amoras-logo.png',
      }))
    : [];

  return (
    <section className="category-carousel" id="categorias">
      <div className="container">
        <div className="category-header">
          <span>Compre por desejo</span>
          <h2>Categorias para montar seu guarda-roupa Amoras</h2>
        </div>

        {!categories.length && (
          <p className="category-empty">Nenhuma categoria comercial cadastrada ainda.</p>
        )}

        <div className="category-grid">
          {categories.map((category, index) => (
            <motion.a
              key={category.name}
              href={category.href}
              className="category-card"
              initial={{ opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
            >
              <img src={category.image} alt={category.name} />
              <div className="category-card-content">
                <h3>{category.name}</h3>
                <p>{category.text}</p>
                <strong>Ver selecao <ArrowRight size={16} /></strong>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
