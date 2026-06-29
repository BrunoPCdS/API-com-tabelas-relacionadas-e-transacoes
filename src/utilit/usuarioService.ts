import { prisma } from "../../lib/prisma"


export async function softDeleteUsuario(id: number) {
    return prisma.usuario.update({
        where: {
            id
        },
        data: {
            deleted: true,
            deletedAt: new Date()
        }
    })
}

export async function buscarUsuario(id: number) {
    return prisma.usuario.findFirst({
        where: {
            id,
            deleted: false
        }
    })
}

export async function listarUsuarios() {
    return prisma.usuario.findMany({
        where: {
            deleted: false
        }
    })
}