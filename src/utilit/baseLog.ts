import { prisma } from "../../lib/prisma";
import { Router } from "express"

const router = Router()

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

router.get("/logs", async (req, res) => {
  try {
    const logs = await prisma.log.findMany();
    res.json(logs);
  } catch (error) {
    console.error("Erro ao buscar logs:", error);
    res.status(500).json({ error: "Erro ao buscar logs" });
  }
});

export default router;