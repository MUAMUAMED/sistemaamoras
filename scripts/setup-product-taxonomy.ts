import { prisma } from '../src/config/database';

type CategoryDefinition = {
  name: string;
  code: string;
  description: string;
  aliases?: string[];
  subcategories: string[];
};

const taxonomy: CategoryDefinition[] = [
  {
    name: 'Macacão',
    code: '05',
    description: 'Macacões femininos',
    subcategories: [
      'Macacão Saruel',
      'Macacão Frente Única',
      'Macacão Lu',
      'Macacão Sandra',
      'Macacão Stephany',
      'Macacão Sandra de Manga',
      'Macacão de Zíper',
    ],
  },
  {
    name: 'Macaquinho',
    code: '04',
    description: 'Macaquinhos femininos',
    subcategories: ['Macaquinho Transpassado'],
  },
  {
    name: 'Vestido Curto',
    code: '11',
    description: 'Vestidos curtos',
    aliases: ['Vestido curto'],
    subcategories: [
      'Vestido de Peitinho Curto',
      'Vestido de Saída Curto',
      'Vestido Hellen',
      'Vestido Envelope Curto',
      'Vestido de Babado Gata-da-Mata',
      'Vestido de Alcinha Curto',
      'Vestido Midi 3/4 (Preço de Longo)',
    ],
  },
  {
    name: 'Vestido Longo',
    code: '77',
    description: 'Vestidos longos',
    aliases: ['Vestido longo'],
    subcategories: [
      'Vestido Tomara que Caia',
      'Vestido de Peitinho',
      'Vestido Midi 3/4',
      'Vestido Marina',
      'Vestido Frente Única',
      'Vestido 3 Marias',
      'Vestido V',
      'Vestido de Botão',
      'Vestido Saída',
      'Vestido Cordinha',
      'Vestido Envelope',
      'Vestido Sereia',
      'Vestido Rap',
    ],
  },
  {
    name: 'Regata',
    code: '22',
    description: 'Regatas femininas',
    subcategories: ['Regata Estampada', 'Regata Lisa'],
  },
  {
    name: 'Saia',
    code: '23',
    description: 'Saias femininas',
    subcategories: ['Saia Longa (Midi)', 'Saia'],
  },
  {
    name: 'Calça',
    code: '08',
    description: 'Calças femininas',
    subcategories: ['Calça Pantalona', 'Calça Pantalona GG'],
  },
  {
    name: 'Blusa',
    code: '27',
    description: 'Blusas femininas',
    subcategories: [
      'Blusa Lenço',
      'Blusa Transpassada',
      'Blusa Elastéx',
      'Blusa GG',
      'Blusa Manga Lenço',
    ],
  },
  {
    name: 'Short',
    code: '83',
    description: 'Shorts femininos',
    subcategories: ['Short de Linho', 'Shortinho'],
  },
  {
    name: 'Conjuntos',
    code: '84',
    description: 'Conjuntos femininos',
    subcategories: [
      'Conjunto Pantalona e Blusa',
      'Conjunto Kimono 2 Peças',
      'Conjunto Kimono 3 Peças',
    ],
  },
  {
    name: 'Kimonos',
    code: '85',
    description: 'Kimonos femininos',
    subcategories: ['Kimono Avulso'],
  },
  {
    name: 'Acessórios',
    code: '86',
    description: 'Acessórios femininos',
    subcategories: ['Bolsa', 'Pulseira', 'Cinto', 'Brinco', 'Colar'],
  },
  {
    name: 'Camisas',
    code: '87',
    description: 'Camisas femininas',
    subcategories: ['Camisa'],
  },
];

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

async function findOrCreateCategory(definition: CategoryDefinition) {
  const categoryNames = [definition.name, ...(definition.aliases ?? [])].map(normalize);
  const categories = await prisma.category.findMany();
  const existing = categories.find((category) => categoryNames.includes(normalize(category.name)));

  if (existing) {
    return { category: existing, created: false };
  }

  const category = await prisma.category.create({
    data: {
      name: definition.name,
      code: definition.code,
      description: definition.description,
      active: true,
    },
  });

  return { category, created: true };
}

async function main() {
  let categoriesCreated = 0;
  let subcategoriesCreated = 0;

  for (const definition of taxonomy) {
    const { category, created } = await findOrCreateCategory(definition);
    if (created) categoriesCreated += 1;

    const existingSubcategories = await prisma.subcategory.findMany({
      where: { categoryId: category.id },
      select: { name: true, code: true },
    });

    for (const [index, name] of definition.subcategories.entries()) {
      const alreadyExists = existingSubcategories.some((subcategory) => normalize(subcategory.name) === normalize(name));
      if (alreadyExists) continue;

      const code = String(index + 1).padStart(2, '0');
      const codeInUse = existingSubcategories.some((subcategory) => subcategory.code === code);
      if (codeInUse) {
        throw new Error(`O código ${code} já está em uso na categoria ${category.name}.`);
      }

      await prisma.subcategory.create({
        data: {
          name,
          code,
          description: `${name} - ${definition.description}`,
          categoryId: category.id,
          active: true,
        },
      });
      subcategoriesCreated += 1;
    }
  }

  console.log(`Categorias criadas: ${categoriesCreated}`);
  console.log(`Subcategorias criadas: ${subcategoriesCreated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
