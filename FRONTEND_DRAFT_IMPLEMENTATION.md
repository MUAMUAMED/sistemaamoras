# Implementação Frontend - Salvar como Rascunho

Este documento descreve como implementar a funcionalidade de "Salvar como Rascunho" no frontend.

## Funcionalidades Implementadas no Backend

### 1. Criar Produto como Rascunho
**Endpoint:** `POST /api/products`
**Parâmetro:** `saveAsDraft: true`

Quando `saveAsDraft` é `true`:
- Não valida campos obrigatórios
- Não gera código de barras
- Salva todas as informações fornecidas (mesmo que incompletas)
- Define `isDraft: true` no produto

### 2. Converter Rascunho em Produto
**Endpoint:** `POST /api/products/:id/create`
**Body:** `{ initialLocation?: 'LOJA' | 'ARMAZEM' }`

Quando chamado:
- Valida todos os campos obrigatórios
- Gera código de barras
- Gera QR Code
- Define `isDraft: false`
- Registra movimentação de estoque (se houver)

## Exemplo de Implementação React

### Componente de Criação de Produto

```tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface ProductFormData {
  name?: string;
  categoryId?: string;
  subcategoryId?: string;
  sizeId?: string;
  patternId?: string;
  price?: number;
  stock?: number;
  description?: string;
  initialLocation?: 'LOJA' | 'ARMAZEM';
}

const CreateProductForm: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? undefined : value
    }));
  };

  const handleSaveAsDraft = async () => {
    setLoading(true);
    try {
      const response = await api.post('/products', {
        ...formData,
        saveAsDraft: true
      });
      
      alert('Rascunho salvo com sucesso!');
      navigate(`/products/${response.data.id}/edit`);
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      alert('Erro ao salvar rascunho');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    setLoading(true);
    try {
      const response = await api.post('/products', {
        ...formData,
        saveAsDraft: false
      });
      
      alert('Produto criado com sucesso!');
      navigate(`/products/${response.data.id}`);
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      alert('Erro ao criar produto. Verifique se todos os campos obrigatórios estão preenchidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form>
      <div>
        <label>Nome:</label>
        <input
          type="text"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
        />
      </div>

      <div>
        <label>Categoria:</label>
        <select
          name="categoryId"
          value={formData.categoryId || ''}
          onChange={handleChange}
        >
          <option value="">Selecione...</option>
          {/* Opções de categorias */}
        </select>
      </div>

      <div>
        <label>Tamanho:</label>
        <select
          name="sizeId"
          value={formData.sizeId || ''}
          onChange={handleChange}
        >
          <option value="">Selecione...</option>
          {/* Opções de tamanhos */}
        </select>
      </div>

      <div>
        <label>Estampa:</label>
        <select
          name="patternId"
          value={formData.patternId || ''}
          onChange={handleChange}
        >
          <option value="">Selecione...</option>
          {/* Opções de estampas */}
        </select>
      </div>

      <div>
        <label>Preço:</label>
        <input
          type="number"
          name="price"
          value={formData.price || ''}
          onChange={handleChange}
        />
      </div>

      <div>
        <label>Estoque:</label>
        <input
          type="number"
          name="stock"
          value={formData.stock || ''}
          onChange={handleChange}
        />
      </div>

      <div>
        <label>Descrição:</label>
        <textarea
          name="description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        />
      </div>

      <div>
        <button
          type="button"
          onClick={handleSaveAsDraft}
          disabled={loading}
          style={{ marginRight: '10px', backgroundColor: '#6c757d', color: 'white' }}
        >
          Salvar como Rascunho
        </button>
        
        <button
          type="button"
          onClick={handleCreateProduct}
          disabled={loading}
          style={{ backgroundColor: '#28a745', color: 'white' }}
        >
          Criar Produto
        </button>
      </div>
    </form>
  );
};

export default CreateProductForm;
```

### Componente de Edição de Rascunho

```tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const EditDraftProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      setProduct(response.data);
      setFormData(response.data);
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
    }
  };

  const handleUpdateDraft = async () => {
    setLoading(true);
    try {
      await api.put(`/products/${id}`, {
        ...formData,
        // Manter como rascunho
      });
      alert('Rascunho atualizado com sucesso!');
      loadProduct();
    } catch (error) {
      console.error('Erro ao atualizar rascunho:', error);
      alert('Erro ao atualizar rascunho');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromDraft = async () => {
    if (!formData.name || !formData.categoryId || !formData.sizeId || 
        !formData.patternId || formData.price === undefined || formData.stock === undefined) {
      alert('Preencha todos os campos obrigatórios antes de criar o produto');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/products/${id}/create`, {
        initialLocation: formData.initialLocation || 'LOJA'
      });
      
      alert('Produto criado com sucesso!');
      navigate(`/products/${response.data.id}`);
    } catch (error: any) {
      console.error('Erro ao criar produto:', error);
      alert(error.response?.data?.message || 'Erro ao criar produto');
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return <div>Carregando...</div>;
  }

  return (
    <div>
      {product.isDraft && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffc107',
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          <strong>⚠️ Este é um rascunho</strong>
          <p>Complete todos os campos obrigatórios e clique em "Criar Produto" para finalizar.</p>
        </div>
      )}

      <form>
        {/* Campos do formulário (similar ao CreateProductForm) */}
        
        <div>
          <button
            type="button"
            onClick={handleUpdateDraft}
            disabled={loading}
            style={{ marginRight: '10px', backgroundColor: '#6c757d', color: 'white' }}
          >
            Salvar Rascunho
          </button>
          
          {product.isDraft && (
            <button
              type="button"
              onClick={handleCreateFromDraft}
              disabled={loading}
              style={{ backgroundColor: '#28a745', color: 'white' }}
            >
              Criar Produto
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default EditDraftProduct;
```

### Listagem de Rascunhos

```tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const DraftsList: React.FC = () => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const response = await api.get('/products', {
        params: { isDraft: true }
      });
      setDrafts(response.data);
    } catch (error) {
      console.error('Erro ao carregar rascunhos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando rascunhos...</div>;
  }

  return (
    <div>
      <h2>Rascunhos de Produtos</h2>
      {drafts.length === 0 ? (
        <p>Nenhum rascunho encontrado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Tamanho</th>
              <th>Estampa</th>
              <th>Preço</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((draft) => (
              <tr key={draft.id}>
                <td>{draft.name || '(Sem nome)'}</td>
                <td>{draft.category?.name || '-'}</td>
                <td>{draft.size?.name || '-'}</td>
                <td>{draft.pattern?.name || '-'}</td>
                <td>{draft.price ? `R$ ${draft.price.toFixed(2)}` : '-'}</td>
                <td>
                  <Link to={`/products/${draft.id}/edit`}>
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DraftsList;
```

## Notas Importantes

1. **Validação no Frontend**: Embora o backend não valide campos obrigatórios para rascunhos, é recomendado mostrar avisos visuais no frontend indicando quais campos são necessários para criar o produto.

2. **Filtro de Rascunhos**: Você pode adicionar um filtro na listagem de produtos para mostrar apenas rascunhos:
   ```typescript
   const response = await api.get('/products', {
     params: { isDraft: true }
   });
   ```

3. **Indicador Visual**: Sempre mostre claramente quando um produto é um rascunho, usando badges ou cores diferentes.

4. **Botão Condicional**: O botão "Criar Produto" só deve aparecer quando o produto for um rascunho (`isDraft === true`).

