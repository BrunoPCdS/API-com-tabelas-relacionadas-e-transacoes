import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"

const router = Router()

const inscricaoSchema = z.object({
	eventoId: z.number().int({ message: "O ID do evento deve ser um número inteiro" }),
	usuarioId: z.number().int({ message: "O ID do usuário deve ser um número inteiro" }),
	ingressoId: z.number().int({ message: "O ID do ingresso deve ser um número inteiro" }),
})

router.get("/", async (req, res) => {
	try {
		const inscricoes = await prisma.inscricao.findMany({})
		res.status(200).json(inscricoes)
	} catch (error) {
		res.status(500).json({ error: "Erro ao buscar inscricao" })
	}
})

router.post("/", async (req, res) => {
	const valida = inscricaoSchema.safeParse(req.body)
	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { eventoId, usuarioId, ingressoId } = valida.data

	try {
		const inscricao = await prisma.inscricao.create({
			data: { eventoId, usuarioId, ingressoId },
		})
		res.status(201).json(inscricao)
	} catch (error) {
		res.status(500).json({ error: "Erro ao criar inscricao" })
	}
})

router.put("/:id", async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	if (Number.isNaN(idNumber)) {
		res.status(400).json({ error: "O ID da inscrição deve ser um número" })
		return
	}

	const valida = inscricaoSchema.safeParse(req.body)
	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { eventoId, usuarioId, ingressoId } = valida.data

	try {
		const inscricao = await prisma.inscricao.update({
			where: { id: idNumber },
			data: { eventoId, usuarioId, ingressoId },
		})
		res.status(200).json(inscricao)
	} catch (error) {
		res.status(500).json({ error: "Erro ao atualizar inscricao" })
	}
})

router.delete("/:id", async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	if (Number.isNaN(idNumber)) {
		res.status(400).json({ error: "O ID da inscrição deve ser um número" })
		return
	}

	try {
		await prisma.inscricao.delete({
			where: { id: idNumber },
		})
		res.status(204).send()
	} catch (error) {
		res.status(500).json({ error: "Erro ao deletar inscricao" })
	}
})

export default router
