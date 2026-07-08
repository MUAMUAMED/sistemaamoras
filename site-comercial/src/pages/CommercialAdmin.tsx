import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ImagePlus, LogOut, Save, ToggleLeft, ToggleRight, Trash2, Upload } from 'lucide-react';
import { commercialAdminApi } from '../lib/commercialAdminApi';
import type { CommercialSiteSettings } from '../lib/commercialAdminApi';
import type { CatalogProduct, CommercialCategory } from '../data/catalog';
import './CommercialAdmin.css';

const formatPrice = (value: number) => `R$ ${value.toFixed(2).replace('.', ',')}`;

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function ProductAdminRow({
  product,
  categories,
}: {
  product: CatalogProduct;
  categories: CommercialCategory[];
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(product.name);
  const [slug, setSlug] = useState(product.slug);
  const [description, setDescription] = useState(product.description);
  const [shortDescription, setShortDescription] = useState(product.shortDescription || '');
  const [seoTitle, setSeoTitle] = useState(product.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(product.seoDescription || '');
  const [material, setMaterial] = useState(product.material || '');
  const [careInstructions, setCareInstructions] = useState(product.careInstructions || '');
  const [colorNotes, setColorNotes] = useState(product.colorNotes || '');
  const [categoryId, setCategoryId] = useState(product.categoryId || '');
  const [featured, setFeatured] = useState(Boolean(product.featured));
  const [published, setPublished] = useState(product.published !== false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadFeedback, setUploadFeedback] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['commercial-admin-products'] });
    queryClient.invalidateQueries({ queryKey: ['commercial-catalog'] });
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      commercialAdminApi.updateProduct(product.id, {
        title,
        slug,
        description,
        shortDescription,
        seoTitle,
        seoDescription,
        material,
        careInstructions,
        colorNotes,
        categoryId: categoryId || null,
        featured,
        published,
      }),
    onSuccess: invalidate,
  });

  const uploadMutation = useMutation({
    mutationFn: () => commercialAdminApi.replaceProductImages(product.id, files),
    onMutate: () => setUploadFeedback(''),
    onSuccess: () => {
      setFiles([]);
      setUploadFeedback('Fotos atualizadas com sucesso.');
      invalidate();
    },
    onError: (error: any) => {
      const status = error.response?.status;
      const message = status === 413
        ? 'As fotos excedem o limite permitido. Use arquivos de ate 5 MB cada.'
        : error.response?.data?.error || 'Nao foi possivel enviar as fotos.';
      setUploadFeedback(message);
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => commercialAdminApi.deleteProductImage(product.id, imageId),
    onSuccess: invalidate,
  });

  return (
    <article className="admin-product">
      <div className="admin-product-gallery">
        <img src={product.image} alt={product.name} />
        <div className="admin-thumbs">
          {product.gallery.map((image, index) => {
            const storedImage = product.commercialImages?.[index];
            return (
              <div className="admin-thumb" key={`${image}-${index}`}>
                <img src={image} alt={`${product.name} ${index + 1}`} />
                {storedImage && (
                  <button
                    type="button"
                    aria-label="Remover foto"
                    onClick={() => deleteImageMutation.mutate(storedImage.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="admin-product-editor">
        <div className="admin-product-topline">
          <div>
            <span>{product.erpProduct.name}</span>
            <h2>{product.name}</h2>
          </div>
          <button
            type="button"
            className={`admin-switch ${published ? 'active' : ''}`}
            onClick={() => setPublished((value) => !value)}
          >
            {published ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
            {published ? 'Publicado' : 'Oculto'}
          </button>
        </div>

        <div className="admin-erp-strip">
          <strong>{formatPrice(product.price)}</strong>
          <span>{product.sizes.join(', ')}</span>
          <span>{product.availableQuantity} un. loja</span>
          <span>{product.erpProduct.category?.name || 'Sem categoria ERP'}</span>
        </div>

        <div className="admin-form-grid">
          <label>
            Titulo comercial
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Slug
            <input value={slug} onChange={(event) => setSlug(slugify(event.target.value))} />
          </label>
          <label>
            Categoria do site
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="">Novidades</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} />
            Destacar na vitrine
          </label>
          <label className="admin-wide">
            Chamada curta
            <input value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
          </label>
          <label>
            Material
            <input value={material} onChange={(event) => setMaterial(event.target.value)} />
          </label>
          <label>
            Cuidados
            <input value={careInstructions} onChange={(event) => setCareInstructions(event.target.value)} />
          </label>
          <label>
            Cor/observacao
            <input value={colorNotes} onChange={(event) => setColorNotes(event.target.value)} />
          </label>
          <label>
            SEO titulo
            <input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
          </label>
          <label className="admin-wide">
            SEO descricao
            <input value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} />
          </label>
          <label className="admin-wide">
            Descricao comercial
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
          </label>
        </div>

        <div className="admin-actions">
          <label className="admin-file">
            <ImagePlus size={18} />
            <span>{files.length ? `${files.length} foto(s)` : 'Escolher fotos'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                const oversized = selected.find((file) => file.size > 5 * 1024 * 1024);
                if (oversized) {
                  setFiles([]);
                  setUploadFeedback(`A foto ${oversized.name} excede 5 MB.`);
                  event.target.value = '';
                  return;
                }
                setUploadFeedback('');
                setFiles(selected);
              }}
            />
          </label>
          <button
            type="button"
            className="admin-button ghost"
            disabled={!files.length || uploadMutation.isPending}
            onClick={() => uploadMutation.mutate()}
          >
            <Upload size={18} />
            {uploadMutation.isPending ? 'Enviando...' : 'Substituir fotos'}
          </button>
          <button
            type="button"
            className="admin-button"
            disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate()}
          >
            <Save size={18} />
            Salvar vitrine
          </button>
          {uploadFeedback && (
            <p className={`admin-upload-feedback ${uploadMutation.isError ? 'error' : 'success'}`} role="status">
              {uploadFeedback}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function CommercialAdmin() {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => Boolean(localStorage.getItem('token')));
  const [currentUser, setCurrentUser] = useState(() => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) as { name: string; email: string; role: string } : null;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [categoryImage, setCategoryImage] = useState('');
  const [settingsForm, setSettingsForm] = useState<CommercialSiteSettings>({
    brandName: 'Amoras Capital',
    announcement: '',
    whatsappUrl: '',
    instagramUrl: '',
    heroTitle: '',
    heroSubtitle: '',
    seoTitle: '',
    seoDescription: '',
  });

  const categoriesQuery = useQuery({
    queryKey: ['commercial-admin-categories'],
    queryFn: commercialAdminApi.categories,
    enabled: hasToken,
  });

  const productsQuery = useQuery({
    queryKey: ['commercial-admin-products'],
    queryFn: commercialAdminApi.products,
    enabled: hasToken,
  });

  const settingsQuery = useQuery({
    queryKey: ['commercial-admin-settings'],
    queryFn: commercialAdminApi.settings,
    enabled: hasToken,
  });

  const categories = categoriesQuery.data || [];
  const products = productsQuery.data || [];

  useEffect(() => {
    if (settingsQuery.data) {
      setSettingsForm({
        brandName: settingsQuery.data.brandName || 'Amoras Capital',
        announcement: settingsQuery.data.announcement || '',
        whatsappUrl: settingsQuery.data.whatsappUrl || '',
        instagramUrl: settingsQuery.data.instagramUrl || '',
        heroTitle: settingsQuery.data.heroTitle || '',
        heroSubtitle: settingsQuery.data.heroSubtitle || '',
        seoTitle: settingsQuery.data.seoTitle || '',
        seoDescription: settingsQuery.data.seoDescription || '',
      });
    }
  }, [settingsQuery.data]);

  const stats = useMemo(
    () => ({
      published: products.filter((product) => product.published !== false).length,
      withImages: products.filter((product) => product.commercialImages?.length).length,
      categories: categories.filter((category) => category.active).length,
    }),
    [categories, products]
  );

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      commercialAdminApi.createCategory({
        name: categoryName,
        slug: categorySlug || slugify(categoryName),
        description: categoryDescription,
        imageUrl: categoryImage,
        active: true,
      }),
    onSuccess: () => {
      setCategoryName('');
      setCategorySlug('');
      setCategoryDescription('');
      setCategoryImage('');
      queryClient.invalidateQueries({ queryKey: ['commercial-admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-catalog'] });
    },
  });

  const toggleCategoryMutation = useMutation({
    mutationFn: (category: CommercialCategory) =>
      commercialAdminApi.updateCategory(category.id, { active: !category.active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-catalog'] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: () => commercialAdminApi.updateSettings(settingsForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-catalog'] });
    },
  });

  const loginMutation = useMutation({
    mutationFn: () => commercialAdminApi.login(loginEmail, loginPassword),
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setHasToken(true);
      setLoginError('');
    },
    onError: () => {
      setLoginError('Email ou senha invalidos para acessar o admin comercial.');
    },
  });

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) return;
    loginMutation.mutate();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setHasToken(false);
    queryClient.clear();
  };

  const createCategory = (event: FormEvent) => {
    event.preventDefault();
    if (!categoryName.trim()) return;
    createCategoryMutation.mutate();
  };

  const updateSettingsField = (field: keyof CommercialSiteSettings, value: string) => {
    setSettingsForm((current) => ({ ...current, [field]: value }));
  };

  if (!hasToken) {
    return (
      <section className="commercial-admin auth">
        <form className="admin-auth-box" onSubmit={handleLogin}>
          <img src="/amoras-logo.png" alt="Amoras Capital" />
          <h1>Admin comercial</h1>
          <p>Entre com o mesmo email e senha do sistema Amoras.</p>
          <input
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="email@amoras.com"
            autoComplete="email"
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="Senha"
            autoComplete="current-password"
          />
          {loginError && <span className="admin-error">{loginError}</span>}
          <button type="submit" className="admin-button" disabled={loginMutation.isPending}>
            <Check size={18} />
            Entrar
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className="commercial-admin">
      <section className="admin-hero">
        <div>
          <span>Amoras Capital</span>
          <h1>Admin do site comercial</h1>
          <p>Vitrine, categorias e fotos comerciais. Preco, tamanho e estoque continuam sincronizados pelo ERP.</p>
        </div>
        <div className="admin-hero-side">
          <div className="admin-user">
            <span>{currentUser?.role || 'ADMIN'}</span>
            <strong>{currentUser?.name || 'Usuario Amoras'}</strong>
            <button type="button" onClick={logout}>
              <LogOut size={16} />
              Sair
            </button>
          </div>
          <div className="admin-stats">
            <strong>{stats.published}<small>publicados</small></strong>
            <strong>{stats.withImages}<small>com fotos</small></strong>
            <strong>{stats.categories}<small>categorias</small></strong>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <span>Configuracoes</span>
            <h2>Identidade do site</h2>
          </div>
          <button
            type="button"
            className="admin-button"
            onClick={() => updateSettingsMutation.mutate()}
            disabled={updateSettingsMutation.isPending}
          >
            <Save size={18} />
            Salvar site
          </button>
        </div>

        <div className="admin-form-grid">
          <label>
            Nome da marca
            <input
              value={settingsForm.brandName}
              onChange={(event) => updateSettingsField('brandName', event.target.value)}
            />
          </label>
          <label>
            WhatsApp
            <input
              value={settingsForm.whatsappUrl}
              onChange={(event) => updateSettingsField('whatsappUrl', event.target.value)}
            />
          </label>
          <label>
            Instagram
            <input
              value={settingsForm.instagramUrl}
              onChange={(event) => updateSettingsField('instagramUrl', event.target.value)}
            />
          </label>
          <label className="admin-wide">
            Aviso do topo
            <input
              value={settingsForm.announcement}
              onChange={(event) => updateSettingsField('announcement', event.target.value)}
            />
          </label>
          <label>
            Titulo principal
            <input
              value={settingsForm.heroTitle}
              onChange={(event) => updateSettingsField('heroTitle', event.target.value)}
            />
          </label>
          <label className="admin-wide">
            Subtitulo principal
            <input
              value={settingsForm.heroSubtitle}
              onChange={(event) => updateSettingsField('heroSubtitle', event.target.value)}
            />
          </label>
          <label>
            SEO titulo
            <input
              value={settingsForm.seoTitle}
              onChange={(event) => updateSettingsField('seoTitle', event.target.value)}
            />
          </label>
          <label className="admin-wide">
            SEO descricao
            <input
              value={settingsForm.seoDescription}
              onChange={(event) => updateSettingsField('seoDescription', event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <span>Categorias</span>
            <h2>Organizacao da vitrine</h2>
          </div>
        </div>

        <form className="admin-category-form" onSubmit={createCategory}>
          <label>
            Nome
            <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} />
          </label>
          <label>
            Slug
            <input
              value={categorySlug}
              onChange={(event) => setCategorySlug(slugify(event.target.value))}
              placeholder={categoryName ? slugify(categoryName) : 'vestidos'}
            />
          </label>
          <label>
            Imagem
            <input value={categoryImage} onChange={(event) => setCategoryImage(event.target.value)} />
          </label>
          <label className="admin-wide">
            Descricao
            <input value={categoryDescription} onChange={(event) => setCategoryDescription(event.target.value)} />
          </label>
          <button type="submit" className="admin-button" disabled={createCategoryMutation.isPending}>
            Criar categoria
          </button>
        </form>

        <div className="admin-category-list">
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={category.active ? 'active' : ''}
              onClick={() => toggleCategoryMutation.mutate(category)}
            >
              {category.name}
              <span>{category.active ? 'Ativa' : 'Oculta'}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <span>Produtos publicados pelo ERP</span>
            <h2>Fotos e textos do site</h2>
          </div>
        </div>

        {(productsQuery.isLoading || categoriesQuery.isLoading) && (
          <p className="admin-empty">Carregando vitrine comercial...</p>
        )}
        {!productsQuery.isLoading && products.length === 0 && (
          <p className="admin-empty">Nenhuma roupa publicada pelo ERP ainda.</p>
        )}
        <div className="admin-products-list">
          {products.map((product) => (
            <ProductAdminRow key={product.id} product={product} categories={categories} />
          ))}
        </div>
      </section>
    </div>
  );
}
