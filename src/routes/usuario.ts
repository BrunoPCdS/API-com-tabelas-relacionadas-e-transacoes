import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import bcrypt from 'bcrypt'
import { gerarCodigo } from "../utilit/gerarCodigo"
import { verificaToken } from "../utilit/verificaToken"

const router = Router()
const expira = new Date()
expira.setHours(expira.getHours() + 1)

const usuarioSchema = z.object({
	nome: z.string()
		.min(3, { message: "O nome deve conter pelo menos 3 caracteres" })
		.max(40, { message: "O nome deve conter no máximo 40 caracteres" }),
	email: z.email({ message: "O email deve ser válido" }),
	senha: z.string()
		.min(6, { message: "A senha deve conter pelo menos 6 caracteres" })
		.max(60, { message: "A senha deve conter no máximo 60 caracteres" }),
})

const usuarioUpdateSchema = usuarioSchema.partial()

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

	const { nome, email, senha } = valida.data

	const mensaErros = validaSenha(senha)

	if (mensaErros.length > 0) {
		res.status(400).json({ error: mensaErros })
		return
	}

	const salt = bcrypt.genSaltSync(12)
	const hash = bcrypt.hashSync(senha, salt)

	try {
		const usuario = await prisma.usuario.create({
			data: { nome, email, senha: hash },
		})
		res.status(201).json(usuario)
	} catch (error) {
		res.status(500).json({ error: "Erro ao criar usuario" })
	}
})

router.put("/:id", verificaToken, async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	// Verifica se o ID do usuário logado é o mesmo do parâmetro da rota
	if (idNumber !== req.userLogadoId) {
		res.status(403).json({ error: "Acesso negado. Você só pode alterar seus próprios dados." })
		return
	}

	const valida = usuarioUpdateSchema.safeParse(req.body)
	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { nome, email, senha } = valida.data
	const dataUpdate: {
		nome?: string
		email?: string
		senha?: string
	} = {}

	if (nome !== undefined) dataUpdate.nome = nome
	if (email !== undefined) dataUpdate.email = email

	try {
		const usuario = await prisma.usuario.update({
			where: { id: req.userLogadoId },
			data: dataUpdate,
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



// senha -------------------------------------------------------------------------

function validaSenha(senha: string) {
	const mensa: string[] = []

	if (senha.length < 6) {
		mensa.push("A senha deve conter pelo menos 6 caracteres")
	}

	if (senha.length > 60) {
		mensa.push("A senha deve conter no máximo 60 caracteres")
	}

	let pequenas = 0
	let grandes = 0
	let numeros = 0
	let especiais = 0

	for (const letra of senha) {
		if ((/[a-z]/).test(letra)) {
			pequenas++
		}
		else if ((/[A-Z]/).test(letra)) {
			grandes++
		}
		else if ((/[0-9]/).test(letra)) {
			numeros++
		}
		else {
			especiais++
		}
	}

	if (pequenas === 0) {
		mensa.push("A senha deve conter pelo menos uma letra minúscula")
	}

	if (grandes === 0) {
		mensa.push("A senha deve conter pelo menos uma letra maiúscula")
	}

	if (numeros === 0) {
		mensa.push("A senha deve conter pelo menos um número")
	}

	if (especiais === 0) {
		mensa.push("A senha deve conter pelo menos um caractere especial")
	}

	return mensa
}

// recuperar senha ---------------------------------------------------------------
router.post("/recuperar-senha", async (req, res) => {
	const schema = z.object({
		email: z.string()
	})
	const valida = schema.safeParse(req.body)

	if (!valida.success) {
		res.status(400).json({ error: valida.error })
		return
	}

	const { email } = valida.data

	try {
		const usuario = await prisma.usuario.findUnique({
			where: { email }
		})

		if (!usuario) {
			res.status(404).json({ error: "Usuário não encontrado" })
			return
		}

		const codigo = gerarCodigo()

		await prisma.usuario.update({
			where: { email },
			data: { codigoRecuperacao: codigo, codigoRecuperacaoExpiracao: expira }
		})

		console.log(`Código de recuperação para ${email}: ${codigo}`)

		res.status(200).json({ message: "Código de recuperação enviado para o email" })
	} catch (error) {
		res.status(500).json({ error: "Erro ao recuperar senha" })


	}
})

export default router
