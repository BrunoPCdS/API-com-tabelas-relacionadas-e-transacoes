import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"

const router = Router()

const ingressoSchema = z.object({
	tipo: z.enum(["VIP", "Pista", "MeiaEntrada"] as const).optional(),
	descricao: z.string().optional(),
	eventoId: z.number().int({ message: "O ID do evento deve ser um número inteiro" }),
})

router.get("/", async (req, res) => {
	try {
		const ingressos = await prisma.ingresso.findMany({})
		res.status(200).json(ingressos)
	} catch (error) {
		res.status(500).json({ error: "Erro ao buscar ingresso" })
	}
})

router.post("/", async (req, res) => {
	const valida = ingressoSchema.safeParse(req.body)
	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { tipo, descricao, eventoId } = valida.data

	try {
		const ingresso = await prisma.ingresso.create({
			data: { tipo, descricao, eventoId },
		})
		res.status(201).json(ingresso)
	} catch (error) {
		res.status(500).json({ error: "Erro ao criar ingresso" })
	}
})

router.put("/:id", async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	if (Number.isNaN(idNumber)) {
		res.status(400).json({ error: "O ID do ingresso deve ser um número" })
		return
	}

	const valida = ingressoSchema.safeParse(req.body)
	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { tipo, descricao, eventoId } = valida.data

	try {
		const ingresso = await prisma.ingresso.update({
			where: { id: idNumber },
			data: { tipo, descricao, eventoId },
		})
		res.status(200).json(ingresso)
	} catch (error) {
		res.status(500).json({ error: "Erro ao atualizar ingresso" })
	}
})

router.delete("/:id", async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	if (Number.isNaN(idNumber)) {
		res.status(400).json({ error: "O ID do ingresso deve ser um número" })
		return
	}

	try {
		await prisma.ingresso.delete({
			where: { id: idNumber },
		})
		res.status(204).send()
	} catch (error) {
		res.status(500).json({ error: "Erro ao deletar ingresso" })
	}
})

export default router
