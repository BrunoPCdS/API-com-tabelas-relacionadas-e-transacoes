import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import bcrypt from 'bcrypt'
import { gerarCodigo } from "../utilit/gerarCodigo"
import { validarSenha } from "../utilit/validaSenha"
import { verificaToken } from "../utilit/verificaToken"
import nodemailer from "nodemailer"

const router = Router()

const usuarioSchema = z.object({
	nome: z.string()
		.min(3, { message: "O nome deve conter pelo menos 3 caracteres" })
		.max(40, { message: "O nome deve conter no máximo 40 caracteres" }),
	email: z.email({ message: "O email deve ser válido" }),
	senha: z.string(),
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

	const mensaErros = validarSenha(senha)

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
		const usuario = await prisma.usuario.findUnique({
			where: { id: idNumber },
		})

		if (!usuario) {
			res.status(404).json({ error: "Usuário não encontrado" })
			return
		}

		// Usar uma transação para deletar registros dependentes primeiro
		await prisma.$transaction([
			// Deleta os logs associados ao usuário
			prisma.log.deleteMany({
				where: { usuarioId: idNumber },
			}),
			// Deleta as inscrições associadas ao usuário
			prisma.inscricao.deleteMany({
				where: { usuarioId: idNumber },
			}),
			// Finalmente, deleta o usuário
			prisma.usuario.delete({
				where: { id: idNumber },
			}),
			
		])
		res.status(200).json({ message: `Usuário '${usuario.nome}' deletado com sucesso.` })
	} catch (error) {
		console.error("Erro ao deletar usuário:", error)
		res.status(500).json({ error: "Erro ao deletar usuario" })
	}
})




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
		const expira = new Date()
		expira.setHours(expira.getHours() + 1)

		await prisma.usuario.update({
			where: { email },
			data: { codigoDeRecuperacao: codigo, codigoExpiraEm: expira }
		})

		const transporter = nodemailer.createTransport({
			host: "sandbox.smtp.mailtrap.io",
			port: 587,
			secure: false,
			auth: {
				user: process.env.MAILTRAP_EMAIL,
				pass: process.env.MAILTRAP_SENHA,
			},
		})

		try {
			await transporter.sendMail({
				from: process.env.MAILTRAP_EMAIL,
				to: email,
				subject: "Código de recuperação de senha",
				html: `
					<h2>Recuperação de senha</h2>
					<p>Olá, ${usuario.nome}.</p>
					<p>Use o código abaixo para redefinir sua senha:</p>
					<p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${codigo}</p>
					<p>Esse código expira em 1 hora.</p>
				`,
			})
		} catch (emailError) {
			console.error("Erro ao enviar e-mail de recuperação:", emailError)
			await prisma.usuario.update({
				where: { email },
				data: { codigoDeRecuperacao: null, codigoExpiraEm: null }
			})
			res.status(500).json({ error: "Erro ao enviar o código por e-mail" })
			return
		}

		res.status(200).json({ message: "Código de recuperação enviado para o email" })
	} catch (error) {
		res.status(500).json({ error: "Erro ao recuperar senha" })


	}
})

export default router
