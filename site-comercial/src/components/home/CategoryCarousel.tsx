import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { commercialApi } from '../../lib/commercialApi';
import './CategoryCarousel.css';

const fallbackCategories = [
  {
    name: 'Vestidos',
    href: '/produtos/vestidos',
    text: 'Midi, longo e soltinho para vestir sem pensar duas vezes.',
    image: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=700&q=82',
  },
  {
    name: 'Conjuntos',
    href: '/produtos/conjuntos',
    text: 'Looks prontos com caimento leve e toque arrumado.',
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=700&q=82',
  },
  {
    name: 'Blusas',
    href: '/produtos/novidades',
    text: 'Batas, regatas e camisas com detalhe delicado.',
    image: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=700&q=82',
  },
  {
    name: 'Acessorios',
    href: '/produtos/acessorios',
    text: 'Bolsas, brincos e finalizadores para completar o look.',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=700&q=82',
  },
];

export function CategoryCarousel() {
  const { data } = useQuery({
    queryKey: ['commercial-catalog'],
    queryFn: commercialApi.catalog,
  });
  const categories = data?.categories.length
    ? data.categories.map((category, index) => ({
        name: category.name,
        href: `/produtos/${category.slug}`,
        text: category.description || 'Selecao comercial criada para a vitrine Amoras.',
        image: category.imageUrl || fallbackCategories[index % fallbackCategories.length].image,
      }))
    : fallbackCategories;

  return (
    <section className="category-carousel" id="categorias">
      <div className="container">
        <div className="category-header">
          <span>Compre por desejo</span>
          <h2>Categorias para montar seu guarda-roupa Amoras</h2>
        </div>

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
