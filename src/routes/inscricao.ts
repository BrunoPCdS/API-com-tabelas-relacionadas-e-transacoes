import { prisma } from "../../lib/prisma"
import { Router } from "express"
import nodemailer from "nodemailer"
import { z } from "zod"

const router = Router()

const inscricaoSchema = z.object({
	eventoId: z.number().int({ message: "O ID do evento deve ser um número inteiro" }),
	usuarioId: z.number().int({ message: "O ID do usuário deve ser um número inteiro" }),
	ingressoId: z.number().int({ message: "O ID do ingresso deve ser um número inteiro" }),
})

router.get("/", async (req, res) => {
	try {
		const inscricoes = await prisma.inscricao.findMany({
			orderBy: { id: "desc" },
			include: {
				usuario: {
					select: { id: true, nome: true, email: true, criado_em: true },
				},
				evento: {
					select: { id: true, nome: true, data: true, local: true },
				},
				ingresso: {
					select: { id: true, tipo: true, descricao: true },
				},
			},
		})
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
				select: { nome: true, data: true, local: true, quantidadeIngressos: true },
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

			const usuario = await transaction.usuario.findUnique({
				where: { id: usuarioId },
				select: { nome: true, email: true },
			})

			if (!usuario) {
				throw new Error("USUARIO_NAO_ENCONTRADO")
			}

			const ingresso = await transaction.ingresso.findUnique({
				where: { id: ingressoId },
				select: { tipo: true },
			})

			if (!ingresso) {
				throw new Error("INGRESSO_NAO_ENCONTRADO")
			}

			const inscricaoCriada = await transaction.inscricao.create({
				data: { eventoId, usuarioId, ingressoId },
			})

			return {
				inscricao: inscricaoCriada,
				evento,
				usuario,
				ingresso,
			}
		})
//email------------------------------------------------------
		const transporter = nodemailer.createTransport({
			host: "sandbox.smtp.mailtrap.io",
			port: 587,
			secure: false,
			auth: {
				user: process.env.MAILTRAP_EMAIL,
				pass: process.env.MAILTRAP_SENHA,
			},
		})

		const dataEvento = new Date(inscricao.evento.data).toLocaleString("pt-BR", {
			timeZone: "America/Sao_Paulo",
		})

		try {
			await transporter.sendMail({
				from: process.env.MAILTRAP_EMAIL,
				to: inscricao.usuario.email,
				subject: "Confirmação de inscrição no evento",
				html: `
					<h2>Inscrição confirmada</h2>
					<p>Olá, ${inscricao.usuario.nome}.</p>
					<p>Sua inscrição foi realizada com sucesso.</p>
					<ul>
						<li><strong>Evento:</strong> ${inscricao.evento.nome}</li>
						<li><strong>Data:</strong> ${dataEvento}</li>
						<li><strong>Local:</strong> ${inscricao.evento.local}</li>
						<li><strong>Ingresso:</strong> ${inscricao.ingresso.tipo}</li>
					</ul>
				`,
			})
		} catch (emailError) {
			console.error("Erro ao enviar e-mail de confirmação:", emailError)
		}

		res.status(201).json(inscricao.inscricao)
	} catch (error) {
		if (error instanceof Error) {
			if (error.message === "EVENTO_NAO_ENCONTRADO") {
				res.status(404).json({ error: "Evento não encontrado" })
				return
			}

			if (error.message === "USUARIO_NAO_ENCONTRADO") {
				res.status(404).json({ error: "Usuário não encontrado" })
				return
			}

			if (error.message === "INGRESSO_NAO_ENCONTRADO") {
				res.status(404).json({ error: "Ingresso não encontrado" })
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
		res.status(200).json({
			message: "Inscrição deletada com sucesso",
			id: idNumber,
			eventoId: inscricao.eventoId,
		})
	} catch (error) {
		res.status(500).json({ error: "Erro ao deletar inscricao" })
	}
})
export default router
