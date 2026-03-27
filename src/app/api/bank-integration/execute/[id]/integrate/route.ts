import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { LaunchType, LaunchStatus } from "@prisma/client"

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const userName = session?.user?.name || "Sistema"
    
    if (!session || !(session.user as any)?.canManageBankIntegration) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const prisma = await getDb(request)

    try {
        const batch = await prisma.bankIntegrationBatch.findUnique({
            where: { id },
            include: {
                config: {
                    include: { destinationColumns: true }
                },
                financialEntity: true,
                rows: { 
                    where: { isValid: true, isIntegrated: false },
                    orderBy: { rowIndex: 'asc' }
                },
                importedByUser: true
            }
        })

        if (!batch) return NextResponse.json({ error: "Lote não encontrado" }, { status: 404 })
        if (batch.status === "INTEGRATED") return NextResponse.json({ error: "Lote já totalmente integrado" }, { status: 400 })
        if (batch.rows.length === 0) return NextResponse.json({ error: "Nenhum registro pendente (válido e não integrado) foi encontrado." }, { status: 400 })

        const congregationId = batch.financialEntity.congregationId
        if (!congregationId) return NextResponse.json({ error: "Entidade não tem congregação vinculada" }, { status: 400 })

        let classificationId = batch.config.accountPlan || null
        if (classificationId) {
             const cls = await prisma.classification.findFirst({ 
                 where: { 
                     OR: [
                         { id: classificationId },
                         { code: classificationId },
                         { shortCode: classificationId }
                     ]
                 } 
             })
             classificationId = cls ? cls.id : null 
        }

        const launchesToProcess: any[] = []
        const destCols = batch.config.destinationColumns
        const normalizeKey = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '')

        const getVal = (rowDest: any, keywords: string[]) => {
            for (const col of destCols) {
                const nk = normalizeKey(col.name)
                if (keywords.some(k => nk.includes(k))) {
                    if (rowDest[col.code] !== undefined && rowDest[col.code] !== null && rowDest[col.code] !== "") return rowDest[col.code]
                }
            }
            const keys = Object.keys(rowDest)
            for (const k of keys) {
                const nk = normalizeKey(k)
                if (keywords.some(kw => nk.includes(kw))) {
                    if (rowDest[k] !== undefined && rowDest[k] !== null && rowDest[k] !== "") return rowDest[k]
                }
            }
            return null
        }

        for (const row of batch.rows) {
            const dest = JSON.parse(row.destinationData || "{}")

            const rawDate = getVal(dest, ['data', 'emissao', 'vencimento', 'date'])
            const rawValue = getVal(dest, ['valor', 'total', 'amount', 'vl'])
            const rawDesc = getVal(dest, ['hist', 'desc', 'obs']) || getVal(dest, ['nome'])
            const rawContributorCode = getVal(dest, ['codigo', 'matricula', 'cod', 'lookup', 'id'])
            const rawContributorName = getVal(dest, ['contribuinte', 'nome', 'contributor', 'name'])
            const rawCongregationData = getVal(dest, ['congregacao', 'unidade', 'congregation', 'unit', 'filial'])

            let parsedDate = new Date();
            parsedDate.setHours(12, 0, 0, 0);
            if (rawDate) {
                const sDate = String(rawDate).trim();
                const dateOnly = sDate.split('T')[0].split(' ')[0];
                let day = 0, month = 0, year = 0;
                
                if (dateOnly.includes('/')) {
                    const parts = dateOnly.split('/');
                    if (parts.length === 3) {
                        day = parseInt(parts[0], 10);
                        month = parseInt(parts[1], 10) - 1;
                        year = parseInt(parts[2], 10);
                        if (year < 100) year += 2000;
                    }
                } else if (dateOnly.includes('-')) {
                    const parts = dateOnly.split('-');
                    if (parts.length === 3) {
                        year = parseInt(parts[0], 10);
                        month = parseInt(parts[1], 10) - 1;
                        day = parseInt(parts[2], 10);
                    }
                }
                
                if (day > 0 && year > 1900) {
                    const dt = new Date(year, month, day, 12, 0, 0);
                    if (!isNaN(dt.getTime())) parsedDate = dt;
                } else {
                    const dt = new Date(sDate);
                    if (!isNaN(dt.getTime())) {
                        dt.setHours(12, 0, 0, 0);
                        parsedDate = dt;
                    }
                }
            }

            let numValue = 0
            if (rawValue) {
                let sVal = String(rawValue).trim().replace('R$', '').replace(/\s/g, '')
                if (sVal.includes('.') && sVal.includes(',')) {
                    sVal = sVal.replace(/\./g, '').replace(',', '.')
                } else {
                    sVal = sVal.replace(',', '.')
                }
                numValue = parseFloat(sVal)
                if (isNaN(numValue)) numValue = 0
            }

            let currentLaunchCongregationId = congregationId
            if ((batch.config as any).congregationSource === 'FROM_FILE' && rawCongregationData) {
                const s = String(rawCongregationData).trim()
                if (s) {
                    const cong = await prisma.congregation.findFirst({
                        where: { OR: [{ id: s }, { code: s }, { name: s }] }
                    })
                    if (cong) {
                        currentLaunchCongregationId = cong.id
                    }
                }
            }

            let cId = row.contributorId || null
            let cName = row.contributorName || null
            let finalDesc = ''

            // Se tiver vínculo (cId), buscar no banco para gerar a descrição rica
            if (cId) {
                const ct = await prisma.contributor.findUnique({ where: { id: cId } })
                if (ct) {
                    const pos = (ct.ecclesiasticalPosition || '').trim().toUpperCase()
                    const tipo = (ct.tipo || '').trim().toUpperCase()
                    
                    const officeMap: Record<string, string> = {
                        'AUXILIAR': 'Aux',
                        'DIÁCONO': 'Dc',
                        'PRESBÍTERO': 'Pb',
                        'EVANGELISTA': 'Ev',
                        'PASTOR': 'Pr',
                    }
                    
                    let cargo = officeMap[pos] || ''
                    if (!cargo) {
                        if (pos === 'CONGREGADO' || tipo === 'CONGREGADO') cargo = 'Congregado'
                        else cargo = 'Membro'
                    }
                    
                    finalDesc = `DÍZIMOS E OFERTAS DE  -${cargo} -${ct.name} -${ct.cpf || ''}`
                }
            }

            if (!finalDesc) {
                const baseName = cName || rawDesc || `Importação Bancária #${batch.sequentialNumber}`
                finalDesc = String(baseName).substring(0, 200)
            }

            finalDesc = `${finalDesc} (Integrado p/ ${userName.split(' ')[0]})`

            launchesToProcess.push({
                rowData: row,
                launchData: {
                    congregationId: currentLaunchCongregationId,
                    type: numValue === 15.00 ? 'CARNE_REVIVER' : 'DIZIMO' as LaunchType,
                    date: parsedDate,
                    value: numValue,
                    description: finalDesc.substring(0, 255),
                    status: 'INTEGRATED' as LaunchStatus,
                    isIntegrated: true,
                    integrationBatchId: batch.id,
                    contributorId: cId,
                    contributorName: cName,
                    classificationId,
                    financialEntityId: batch.config.financialEntityId,
                    createdBy: session.user.name
                }
            })
        }

        await prisma.$transaction(async (tx) => {
            for (const item of launchesToProcess) {
                const newLaunch = await tx.launch.create({ data: item.launchData })
                
                await tx.bankIntegrationRow.update({
                    where: { id: item.rowData.id },
                    data: { 
                        isIntegrated: true,
                        launchId: newLaunch.id
                    }
                })
            }

            const remaining = await tx.bankIntegrationRow.count({
                where: { batchId: batch.id, isValid: true, isIntegrated: false }
            })

            if (remaining === 0) {
                await tx.bankIntegrationBatch.update({
                    where: { id: batch.id },
                    data: { status: "INTEGRATED" }
                })
            }
        }, { timeout: 60000 })

        return NextResponse.json({ success: true, integratedCount: launchesToProcess.length })
    } catch (e: any) {
        console.error("Integration Error:", e)
        return NextResponse.json({ error: `Erro na integração: ${e.message}` }, { status: 500 })
    }
}
