import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { useSession } from "next-auth/react";
import prisma from "@/lib/prisma"
import{ authOptions }from "../auth/[...nextauth]/route";


export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);


  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        razaoSocial: 'asc'
      }
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar fornecedores" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { code, razaoSocial, tipoPessoa, cpfCnpj } = await request.json()

    if (!code || !razaoSocial || !tipoPessoa || !cpfCnpj) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        code,
        razaoSocial,
        tipoPessoa,
        cpfCnpj
      }
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: "Código ou CPF/CNPJ já existe" }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao criar fornecedor" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);  


  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { id, code, razaoSocial, tipoPessoa, cpfCnpj } = await request.json()

    if (!id || !code || !razaoSocial || !tipoPessoa || !cpfCnpj) {
      return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        code,
        razaoSocial,
        tipoPessoa,
        cpfCnpj
      }
    })

    return NextResponse.json(supplier)
  } catch (error) {
    if ((error as any).code === 'P2002') {
      return NextResponse.json({ error: "Código ou CPF/CNPJ já existe" }, { status: 400 })
    }
    return NextResponse.json({ error: "Erro ao atualizar fornecedor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "ID do fornecedor é obrigatório" }, { status: 400 })
    }

    await prisma.supplier.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Fornecedor excluído com sucesso" })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir fornecedor" }, { status: 500 })
  }
}
