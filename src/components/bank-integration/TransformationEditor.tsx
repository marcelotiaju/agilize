'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, ChevronDown, ChevronUp, Wand2 } from 'lucide-react'
import type { TransformStep, TransformType, ConvertMap } from '@/lib/transformation-types'
import { describeTransformation } from '@/lib/transformation-types'

// ─── Types ─────────────────────────────────────────────────────────────────

interface TransformationEditorProps {
    value: TransformStep | null
    onChange: (step: TransformStep | null) => void
    sourceColumns: Array<{ code: string; name: string }>
    dbFields?: {
        Launch: Array<{ value: string; label: string }>
        Congregation: Array<{ value: string; label: string }>
        Contributor: Array<{ value: string; label: string }>
    }
}

const TRANSFORM_LABELS: Record<TransformType, string> = {
    FIXED: 'Valor Fixo',
    SOURCE: 'Campo do Arquivo Origem',
    DB_FIELD: 'Campo do Banco de Dados',
    CONFIG_FIELD: 'Campo da Configuração (Aba Ident.',
    LOOKUP: 'Busca no Banco (Lookup)',
    FALLBACK: 'Fallback (tenta alternativas)',
    CONCAT: 'Concatenar Campos',
    FORMAT_DATE: 'Formatar Data',
    CONVERT: 'Converter Valores',
    REPLACE: 'Substituir Texto',
}

const TRANSFORM_DESCRIPTIONS: Record<TransformType, string> = {
    FIXED: 'Grava um valor fixo/literal no campo',
    SOURCE: 'Copia diretamente de uma coluna do arquivo origem',
    DB_FIELD: 'Usa um valor de uma tabela do banco de dados',
    CONFIG_FIELD: 'Usa um valor padrão definido na aba Identificação',
    LOOKUP: 'Busca um registro no banco usando um campo do arquivo (ex: CPF → Código)',
    FALLBACK: 'Tenta as etapas em ordem, usa a primeira que retornar valor',
    CONCAT: 'Junta vários campos/textos em uma só string',
    FORMAT_DATE: 'Converte formato de data (ex: DDMMYYYY → YYYY-MM-DD)',
    CONVERT: 'Troca valores por mapeamento (ex: D → DEBIT, C → CREDIT)',
    REPLACE: 'Substitui texto dentro de um campo',
}

// ─── Default empty steps per type ─────────────────────────────────────────

function defaultStep(type: TransformType): TransformStep {
    switch (type) {
        case 'FIXED': return { type, value: '' }
        case 'SOURCE': return { type, field: '' }
        case 'DB_FIELD': return { type, table: 'Launch', field: '' }
        case 'CONFIG_FIELD': return { type, configField: 'financialEntityId' }
        case 'LOOKUP': return { type, sourceField: '', searchTable: 'Contributor', searchBy: 'cpf', returnField: 'code' }
        case 'FALLBACK': return { type, parts: [defaultStep('SOURCE')] }
        case 'CONCAT': return { type, parts: [defaultStep('SOURCE')], separator: ' ' }
        case 'FORMAT_DATE': return { type, sourceField: '', inputFormat: 'DD/MM/YYYY', outputFormat: 'YYYY-MM-DD' }
        case 'CONVERT': return { type, sourceField: '', map: [{ from: '', to: '' }], default: '' }
        case 'REPLACE': return { type, sourceField: '', find: '', replaceWith: '' }
    }
}

// ─── Sub-editor for CONCAT / FALLBACK parts ────────────────────────────────

interface PartListProps {
    parts: TransformStep[]
    onChange: (parts: TransformStep[]) => void
    sourceColumns: TransformationEditorProps['sourceColumns']
    dbFields?: TransformationEditorProps['dbFields']
    label: string
}

function PartList({ parts, onChange, sourceColumns, dbFields, label }: PartListProps) {
    const addPart = () => onChange([...parts, defaultStep('SOURCE')])
    const removePart = (i: number) => onChange(parts.filter((_, idx) => idx !== i))
    const updatePart = (i: number, step: TransformStep | null) => {
        const next = [...parts]
        if (step) next[i] = step
        onChange(next)
    }
    const movePart = (i: number, dir: -1 | 1) => {
        const next = [...parts]
        const j = i + dir
        if (j < 0 || j >= next.length) return
            ;[next[i], next[j]] = [next[j], next[i]]
        onChange(next)
    }

    return (
        <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</Label>
            {parts.map((part, i) => (
                <div key={i} className="flex items-start gap-2 border rounded-md p-2 bg-gray-50">
                    <div className="flex flex-col gap-1">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => movePart(i, -1)} disabled={i === 0}>
                            <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => movePart(i, 1)} disabled={i === parts.length - 1}>
                            <ChevronDown className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="flex-1">
                        <StepForm
                            step={part}
                            onChange={(s) => updatePart(i, s)}
                            sourceColumns={sourceColumns}
                            dbFields={dbFields}
                            compact
                        />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => removePart(i)}>
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addPart} className="w-full text-xs">
                <Plus className="h-3 w-3 mr-1" /> Adicionar etapa
            </Button>
        </div>
    )
}

// ─── Step Form ────────────────────────────────────────────────────────────

interface StepFormProps {
    step: TransformStep
    onChange: (step: TransformStep) => void
    sourceColumns: TransformationEditorProps['sourceColumns']
    dbFields?: TransformationEditorProps['dbFields']
    compact?: boolean
}

function StepForm({ step, onChange, sourceColumns, dbFields, compact }: StepFormProps) {
    const up = (patch: Partial<TransformStep>) => onChange({ ...step, ...patch })

    const sourceField = (label = 'Campo do arquivo origem', key = 'sourceField') => (
        <div className="grid gap-1">
            <Label className="text-xs">{label}</Label>
            <Select value={(step as any)[key] ?? ''} onValueChange={(v) => up({ [key]: v } as any)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                    {sourceColumns.map(c => (
                        <SelectItem key={c.code} value={c.code} className="text-xs">{c.code} — {c.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
    const renderInnerForm = () => {
        switch (step.type) {
            case 'FIXED': return (
                <div className="grid gap-1">
                    <Label className="text-xs">Valor fixo</Label>
                    <Input className="h-8 text-xs" value={step.value ?? ''} onChange={e => up({ value: e.target.value })} placeholder="Digite o valor..." />
                </div>
            )

            case 'SOURCE': return (
                <div className="grid gap-1">
                    <Label className="text-xs">Campo do arquivo origem</Label>
                    <Select value={step.field ?? ''} onValueChange={(v) => up({ field: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a coluna..." /></SelectTrigger>
                        <SelectContent>
                            {sourceColumns.map(c => (
                                <SelectItem key={c.code} value={c.code} className="text-xs">{c.code} — {c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )

            case 'DB_FIELD': return (
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid gap-1">
                        <Label className="text-xs">Tabela</Label>
                        <Select value={step.table ?? 'Launch'} onValueChange={(v) => up({ table: v, field: '' })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Launch" className="text-xs">Lançamento</SelectItem>
                                <SelectItem value="Congregation" className="text-xs">Congregação</SelectItem>
                                <SelectItem value="Contributor" className="text-xs">Contribuinte</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-1">
                        <Label className="text-xs">Campo</Label>
                        <Select value={step.field ?? ''} onValueChange={(v) => up({ field: v })}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Campo..." /></SelectTrigger>
                            <SelectContent>
                                {(dbFields?.[step.table as keyof typeof dbFields] ?? []).map(f => (
                                    <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )

            case 'CONFIG_FIELD': return (
                <div className="grid gap-1">
                    <Label className="text-xs">Campo da Configuração</Label>
                    <Select value={step.configField ?? 'financialEntityId'} onValueChange={(v) => up({ configField: v })}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o campo..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="financialEntityId" className="text-xs">Entidade Financeira</SelectItem>
                            <SelectItem value="paymentMethodId" className="text-xs">Forma de Pagamento Default</SelectItem>
                            <SelectItem value="accountPlan" className="text-xs">Plano de Contas Default</SelectItem>
                            <SelectItem value="launchType" className="text-xs">Tipo de Lançamento Default (Crédito/Débito)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )

            case 'LOOKUP': return (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        {sourceField('Campo do arquivo (entrada)', 'sourceField')}
                        <div className="grid gap-1">
                            <Label className="text-xs">Buscar em</Label>
                            <Select value={step.searchTable ?? 'Contributor'} onValueChange={(v) => up({ searchTable: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Contributor" className="text-xs">Contribuinte</SelectItem>
                                    <SelectItem value="Supplier" className="text-xs">Fornecedor</SelectItem>
                                    <SelectItem value="Congregation" className="text-xs">Congregação</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Comparar por campo</Label>
                            <Select value={step.searchBy ?? 'cpf'} onValueChange={(v) => up({ searchBy: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cpf" className="text-xs">CPF</SelectItem>
                                    <SelectItem value="code" className="text-xs">Código Interno</SelectItem>
                                    <SelectItem value="name" className="text-xs">Nome</SelectItem>
                                    <SelectItem value="cpfCnpj" className="text-xs">CPF/CNPJ (Fornecedor)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Retornar campo</Label>
                            <Select disabled={step.returnEmptyIfFound} value={['code', 'name', 'tipo', 'ecclesiasticalPosition'].includes(step.returnField ?? '') ? step.returnField : 'custom'} onValueChange={(v) => up({ returnField: v === 'custom' ? '' : v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="code" className="text-xs">Código</SelectItem>
                                    <SelectItem value="name" className="text-xs">Nome</SelectItem>
                                    <SelectItem value="tipo" className="text-xs">Tipo (Membro/Congregado)</SelectItem>
                                    <SelectItem value="ecclesiasticalPosition" className="text-xs">Cargo Eclesiástico</SelectItem>
                                    <SelectItem value="custom" className="text-xs">Outro (especificar abaixo)...</SelectItem>
                                </SelectContent>
                            </Select>
                            {(!['code', 'name', 'tipo', 'ecclesiasticalPosition'].includes(step.returnField ?? '')) && !step.returnEmptyIfFound && (
                                <Input className="h-8 text-xs mt-1" value={step.returnField ?? ''} onChange={e => up({ returnField: e.target.value })} placeholder="Nome do campo no banco..." />
                            )}
                            <div className="flex items-center gap-2 mt-2">
                                <input
                                    type="checkbox"
                                    id="returnEmptyIfFound"
                                    checked={step.returnEmptyIfFound || false}
                                    onChange={(e) => up({ returnEmptyIfFound: e.target.checked })}
                                    className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <Label htmlFor="returnEmptyIfFound" className="text-[10px] text-blue-700 font-medium cursor-pointer">
                                    Retornar Vazio se encontrar (Útil para filtrar não-cadastrados)
                                </Label>
                            </div>
                        </div>
                    </div>

                    {!step.returnEmptyIfFound && (
                        <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                            <Label className="text-xs uppercase font-bold text-blue-500 mb-2 block">Transformar Resultado (ex: Abreviações)</Label>
                            <div className="grid gap-2">
                                {(step.map ?? []).map((m, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="flex-1">
                                            <Label className="text-[10px] text-gray-400">De (Valor no Banco)</Label>
                                            <Input className="h-8 text-xs" value={m.from} onChange={e => {
                                                const newMap = [...(step.map || [])]
                                                newMap[idx].from = e.target.value
                                                up({ map: newMap })
                                            }} placeholder="ex: Pastor" />
                                        </div>
                                        <span className="text-xs pt-4">→</span>
                                        <div className="flex-1">
                                            <Label className="text-[10px] text-gray-400">Para (Resultado Final)</Label>
                                            <Input className="h-8 text-xs" value={m.to} onChange={e => {
                                                const newMap = [...(step.map || [])]
                                                newMap[idx].to = e.target.value
                                                up({ map: newMap })
                                            }} placeholder="ex: Pr" />
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 mt-4" onClick={() => {
                                            const newMap = (step.map || []).filter((_, i) => i !== idx)
                                            up({ map: newMap })
                                        }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" className="h-8 text-xs justify-start w-full hover:bg-blue-100 border-dashed border-blue-300" onClick={() => up({ map: [...(step.map || []), { from: '', to: '' }] })}>
                                    <Plus className="w-3 h-3 mr-2" /> Adicionar Abreviação/Mapeamento
                                </Button>
                                <p className="text-[10px] text-gray-500 italic mt-1">Se encontrar o registro, o valor retornado do campo será convertido conforme o mapeamento acima.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                        {step.searchTable === 'Contributor' && (
                            <div className="grid gap-1">
                                <Label className="text-xs">Condição (Tipo)</Label>
                                <Select value={step.searchCondition ?? 'NONE'} onValueChange={(v) => up({ searchCondition: v as any })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NONE" className="text-xs">Qualquer Tipo</SelectItem>
                                        <SelectItem value="MEMBRO" className="text-xs">Apenas Membros</SelectItem>
                                        <SelectItem value="CONGREGADO" className="text-xs">Apenas Congregados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="grid gap-1">
                            <Label className="text-xs">Se não encontrar (Fallback)</Label>
                            <Select value={step.fallbackType ?? 'EMPTY'} onValueChange={(v) => up({ fallbackType: v as any })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EMPTY" className="text-xs">Deixar Vazio</SelectItem>
                                    <SelectItem value="SOURCE" className="text-xs">Usar Campo do Arquivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {step.fallbackType === 'SOURCE' && (
                            <div className="grid gap-1">
                                <Label className="text-xs">Campo Fallback</Label>
                                <Select value={step.fallbackSourceField ?? ''} onValueChange={(v) => up({ fallbackSourceField: v })}>
                                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                    <SelectContent>
                                        {sourceColumns.map(c => (
                                            <SelectItem key={c.code} value={c.code} className="text-xs">{c.code} — {c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </div>
            )

            case 'FALLBACK': return (
                <PartList
                    label="Etapas (usa a primeira que retornar valor)"
                    parts={step.parts ?? []}
                    onChange={(parts) => up({ parts })}
                    sourceColumns={sourceColumns}
                    dbFields={dbFields}
                />
            )

            case 'CONCAT': return (
                <div className="grid gap-3">
                    <div className="grid gap-1">
                        <Label className="text-xs">Separador</Label>
                        <Input className="h-8 text-xs w-32" value={step.separator ?? ''} onChange={e => up({ separator: e.target.value })} placeholder="ex: ' - ' ou espaço" />
                    </div>
                    <PartList
                        label="Partes a concatenar"
                        parts={step.parts ?? []}
                        onChange={(parts) => up({ parts })}
                        sourceColumns={sourceColumns}
                        dbFields={dbFields}
                    />
                </div>
            )

            case 'FORMAT_DATE': return (
                <div className="grid grid-cols-1 gap-4">
                    {sourceField('Campo com a data', 'sourceField')}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid gap-1">
                            <Label className="text-xs">Formato de entrada</Label>
                            <Select value={step.inputFormat ?? 'DD/MM/YYYY'} onValueChange={(v) => up({ inputFormat: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="text-xs">
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="DDMMYYYY">DDMMYYYY</SelectItem>
                                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                    <SelectItem value="YYYYMMDD">YYYYMMDD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Formato de saída</Label>
                            <Select value={step.outputFormat ?? 'YYYY-MM-DD'} onValueChange={(v) => up({ outputFormat: v })}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent className="text-xs">
                                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                                    <SelectItem value="DDMMYYYY">DDMMYYYY</SelectItem>
                                    <SelectItem value="YYYYMMDD">YYYYMMDD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )

            case 'CONVERT': {
                const map: ConvertMap[] = step.map ?? []
                const addEntry = () => onChange({ ...step, map: [...map, { from: '', to: '' }] })
                const removeEntry = (i: number) => onChange({ ...step, map: map.filter((_, idx) => idx !== i) })
                const updateEntry = (i: number, k: 'from' | 'to', v: string) => {
                    const next = [...map]
                    next[i] = { ...next[i], [k]: v }
                    onChange({ ...step, map: next })
                }
                return (
                    <div className="grid gap-3">
                        {sourceField('Campo do arquivo (entrada)', 'sourceField')}
                        <div className="grid gap-1">
                            <Label className="text-xs">Mapeamento (De → Para)</Label>
                            {map.map((entry, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <Input className="h-7 text-xs flex-1" value={entry.from} onChange={e => updateEntry(i, 'from', e.target.value)} placeholder="De" />
                                    <span className="text-xs text-gray-400">→</span>
                                    <Input className="h-7 text-xs flex-1" value={entry.to} onChange={e => updateEntry(i, 'to', e.target.value)} placeholder="Para" />
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => removeEntry(i)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={addEntry}>
                                <Plus className="h-3 w-3 mr-1" /> Adicionar mapeamento
                            </Button>
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Valor padrão (se não encontrar)</Label>
                            <Input className="h-8 text-xs" value={step.default ?? ''} onChange={e => up({ default: e.target.value })} placeholder="Deixar vazio ou informar padrão..." />
                        </div>
                    </div>
                )
            }

            case 'REPLACE': return (
                <div className="grid gap-4">
                    {sourceField('Campo do arquivo (entrada)', 'sourceField')}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="grid gap-1">
                            <Label className="text-xs">Localizar</Label>
                            <Input className="h-8 text-xs" value={step.find ?? ''} onChange={e => up({ find: e.target.value })} placeholder="Texto a localizar" />
                        </div>
                        <div className="grid gap-1">
                            <Label className="text-xs">Substituir por</Label>
                            <Input className="h-8 text-xs" value={step.replaceWith ?? ''} onChange={e => up({ replaceWith: e.target.value })} placeholder="Novo texto (vazio = remove)" />
                        </div>
                    </div>
                </div>
            )

            default: return null
        }
    }

    if (compact) {
        return (
            <div className="flex flex-col gap-3 w-full">
                <div className="grid gap-1 pb-3 mb-1 border-b border-gray-200">
                    <Label className="text-[10px] uppercase text-blue-600 font-bold tracking-wider">Mudar Tipo deste trecho</Label>
                    <Select value={step.type} onValueChange={(v) => onChange(defaultStep(v as TransformType))}>
                        <SelectTrigger className="h-7 text-xs bg-blue-50 border-blue-200"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {(Object.keys(TRANSFORM_LABELS) as TransformType[]).map(t => (
                                <SelectItem key={t} value={t} className="text-xs">{TRANSFORM_LABELS[t]}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                {renderInnerForm()}
            </div>
        )
    }

    return renderInnerForm()
}

// ─── Main Editor Modal ────────────────────────────────────────────────────

export function TransformationEditor({ value, onChange, sourceColumns, dbFields }: TransformationEditorProps) {
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<TransformStep | null>(null)

    const handleOpen = useCallback(() => {
        setDraft(value ? { ...value } : null)
        setOpen(true)
    }, [value])

    const handleSave = () => {
        onChange(draft)
        setOpen(false)
    }

    const handleClear = () => {
        onChange(null)
        setOpen(false)
    }

    const handleTypeChange = (type: TransformType) => {
        setDraft(defaultStep(type))
    }

    const summary = describeTransformation(value)
    const hasValue = !!value

    return (
        <>
            <Button
                type="button"
                variant={hasValue ? 'default' : 'outline'}
                size="sm"
                className={`h-8 text-xs w-full justify-start gap-2 font-normal ${hasValue ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                onClick={handleOpen}
            >
                <Wand2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{summary}</span>
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wand2 className="h-5 w-5 text-blue-600" />
                            Editor de Transformação
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex flex-col sm:flex-row gap-4 min-h-0 flex-1 overflow-x-auto">
                        {/* Left — Type selector */}
                        <div className="w-48 shrink-0 border-r pr-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Tipo de transformação</p>
                            <div className="space-y-1">
                                {(Object.keys(TRANSFORM_LABELS) as TransformType[]).map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => handleTypeChange(t)}
                                        className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-colors ${draft?.type === t
                                            ? 'bg-blue-600 text-white'
                                            : 'hover:bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {TRANSFORM_LABELS[t]}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Right — Form */}
                        <ScrollArea className="flex-1 pr-1">
                            {!draft ? (
                                <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
                                    <Wand2 className="h-8 w-8" />
                                    <p>Selecione um tipo de transformação ao lado</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-sm">{TRANSFORM_LABELS[draft.type]}</h3>
                                        <p className="text-xs text-gray-500">{TRANSFORM_DESCRIPTIONS[draft.type]}</p>
                                    </div>
                                    <Separator />
                                    <StepForm
                                        step={draft}
                                        onChange={setDraft}
                                        sourceColumns={sourceColumns}
                                        dbFields={dbFields}
                                    />
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <Separator />
                    <DialogFooter className="gap-2 flex-wrap">
                        {hasValue && (
                            <Button type="button" variant="ghost" size="sm" className="text-red-500 mr-auto" onClick={handleClear}>
                                Limpar transformação
                            </Button>
                        )}
                        <Badge variant="outline" className="text-xs">
                            {draft ? TRANSFORM_LABELS[draft.type] : 'Nenhuma'}
                        </Badge>
                        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="button" size="sm" onClick={handleSave} disabled={!draft}>Aplicar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
