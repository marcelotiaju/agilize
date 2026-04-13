import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/getDb"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../auth/[...nextauth]/route"
import { LaunchType, LaunchStatus } from "@prisma/client"
import { evaluateTransformation, evaluateFilter, parseTransformation, getMappedOffice, extractNumericValue } from "@/lib/transformation-engine"

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
                    include: {
                        destinationColumns: true,
                        launchIntegrationRules: true
                    }
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

        const filters = (batch.config as any).filters || []

        for (const row of batch.rows) {
            const dest = JSON.parse(row.destinationData || "{}")
            const source = JSON.parse(row.sourceData || "{}")

            if (!evaluateFilter(source, filters)) continue

            // Prepare context for launch integration rules evaluation
            const dbFields: Record<string, any> = {}
            const ctxForLaunchRules = {
                row: source,
                dbFields,
                config: {
                    financialEntityId: batch.config.financialEntityId,
                    paymentMethodId: batch.config.paymentMethodId,
                    accountPlan: batch.config.accountPlan,
                    launchType: batch.config.launchType
                },
                congregationId: batch.financialEntity.congregationId
            }

            // Evaluate launchIntegrationRules to get dynamic launch field values
            const launchRuleValues: Record<string, string> = {}
            for (const rule of (batch.config as any).launchIntegrationRules || []) {
                const step = parseTransformation(rule.transformation)
                if (step) {
                    try {
                        const val = await evaluateTransformation(step, ctxForLaunchRules)
                        launchRuleValues[rule.code] = val
                    } catch (e) {
                        console.error(`Error evaluating rule ${rule.code}:`, e)
                        launchRuleValues[rule.code] = ''
                    }
                }
            }

            // Helper to find a rule value by keywords (name or code)
            const findRuleValue = (keywords: string[]) => {
                for (const rule of (batch.config as any).launchIntegrationRules || []) {
                    const nk = normalizeKey(rule.name || rule.code)
                    if (keywords.some(k => nk.includes(k))) {
                        return launchRuleValues[rule.code]
                    }
                }
                // Try direct code match as fallback
                for (const k of keywords) {
                    if (launchRuleValues[k]) return launchRuleValues[k]
                }
                return null
            }

            const rawDate = findRuleValue(['data', 'emissao', 'vencimento', 'date']) || getVal(dest, ['data', 'emissao', 'vencimento', 'date'])
            const rawValue = findRuleValue(['valor', 'total', 'amount', 'vl']) || getVal(dest, ['valor', 'total', 'amount', 'vl'])
            const rawDesc = findRuleValue(['descricao', 'description', 'historico', 'hist', 'obs']) || getVal(dest, ['hist', 'desc', 'obs']) || getVal(dest, ['nome'])
            const rawContributorCode = findRuleValue(['codigo', 'matricula', 'cod', 'codcontribuinte', 'contribuinte', 'contributor']) || getVal(dest, ['codigo', 'matricula', 'cod', 'codcontribuinte'])
            const rawContributorName = findRuleValue(['nome', 'contribuinte', 'contributor', 'name']) || getVal(dest, ['contribuinte', 'nome', 'contributor', 'name'])
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
                let s = String(rawValue).trim().replace('R$', '').replace(/\s/g, '')
                if (!s) numValue = 0
                else {
                    if (s.includes(',')) {
                        if (s.includes('.')) s = s.replace(/\./g, '')
                        s = s.replace(',', '.')
                    } else if (s.includes('.')) {
                        const parts = s.split('.')
                        if (parts.length > 2) {
                            const lastPart = parts[parts.length - 1]
                            if (lastPart.length === 2 || lastPart.length === 1) {
                                const leading = parts.slice(0, -1).join('')
                                s = leading + '.' + lastPart
                            } else {
                                s = s.replace(/\./g, '')
                            }
                        } else {
                            const lastPart = parts[parts.length - 1]
                            if (lastPart.length === 3) s = s.replace(/\./g, '')
                        }
                    }
                    numValue = parseFloat(s)
                    if (isNaN(numValue)) numValue = 0
                }
            }

            let currentLaunchCongregationId = congregationId

            // 1. Try to get from rules first (if defined)
            const ruleCongregation = findRuleValue(['congregacao', 'unidade', 'congregation', 'unit', 'filial'])
            if (ruleCongregation) {
                const s = String(ruleCongregation).trim()
                if (s) {
                    const cong = await prisma.congregation.findFirst({
                        where: {
                            OR: [
                                { id: s },
                                { code: { equals: s } },
                                { name: { contains: s } }
                            ]
                        }
                    })
                    if (cong) currentLaunchCongregationId = cong.id
                }
            }
            // 2. Fallback to FROM_FILE logic if not set by rules and configured
            else if ((batch.config as any).congregationSource === 'FROM_FILE' && rawCongregationData) {
                const s = String(rawCongregationData).trim()
                if (s) {
                    const cong = await prisma.congregation.findFirst({
                        where: {
                            OR: [
                                { id: s },
                                { code: { equals: s } },
                                { name: { contains: s } }
                            ]
                        }
                    })
                    if (cong) {
                        currentLaunchCongregationId = cong.id
                    }
                }
            }

            let cId = row.contributorId || null
            let cName = row.contributorName || null
            let finalDesc = ''

            // If ID is missing, try to get name from rules (which includes cleaned results)
            if (!cId && !cName) {
                cName = rawContributorName
            }

            // Smart Contributor Lookup: If not already mapped, try finding by code from file
            if (!cId && rawContributorCode) {
                const sCode = String(rawContributorCode).trim()
                if (sCode && sCode !== '0' && sCode !== 'undefined' && sCode !== 'null') {
                    // Try to find contributor by code AND congregation to be safer
                    const ct = await prisma.contributor.findFirst({
                        where: {
                            code: sCode,
                            OR: [
                                { congregationId: currentLaunchCongregationId },
                                { congregationId: null }
                            ]
                        }
                    })
                    if (ct) {
                        cId = ct.id
                        cName = null
                    }
                }
            }

            // If we have an ID, clearing the name is better according to user request
            if (cId) {
                cName = null
            }

            const ruleDescription = findRuleValue(['descricao', 'description', 'historico', 'hist', 'obs'])

            if (ruleDescription) {
                finalDesc = ruleDescription.trim()
            } else if (cId) {
                // Descrição rica apenas se NÃO houver regra de descrição manual
                const ct = await prisma.contributor.findUnique({ where: { id: cId } })
                if (ct) {
                    const ruleCargo = findRuleValue(['cargo', 'posicao', 'office', 'vposition'])
                    const cargo = ruleCargo || getMappedOffice(ct)
                    const normalizedName = ct.name.toUpperCase()
                    finalDesc = `DÍZIMOS E OFERTAS DE  -${cargo} -${normalizedName} -${ct.cpf || ''}`
                }
            }

            if (!finalDesc) {
                const baseName = cName || rawContributorName || rawDesc || `Importação Bancária #${batch.sequentialNumber}`
                finalDesc = String(baseName).substring(0, 200)
            }

            //finalDesc = `${finalDesc} (Integrado p/ ${userName.split(' ')[0]})`

            // Apply launchIntegrationRules to override/set launch fields
            let launchType: LaunchType = 'DIZIMO' as LaunchType
            let launchPaymentMethodId = batch.config.paymentMethodId
            let launchClassificationId = classificationId
            let launchDescription = finalDesc

            // Check if any rule sets a specific launch field
            const ruleLaunchType = findRuleValue(['tipo', 'type', 'launchtype'])
            if (ruleLaunchType) {
                const val = ruleLaunchType.toUpperCase().trim()
                if (val === 'C' || val === 'CREDIT' || val === 'CREDITO') {
                    launchType = 'DIZIMO'
                } else if (val === 'D' || val === 'DEBIT' || val === 'DEBITO' || val === 'SAIDA') {
                    launchType = 'SAIDA'
                } else if (['CARNE_REVIVER', 'CARNE_AFRICA', 'CAMPANHA', 'MISSAO', 'CIRCULO', 'ENTRADA', 'EBD', 'VOTO', 'OFERTA_CULTO', 'DIZIMO'].includes(val)) {
                    launchType = val as LaunchType
                }
            }

            const rulePaymentMethod = findRuleValue(['pagamento', 'forma', 'payment', 'method', 'formapagamento', 'paymentmethodid'])
            if (rulePaymentMethod) {
                const val = rulePaymentMethod.trim()
                // Try as ID first
                const pmId = parseInt(val, 10)
                if (!isNaN(pmId)) {
                    launchPaymentMethodId = pmId
                } else {
                    // Try to resolution by name
                    const pm = await prisma.paymentMethod.findFirst({
                        where: { name: { contains: val, mode: 'insensitive' } }
                    })
                    if (pm) launchPaymentMethodId = pm.id
                }
            }

            const ruleClassification = findRuleValue(['conta', 'plano', 'classification', 'idconta', 'classificationid', 'classificacao'])
            if (ruleClassification) {
                const val = ruleClassification.trim()
                if (val) {
                    const cls = await prisma.classification.findFirst({
                        where: {
                            OR: [
                                { id: val },
                                { code: val },
                                { shortCode: val }
                            ]
                        }
                    })
                    if (cls) launchClassificationId = cls.id
                }
            } else {
                // Try from file columns if no rule
                const fileCls = getVal(dest, ['conta', 'plano', 'classification', 'classificacao', 'codcontabil'])
                if (fileCls) {
                    const s = String(fileCls).trim()
                    const cls = await prisma.classification.findFirst({
                        where: {
                            OR: [
                                { id: s },
                                { code: s },
                                { shortCode: s }
                            ]
                        }
                    })
                    if (cls) launchClassificationId = cls.id
                }
            }

            launchDescription = finalDesc.substring(0, 255)

            launchesToProcess.push({
                rowData: row,
                launchData: {
                    congregationId: currentLaunchCongregationId,
                    type: launchType,
                    date: parsedDate,
                    value: numValue,
                    description: launchDescription.substring(0, 255),
                    status: 'INTEGRATED' as LaunchStatus,
                    isIntegrated: true,
                    integrationBatchId: batch.id,
                    contributorId: cId,
                    contributorName: cName,
                    classificationId: launchClassificationId,
                    paymentMethodId: launchPaymentMethodId,
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
