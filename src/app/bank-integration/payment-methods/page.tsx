'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, CreditCard, Search, Loader2 } from 'lucide-react'

interface PaymentMethod {
    id: number
    name: string
}

export default function PaymentMethodsPage() {
    const { data: session } = useSession()
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<PaymentMethod | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [formData, setFormData] = useState({
        id: '',
        name: ''
    })
    const [isSaving, setIsSaving] = useState(false)

    const canManage = Boolean((session?.user as any)?.canManageBankIntegration)

    useEffect(() => {
        fetchPaymentMethods()
    }, [])

    const fetchPaymentMethods = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/payment-methods')
            if (response.ok) {
                const data = await response.json()
                setPaymentMethods(data)
            } else {
                alert('Não foi possível carregar as formas de pagamento.')
            }
        } catch (error) {
            console.error('Erro ao buscar formas de pagamento:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredItems = useMemo(() => {
        if (!searchTerm) return paymentMethods
        const term = searchTerm.toLowerCase()
        return paymentMethods.filter(item =>
            item.name.toLowerCase().includes(term) ||
            item.id.toString().includes(term)
        )
    }, [paymentMethods, searchTerm])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const method = editingItem ? 'PUT' : 'POST'
            const response = await fetch('/api/payment-methods', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: parseInt(formData.id),
                    name: formData.name
                })
            })

            if (response.ok) {
                alert(`Forma de pagamento ${editingItem ? 'atualizada' : 'criada'} com sucesso.`)
                setIsDialogOpen(false)
                fetchPaymentMethods()
                resetForm()
            } else {
                const errorData = await response.json()
                alert(errorData.error || 'Erro ao realizar operação.')
            }
        } catch (error) {
            console.error('Erro ao salvar:', error)
            alert('Erro de conexão com o servidor.')
        } finally {
            setIsSaving(false)
        }
    }

    const handleEdit = (item: PaymentMethod) => {
        setEditingItem(item)
        setFormData({
            id: item.id.toString(),
            name: item.name
        })
        setIsDialogOpen(true)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Tem certeza que deseja excluir esta forma de pagamento?')) return

        try {
            const response = await fetch(`/api/payment-methods?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                alert('Forma de pagamento excluída com sucesso.')
                fetchPaymentMethods()
            } else {
                const errorData = await response.json()
                alert(errorData.error || 'Erro ao excluir.')
            }
        } catch (error) {
            console.error('Erro ao excluir:', error)
        }
    }

    const resetForm = () => {
        setEditingItem(null)
        setFormData({ id: '', name: '' })
    }

    if (!canManage && !isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex">
                <Sidebar />
                <div className="flex-1 lg:pl-64 flex items-center justify-center p-6">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="text-red-600">Acesso Negado</CardTitle>
                            <CardDescription>Você não tem permissão para gerenciar a integração bancária.</CardDescription>
                        </CardHeader>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
            <Sidebar />

            <main className="flex-1 lg:pl-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Formas de Pagamento</h1>
                            {/* <p className="text-gray-500 mt-1">Gerencie os métodos de transação financeira do sistema.</p> */}
                        </div>

                        <Dialog open={isDialogOpen} onOpenChange={(open) => {
                            setIsDialogOpen(open)
                            if (!open) resetForm()
                        }}>
                            <DialogTrigger asChild>
                                <Button className="shadow-sm transition-all hover:shadow-md" onClick={resetForm}>
                                    <Plus className="mr-2 h-4 w-4" /> Nova Forma de Pagamento
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <form onSubmit={handleSubmit}>
                                    <DialogHeader>
                                        <DialogTitle>{editingItem ? 'Editar Forma de Pagamento' : 'Nova Forma de Pagamento'}</DialogTitle>
                                        {/* <DialogDescription>
                                            Insira o código e o nome da forma de pagamento.
                                        </DialogDescription> */}
                                    </DialogHeader>
                                    <div className="grid gap-6 py-6">
                                        <div className="grid gap-2">
                                            <Label htmlFor="id">Código</Label>
                                            <Input
                                                id="id"
                                                name="id"
                                                type="number"
                                                placeholder="Ex: 1"
                                                value={formData.id}
                                                onChange={handleInputChange}
                                                required
                                                disabled={!!editingItem}
                                                className="bg-gray-50 focus:bg-white"
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="name">Nome</Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder="Ex: Cartão de Crédito"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                maxLength={60}
                                                required
                                                className="bg-gray-50 focus:bg-white"
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isSaving}>
                                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Salvar Alterações
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </header>

                    <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-white border-b border-gray-100 flex flex-row items-center justify-between py-4">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Pesquisar por nome ou código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                                    <p>Carregando registros...</p>
                                </div>
                            ) : filteredItems.length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-gray-50/50">
                                        <TableRow>
                                            <TableHead className="w-[100px] font-semibold text-gray-600 px-6">Código</TableHead>
                                            <TableHead className="font-semibold text-gray-600">Nome</TableHead>
                                            <TableHead className="text-right font-semibold text-gray-600 px-6">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <TableCell className="font-medium text-gray-900 px-6">{item.id}</TableCell>
                                                <TableCell>{item.name}</TableCell>
                                                <TableCell className="text-right px-6">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(item)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <CreditCard className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Nenhuma forma de pagamento encontrada.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
