import React, { useState, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Product } from '../types';

interface ProductSelectorProps {
  products: Product[];
  onProductSelect: (product: Product) => void;
  placeholder?: string;
  className?: string;
}

export default function ProductSelector({ 
  products, 
  onProductSelect, 
  placeholder = "Pesquisar produto...",
  className = ""
}: ProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filtrar produtos baseado na pesquisa
  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower) ||
      product.category?.name.toLowerCase().includes(searchLower) ||
      product.pattern?.name.toLowerCase().includes(searchLower)
    );
  });

  // Limpar seleção quando fechar
  useEffect(() => {
    if (!isOpen) {
      setSelectedIndex(-1);
      setSearchTerm('');
    }
  }, [isOpen]);

  // Focar no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Navegação com teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredProducts.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredProducts.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredProducts[selectedIndex]) {
          handleProductSelect(filteredProducts[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleProductSelect = (product: Product) => {
    onProductSelect(product);
    setIsOpen(false);
    setSearchTerm('');
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedIndex(-1);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputClick = () => {
    setIsOpen(true);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Input de pesquisa */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Dropdown de produtos */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {filteredProducts.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              {searchTerm ? 'Nenhum produto encontrado' : 'Digite para pesquisar produtos'}
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <div
                key={product.id}
                onClick={() => handleProductSelect(product)}
                className={`px-4 py-2 cursor-pointer text-sm ${
                  index === selectedIndex
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className={`text-xs ${index === selectedIndex ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {product.category?.name && `${product.category.name}`}
                      {product.pattern?.name && ` • ${product.pattern.name}`}
                      {product.barcode && ` • Código: ${product.barcode}`}
                    </div>
                  </div>
                  <div className={`text-right ml-2 ${index === selectedIndex ? 'text-indigo-200' : 'text-gray-500'}`}>
                    <div className="font-medium">R$ {product.price.toFixed(2)}</div>
                    <div className="text-xs">
                      Estoque: {product.stock}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Dicas de uso */}
      {!isOpen && (
        <div className="mt-1 text-xs text-gray-500">
          💡 Dica: Digite o nome, categoria, padrão ou código do produto
        </div>
      )}
    </div>
  );
} 