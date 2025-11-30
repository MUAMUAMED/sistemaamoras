import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  QrCodeIcon, 
  ShoppingCartIcon, 
  PlusIcon, 
  MinusIcon, 
  XMarkIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { barcodeApi, productService, saleService, paymentGatewayApi } from '../services/api';
import { Product, Sale } from '../types';
import toast from 'react-hot-toast';

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function Scanner() {
  const [scanInput, setScanInput] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [pixModal, setPixModal] = useState<{ qr: string; copiaCola: string } | null>(null);
  const [pixLoading, setPixLoading] = useState(false);

  // Foco automático no input de scan
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const { data: scannedProduct, isLoading: isSearching } = useQuery({
    queryKey: ['scanned-product', searchCode],
    queryFn: () => productService.searchByCode(searchCode),
    enabled: !!searchCode && searchCode.length >= 8,
  });

  // Effect para adicionar produto ao carrinho quando encontrado
  useEffect(() => {
    if (scannedProduct && searchCode) {
      addToCart(scannedProduct);
      setScanInput('');
      setSearchCode('');
    }
  }, [scannedProduct, searchCode]);

  const createSaleMutation = useMutation({
    mutationFn: (saleData: any) => saleService.create(saleData),
    onSuccess: (sale) => {
      toast.success('Venda criada com sucesso!');
      setCart([]);
      setCustomerName('');
      setPaymentMethod('');
      setShowPaymentModal(false);
    },
    onError: (error) => {
      toast.error('Erro ao criar venda');
      console.error('Error creating sale:', error);
    },
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        unitPrice: product.price,
        total: product.price
      }]);
    }
    
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity, total: newQuantity * item.unitPrice }
        : item
    ));
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanInput.trim()) {
      if (scanInput.length < 8) {
        toast.error('Código deve ter pelo menos 8 caracteres');
        return;
      }
      setSearchCode(scanInput);
    }
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.total, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleFinalizeSale = () => {
    if (cart.length === 0) {
      toast.error('Carrinho vazio!');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmSale = () => {
    if (!paymentMethod) {
      toast.error('Selecione um método de pagamento!');
      return;
    }

    const saleData = {
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      paymentMethod,
      leadName: customerName || undefined,
    };

    createSaleMutation.mutate(saleData);
  };

  const handlePixPayment = async () => {
    setPixLoading(true);
    try {
      const valor = getTotalAmount();
      const descricao = 'Venda PDV';
      const email = 'comprador-teste@email.com'; // Pode ser dinâmico
      const result = await paymentGatewayApi.payPix(valor, descricao, email);
      setPixModal({
        qr: result.point_of_interaction.transaction_data.qr_code_base64,
        copiaCola: result.point_of_interaction.transaction_data.qr_code
      });
    } catch (error) {
      toast.error('Erro ao gerar pagamento Pix');
    } finally {
      setPixLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scanner de Vendas</h1>
        <p className="text-gray-600">Escaneie códigos de barras ou QR codes para adicionar produtos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Área de Scanner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <QrCodeIcon className="h-5 w-5 mr-2" />
            Scanner
          </h2>
          
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Barras / QR Code
              </label>
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Escaneie ou digite o código..."
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono"
                disabled={isSearching}
              />
            </div>
            
            <button
              type="submit"
              disabled={!scanInput.trim() || isSearching}
              className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSearching ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Buscar Produto'
              )}
            </button>
          </form>

          {/* Informações do produto escaneado */}
          {scannedProduct && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-medium text-green-900">{scannedProduct.name}</h3>
              <p className="text-sm text-green-700">
                Preço: R$ {scannedProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-green-700">
                Estoque: {scannedProduct.stock} unidades
              </p>
            </div>
          )}
        </div>

        {/* Carrinho */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ShoppingCartIcon className="h-5 w-5 mr-2" />
            Carrinho ({getTotalItems()} itens)
          </h2>

          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Carrinho vazio</p>
              <p className="text-sm text-gray-400">Escaneie produtos para adicionar</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <p className="text-sm text-gray-600">
                      R$ {item.unitPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} cada
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 text-red-500 hover:text-red-700 ml-2"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="ml-4 text-right">
                    <p className="font-medium text-gray-900">
                      R$ {item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>R$ {getTotalAmount().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              <button
                onClick={handleFinalizeSale}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 flex items-center justify-center"
              >
                <CreditCardIcon className="h-5 w-5 mr-2" />
                Finalizar Venda
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Pagamento</h2>
            <div className="mb-4">
              <button
                onClick={handlePixPayment}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 mb-2"
                disabled={pixLoading}
              >
                {pixLoading ? 'Gerando Pix...' : 'Pagar com Pix'}
              </button>
              {/* ... outros métodos ... */}
            </div>
            <button
              onClick={() => setShowPaymentModal(false)}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal do QR Code Pix */}
      {pixModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Pague com Pix</h2>
            <img src={`data:image/png;base64,${pixModal.qr}`} alt="QR Code Pix" className="mb-4 w-48 h-48" />
            <div className="mb-2 text-center">
              <span className="text-gray-700 text-sm">Copia e Cola:</span>
              <div className="bg-gray-100 rounded px-2 py-1 text-xs break-all select-all">{pixModal.copiaCola}</div>
            </div>
            <button
              onClick={() => setPixModal(null)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 