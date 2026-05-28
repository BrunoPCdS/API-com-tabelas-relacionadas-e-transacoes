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
		const inscricao = await prisma.$transaction(async (transaction) => {
			const evento = await transaction.evento.findUnique({
				where: { id: eventoId },
				select: { quantidadeIngressos: true },
			})

			if (!evento) {
				throw new Error("EVENTO_NAO_ENCONTRADO")
			}

			if (evento.quantidadeIngressos <= 0) {
				throw new Error("SEM_INGRESSOS")
			}

			await transaction.evento.update({
				where: { id: eventoId },
				data: { quantidadeIngressos: { decrement: 1 } },
			})

			return transaction.inscricao.create({
				data: { eventoId, usuarioId, ingressoId },
			})
		})
		res.status(201).json(inscricao)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message === "EVENTO_NAO_ENCONTRADO") {
				res.status(404).json({ error: "Evento não encontrado" })
				return
			}

			if (error.message === "SEM_INGRESSOS") {
				res.status(400).json({ error: "Não há ingressos disponíveis para este evento" })
				return
			}
		}
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
		const inscricaoAtual = await prisma.inscricao.findUnique({
			where: { id: idNumber },
			select: { eventoId: true },
		})

		if (!inscricaoAtual) {
			res.status(404).json({ error: "Inscrição não encontrada" })
			return
		}

		const inscricao = await prisma.$transaction(async (transaction) => {
			if (inscricaoAtual.eventoId !== eventoId) {
				const eventoNovo = await transaction.evento.findUnique({
					where: { id: eventoId },
					select: { quantidadeIngressos: true },
				})

				if (!eventoNovo) {
					throw new Error("EVENTO_NAO_ENCONTRADO")
				}

				if (eventoNovo.quantidadeIngressos <= 0) {
					throw new Error("SEM_INGRESSOS")
				}

				await transaction.evento.update({
					where: { id: eventoId },
					data: { quantidadeIngressos: { decrement: 1 } },
				})

				await transaction.evento.update({
					where: { id: inscricaoAtual.eventoId },
					data: { quantidadeIngressos: { increment: 1 } },
				})
			}

			return transaction.inscricao.update({
				where: { id: idNumber },
				data: { eventoId, usuarioId, ingressoId },
			})
		})
		res.status(200).json(inscricao)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message === "EVENTO_NAO_ENCONTRADO") {
				res.status(404).json({ error: "Evento não encontrado" })
				return
			}

			if (error.message === "SEM_INGRESSOS") {
				res.status(400).json({ error: "Não há ingressos disponíveis para este evento" })
				return
			}
		}
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
		const inscricao = await prisma.inscricao.findUnique({
			where: { id: idNumber },
			select: { eventoId: true },
		})

		if (!inscricao) {
			res.status(404).json({ error: "Inscrição não encontrada" })
			return
		}

		await prisma.$transaction([
			prisma.evento.update({
				where: { id: inscricao.eventoId },
				data: { quantidadeIngressos: { increment: 1 } },
			}),
			prisma.inscricao.delete({
				where: { id: idNumber },
			}),
		])
		res.status(204).send()
	} catch (error) {
		res.status(500).json({ error: "Erro ao deletar inscricao" })
	}
})

export default router
