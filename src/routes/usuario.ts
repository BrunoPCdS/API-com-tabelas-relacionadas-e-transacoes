import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"
import bcrypt from 'bcrypt'
import { gerarCodigo } from "../utilit/gerarCodigo"
import { validarSenha } from "../utilit/validaSenha"
import { verificaToken } from "../utilit/verificaToken"
import nodemailer from "nodemailer"
import { registraLog } from "../utilit/baseLog"
import crypto from 'crypto';
import {
    buscarUsuario,
    listarUsuarios,
    softDeleteUsuario
} from "../utilit/usuarioService"

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
		const usuarios = await listarUsuarios()
		res.status(200).json(usuarios)
	} catch (error) {
		res.status(500).json({ error: "Erro ao buscar usuario" })
	}
})

// ROTA PARA LISTAR USUÁRIOS DELETADOS (SOFT DELETE)
router.get("/deletados", verificaToken, async (req, res) => {
	try {
		const usuariosDeletados = await prisma.usuario.findMany({
    	where: {
        	deleted: true
		}
})
		res.status(200).json(usuariosDeletados);
	} catch (error) {
		res.status(500).json({ error: "Erro ao buscar usuários deletados" });
	}
});


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

	const usuarioExistente = await prisma.usuario.findUnique({
		where: { email },
	})

	if (usuarioExistente) {
		res.status(400).json({ error: "O email já está em uso" })
		return
	}

	const salt = bcrypt.genSaltSync(12)
	const hash = bcrypt.hashSync(senha, salt)
	const codigoAtivacao = crypto.randomBytes(32).toString('hex');

	try {
		// 1. Cria o usuário no banco de dados
		const usuario = await prisma.usuario.create({
			data: {
				nome,
				email,
				senha: hash,
				codigoAtivacao: codigoAtivacao,
			},
		});

		// 2. Prepara e envia o e-mail de ativação
		const linkAtivacao = `http://${req.headers.host}/usuario/ativar/${codigoAtivacao}`;
		const transporter = nodemailer.createTransport({
			host: "sandbox.smtp.mailtrap.io",
			port: 587,
			secure: false,
			auth: {
				user: process.env.MAILTRAP_EMAIL,
				pass: process.env.MAILTRAP_SENHA,
			},
		});

		await transporter.sendMail({
			from: process.env.MAILTRAP_EMAIL,
			to: email,
			subject: "Ativação de conta",
			html: `
				<h2>Bem-vindo(a) à nossa plataforma!</h2>
				<p>Olá, ${nome}.</p>
				<p>Obrigado por se cadastrar. Por favor, clique no link abaixo para ativar sua conta:</p>
				<p><a href="${linkAtivacao}">Ativar minha conta</a></p>
                <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
                <p>${linkAtivacao}</p>
			`,
		});

		// 3. Responde ao cliente
		res.status(201).json({ message: "Usuário cadastrado com sucesso! Verifique seu e-mail para ativar a conta." });

	} catch (error) {
		// Se qualquer passo (criação do usuário ou envio de e-mail) falhar, o erro será capturado aqui.
		console.error("Erro no processo de cadastro:", error);
		// Registra um log genérico. Não temos um ID de usuário logado aqui.
		await registraLog(`Falha no processo de cadastro para o e-mail: ${email}`);
		res.status(500).json({ error: "Ocorreu uma falha durante o processo de cadastro." });
	}
});


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
		await registraLog(`Usuário '${usuario.nome}' (ID: ${usuario.id}) foi atualizado.`, req.userLogadoId)
		res.status(200).json(usuario)
	} catch (error) {
		await registraLog("Erro ao atualizar usuário", req.userLogadoId)
		res.status(500).json({ error: "Erro ao atualizar usuario" })
	}
})

router.delete("/:id", verificaToken, async (req, res) => {
	const { id } = req.params
	const idNumber = Number(id)

	if (idNumber !== req.userLogadoId) {
		res.status(403).json({ error: "Acesso negado. Você só pode deletar sua própria conta." })
		return
	}
	if (Number.isNaN(idNumber)) {
		res.status(400).json({ error: "O ID do usuário deve ser um número" })
		return
	}

	try {
		const usuario = await buscarUsuario(idNumber)

		if (!usuario) {
			res.status(404).json({ error: "Usuário não encontrado" })
			return
		}

		await softDeleteUsuario(idNumber)

		await registraLog(`Usuário '${usuario.nome}' (ID: ${usuario.id}) foi deletado.`)
		res.status(200).json({ message: `Usuário '${usuario.nome}' deletado com sucesso.` })
	} catch (error) {
		console.error("Erro ao deletar usuário:", error)
		await registraLog(`Falha ao deletar usuário (ID: ${idNumber})`, req.userLogadoId);
		res.status(500).json({ error: "Erro ao deletar usuario" })
	}
})




// ROTA PARA RESTAURAR UM USUÁRIO (SOFT DELETE)
router.patch("/:id/restaurar", verificaToken, async (req, res) => {
    const { id } = req.params
    const idNumber = Number(id)

    if (Number.isNaN(idNumber)) {
        return res.status(400).json({
            error: "ID inválido"
        })
    }

    try {

        const usuario = await prisma.usuario.findFirst({
            where: {
                id: idNumber,
                deleted: true
            }
        })

        if (!usuario) {
            return res.status(404).json({
                error: "Usuário não encontrado."
            })
        }

        const usuarioRestaurado = await prisma.usuario.update({
            where: {
                id: idNumber
            },
            data: {
                deleted: false,
                deletedAt: null
            }
        })

        await registraLog(
            `Usuário '${usuarioRestaurado.nome}' restaurado.`,
            req.userLogadoId
        )

        res.status(200).json(usuarioRestaurado)

    } catch {

        res.status(500).json({
            error: "Erro ao restaurar usuário."
        })

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
		const usuario = await prisma.usuario.findFirst({
    		where: {
        		email,
        		deleted: false
    			}
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

router.get("/ativar/:codigo", async (req, res) => {
    const { codigo } = req.params;

    try {
        // Procura um usuário com o código de ativação fornecido
        const usuario = await prisma.usuario.findUnique({
            where: { codigoAtivacao: codigo }
        });

        // Se não encontrar, o código é inválido ou já foi usado
        if (!usuario) {
            return res.status(404).send("<h1>Código de ativação inválido ou expirado.</h1>");
        }

        // Se encontrar, atualiza o status para ATIVO e remove o código de ativação
        await prisma.usuario.update({
            where: { id: usuario.id },
            data: {
                status: 'Ativo',
                codigoAtivacao: null // Limpa o código para não ser usado novamente
            }
        });

        // Retorna uma mensagem de sucesso para o usuário
        res.status(200).send("<h1>Conta ativada com sucesso!</h1><p>Você já pode fechar esta aba e fazer o login no aplicativo.</p>");

    } catch (error) {
        console.error("Erro ao ativar conta:", error);
        res.status(500).send("<h1>Erro no servidor</h1><p>Ocorreu um erro ao tentar ativar sua conta. Tente novamente mais tarde.</p>");
    }
});


export default router
