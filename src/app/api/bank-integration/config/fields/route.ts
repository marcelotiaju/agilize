import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../auth/[...nextauth]/route"

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

    // Definição estática dos campos mapeáveis para facilitar a interface
    const fields = {
        Launch: [
            { value: "Launch.date", label: "Data do Lançamento" },
            { value: "Launch.value", label: "Valor" },
            { value: "Launch.description", label: "Descrição" },
            { value: "Launch.type", label: "Tipo de Lançamento" },
            { value: "Launch.contributorName", label: "Nome do Contribuinte" },
            { value: "Launch.supplierName", label: "Nome do Fornecedor" },
            { value: "Launch.talonNumber", label: "Número do Talão/Documento" },
        ],
        Congregation: [
            { value: "Congregation.name", label: "Nome da Congregação" },
            { value: "Congregation.code", label: "Código da Congregação" },
        ],
        Contributor: [
            { value: "Contributor.name", label: "Nome do Contribuinte" },
            { value: "Contributor.code", label: "Código do Contribuinte" },
            { value: "Contributor.cpf", label: "CPF do Contribuinte" },
        ]
    }

    return NextResponse.json(fields)
}
