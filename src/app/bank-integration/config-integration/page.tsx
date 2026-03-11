'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Sidebar } from '@/components/layout/sidebar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit, Trash2, Settings, Search, Loader2, Landmark, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BankIntegrationConfig {
    id: string
    code: string
    name: string
    financialEntity: { name: string }
    paymentMethod: { name: string }
    createdAt: string
}

export default function ConfigIntegrationPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const [configs, setConfigs] = useState<BankIntegrationConfig[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const canManage = Boolean((session?.user as any)?.canManageBankIntegration)

    useEffect(() => {
        if (canManage) {
            fetchConfigs()
        }
    }, [canManage])

    const fetchConfigs = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/bank-integration/config')
            if (response.ok) {
                const data = await response.json()
                setConfigs(data)
            } else {
                console.error('Falha ao buscar configurações')
            }
        } catch (error) {
            console.error('Erro ao buscar configurações:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const filteredItems = useMemo(() => {
        if (!searchTerm) return configs
        const term = searchTerm.toLowerCase()
        return configs.filter(item =>
            item.name.toLowerCase().includes(term) ||
            item.code.toLowerCase().includes(term) ||
            item.financialEntity.name.toLowerCase().includes(term)
        )
    }, [configs, searchTerm])

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este layout de integração?')) return

        try {
            const response = await fetch(`/api/bank-integration/config/${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                fetchConfigs()
            } else {
                const errorData = await response.json()
                alert(errorData.error || 'Erro ao excluir.')
            }
        } catch (error) {
            console.error('Erro ao excluir:', error)
        }
    }

    if (!canManage && !isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
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
                        <div className="text-center md:text-left">
                            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Layouts de Integração</h1>
                            {/* <p className="text-sm md:text-base text-gray-500 mt-1">Gerencie as configurações de importação e exportação bancária.</p> */}
                        </div>

                        <Button asChild className="w-full md:w-auto shadow-sm transition-all hover:shadow-md">
                            <Link href="/bank-integration/config-integration/new">
                                <Plus className="mr-2 h-4 w-4" /> Novo Layout
                            </Link>
                        </Button>
                    </header>

                    <Card className="border-none shadow-sm overflow-hidden bg-white">
                        <CardHeader className="bg-white border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between py-4 gap-4">
                            <div className="relative w-full max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Pesquisar por nome ou código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-gray-50 border-none focus:ring-2 focus:ring-primary/20 transition-all w-full"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Loader2 className="h-10 w-10 animate-spin mb-4" />
                                    <p>Carregando layouts...</p>
                                </div>
                            ) : filteredItems.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[800px] md:min-w-full">
                                        <TableHeader className="bg-gray-50/50">
                                            <TableRow>
                                                <TableHead className="w-[120px] font-semibold text-gray-600 px-6">Código</TableHead>
                                                <TableHead className="font-semibold text-gray-600">Nome do Layout</TableHead>
                                                <TableHead className="font-semibold text-gray-600">Entidade Financeira</TableHead>
                                                <TableHead className="font-semibold text-gray-600">Forma Pagto</TableHead>
                                                <TableHead className="text-right font-semibold text-gray-600 px-6">Ações</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredItems.map((item) => (
                                                <TableRow key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <TableCell className="font-medium text-gray-900 px-6">{item.code}</TableCell>
                                                    <TableCell className="font-semibold">{item.name}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center text-gray-600">
                                                            <Landmark className="mr-2 h-3 w-3 opacity-50" />
                                                            {item.financialEntity.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center text-gray-600">
                                                            <CreditCard className="mr-2 h-3 w-3 opacity-50" />
                                                            {item.paymentMethod.name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right px-6">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-gray-500 hover:text-primary hover:bg-primary/5">
                                                                <Link href={`/bank-integration/config-integration/${item.id}`}>
                                                                    <Edit className="h-4 w-4" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <Settings className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Nenhum layout de integração encontrado.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    )
}
