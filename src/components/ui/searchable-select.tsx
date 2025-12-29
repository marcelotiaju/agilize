// src/components/ui/searchable-select.tsx
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Church, Search, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string, name: string) => void;
  name: string;
  data: { 
    id: string; 
    name: string; 
    document?: string;
    cargo?: string;
    photoExists?: boolean;
    photoUrl?: string;
  }[];
  searchKeys: ('name' | 'document')[];
}

export function SearchableSelect({
  label,
  placeholder,
  value,
  disabled,
  required,
  onChange,
  name,
  data,
  searchKeys,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [imgLoadError, setImgLoadError] = useState(false);

  const handleImageError = () => {
    setImgLoadError(true);
  };

  const handleReload = () => {
    // Isso forçará o componente a tentar carregar a imagem de novo
    setImgLoadError(false); 
  };
  
  const selectedItem = useMemo(() => {
    return data.find((item) => item.id === value);
  }, [data, value]);

  // Função para remover acentos
  const removeAccents = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  }

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) {
      return data;
    }
    const normalizedTerm = removeAccents(term);
    return data.filter((item) => {
      const normalizedName = removeAccents(item.name.toLowerCase());
      const normalizedDocument = item.document ? removeAccents(item.document.toLowerCase()) : '';
      const nameMatch = searchKeys.includes('name') && normalizedName.includes(normalizedTerm);
      const documentMatch = searchKeys.includes('document') && item.document && normalizedDocument.includes(normalizedTerm);
      return nameMatch || documentMatch;
    });
  }, [data, searchTerm, searchKeys]);

  const handleSelect = (item: { id: string; name: string }) => {
    onChange(item.id, name);
    setIsOpen(false);
    setSearchTerm(''); // Limpa a busca ao fechar
  };

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ensure search input gets focus when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          required={required}
          className={cn("w-full justify-start", !value && "text-muted-foreground")}
        >
          {selectedItem ? selectedItem.name : placeholder}
          <Search className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent 
        className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault(); // Prevent default focus handling
          searchInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Buscar por nome ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>
        <div className="mt-0 h-110 overflow-y-auto space-y-2">
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
          //     <Button
          //       key={item.id}
          //       variant="ghost"
          //       className="w-full justify-start"
          //       onClick={() => handleSelect(item)}
          //     >
          //       {item.name} {item.document ? `(${item.document})` : ''} {item.cargo ? `${item.cargo}` : ''}
          //     </Button>
          //   ))
          // ) : (
          //   <div className="text-center text-sm text-muted-foreground">
          //     Nenhum resultado encontrado.
          //   </div>
          <Card 
          // className={`cursor-pointer transition-all hover:shadow-md ${
            //   selectedItem ? 'ring-2 ring-blue-500' : ''
            // }`}
            onClick={() => handleSelect(item)}
            key={item.id}
            >
            <CardContent className="p-3">
              <div className="flex items-center space-x-3">
                <div key={item.id} className="shrink-0"></div>
                <div className="shrink-0">
                  {item.photoUrl && item.photoExists ? (
                    <img 
                    src={`/uploads/${item.photoUrl}`} 
                    alt="Foto"
                    className="h-12 w-12 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {!item.document && !item.cargo && !item.photoExists ? (
                        <Church className="h-6 w-6 text-gray-400" />
                      ) : (
                        <User className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {item.name}
                  </p>
                  {item.document && (
                    <p className="text-xs text-gray-500 truncate">
                      CPF: {item.document}
                    </p>
                  )}
                  {item.cargo && (
                    <p className="text-xs text-gray-500 truncate">
                      Cargo: {item.cargo}
                    </p>
                  )}
                </div>
                {/* {selectedItem && (
                  <Badge variant="default" className="flex-shrink-0">
                  Selecionado
                  </Badge>
                  )} */}
              </div>
            </CardContent>
          </Card>          
          ))) : (
            <div className="text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </div>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            <X className="mr-2 h-4 w-4" /> Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
