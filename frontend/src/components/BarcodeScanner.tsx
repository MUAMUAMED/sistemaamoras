import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QrCodeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { productService } from '../services/api';
import { Product } from '../types';
import toast from 'react-hot-toast';

interface BarcodeScannerProps {
  onProductFound: (product: Product) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onProductFound, onClose }: BarcodeScannerProps) {
  const [scanInput, setScanInput] = useState('');
  const [searchCode, setSearchCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Foco automático no input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Buscar produto quando código for digitado
  const { data: scannedProduct, isLoading: isSearching } = useQuery({
    queryKey: ['scanned-product', searchCode],
    queryFn: () => productService.searchByCode(searchCode),
    enabled: !!searchCode && searchCode.length >= 8,
  });

  // Adicionar produto ao carrinho quando encontrado
  useEffect(() => {
    if (scannedProduct && searchCode) {
      onProductFound(scannedProduct);
      setScanInput('');
      setSearchCode('');
      toast.success(`${scannedProduct.name} encontrado!`);
    }
  }, [scannedProduct, searchCode, onProductFound]);

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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Se pressionar Enter, processar o scan
    if (e.key === 'Enter') {
      e.preventDefault();
      if (scanInput.trim()) {
        if (scanInput.length < 8) {
          toast.error('Código deve ter pelo menos 8 caracteres');
          return;
        }
        setSearchCode(scanInput);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <QrCodeIcon className="h-5 w-5 mr-2" />
              Scanner de Produtos
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de Barras / QR Code
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escaneie ou digite o código..."
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono"
                  disabled={isSearching}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {isSearching ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  ) : (
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={isSearching || !scanInput.trim()}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? 'Buscando...' : 'Buscar Produto'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Dicas:</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-1 space-y-1">
              <li>• Use um leitor de código de barras</li>
              <li>• Ou digite o código manualmente</li>
              <li>• Pressione Enter para buscar rapidamente</li>
              <li>• Código deve ter pelo menos 8 caracteres</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 