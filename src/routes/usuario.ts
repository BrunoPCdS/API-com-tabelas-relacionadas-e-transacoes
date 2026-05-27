import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"

const router = Router()

const usuarioSchema = z.object({
	nome: z.string()
		.min(3, { message: "O nome deve conter pelo menos 3 caracteres" })
		.max(40, { message: "O nome deve conter no máximo 40 caracteres" }),
	email: z.email({ message: "O email deve ser válido" }),
})

router.get("/", async (req, res) => {
	try {
		const usuarios = await prisma.usuario.findMany({})
		res.status(200).json(usuarios)
	} catch (error) {
		res.status(500).json({ error: "Erro ao buscar usuario" })
	}
})

router.post("/", async (req, res) => {
	const valida = usuarioSchema.safeParse(req.body)
	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { nome, email } = valida.data

	try {
		const usuario = await prisma.usuario.create({
			data: { nome, email },
		})
		res.status(201).json(usuario)
	} catch (error) {
		res.status(500).json({ error: "Erro ao criar usuario" })
	}
})

router.put("/:id", async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	if (Number.isNaN(idNumber)) {
		res.status(400).json({ error: "O ID do usuário deve ser um número" })
		return
	}

	const valida = usuarioSchema.safeParse(req.body)
	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { nome, email } = valida.data

	try {
		const usuario = await prisma.usuario.update({
			where: { id: idNumber },
			data: { nome, email },
		})
		res.status(200).json(usuario)
	} catch (error) {
		res.status(500).json({ error: "Erro ao atualizar usuario" })
	}
})

router.delete("/:id", async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	if (Number.isNaN(idNumber)) {
		res.status(400).json({ error: "O ID do usuário deve ser um número" })
		return
	}

	try {
		await prisma.usuario.delete({
			where: { id: idNumber },
		})
		res.status(204).send()
	} catch (error) {
		res.status(500).json({ error: "Erro ao deletar usuario" })
	}
})

export default router
