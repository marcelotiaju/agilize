// src/components/ui/searchable-select.tsx
"use client";

import { useState, useMemo } from 'react';
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
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchableSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string, name: string) => void;
  name: string;
  data: { id: string; name: string; document?: string, cargo: string;  }[];
  searchKeys: ('name' | 'document')[];
}

export function SearchableSelect({
  label,
  placeholder,
  value,
  onChange,
  name,
  data,
  searchKeys,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const selectedItem = useMemo(() => {
    return data.find((item) => item.id === value);
  }, [data, value]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) {
      return data;
    }
    return data.filter((item) => {
      const nameMatch = searchKeys.includes('name') && item.name.toLowerCase().includes(term);
      const documentMatch = searchKeys.includes('document') && item.document?.toLowerCase().includes(term);
      return nameMatch || documentMatch;
    });
  }, [data, searchTerm, searchKeys]);

  const handleSelect = (item: { id: string; name: string }) => {
    onChange(item.id, name);
    setIsOpen(false);
    setSearchTerm(''); // Limpa a busca ao fechar
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start", !value && "text-muted-foreground")}
        >
          {selectedItem ? selectedItem.name : placeholder}
          <Search className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </DialogHeader>
        <div className="mt-4 max-h-60 overflow-y-auto space-y-2">
          {filteredData.length > 0 ? (
            filteredData.map((item) => (
              <Button
                key={item.id}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleSelect(item)}
              >
                {item.name} {item.document ? `(${item.document})` : ''} {item.cargo ? `${item.cargo}` : ''}
              </Button>
            ))
          ) : (
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