import { prisma } from "../../lib/prisma";

export async function registraLog(descricao: string, usuarioId?: number) {
  try {
    await prisma.log.create({
      data: {
        descricao,
        usuarioId,
      },
    });
  } catch (error) {
    console.error("Erro ao criar log:", error);
  }
}