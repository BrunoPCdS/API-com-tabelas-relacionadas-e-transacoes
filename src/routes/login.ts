import { prisma } from "../../lib/prisma"
import { Router } from "express"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { registraLog } from "../utilit/baseLog"

const router = Router()

router.post("/", async (req, res) => {
    const { email, senha } = req.body

    const mensaPadrao = "Email ou senha inválidos"

    if (!email || !senha) {
        res.status(400).json({ error: mensaPadrao })
        return
    }
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { email }
        })

        if (usuario == null) {
            await registraLog(`Tentativa de login falhou para o email (não encontrado): ${email}`);
            res.status(400).json({ error: mensaPadrao })
            return
        }
        
        if (usuario.status === "Inativo") {
            await registraLog(`Tentativa de login falhou para o email (conta inativa): ${email}`, usuario.id);
            res.status(403).json({ error: "Sua conta não está ativa. Por favor, verifique seu e-mail para o link de ativação." });
            return;
        }

        if (bcrypt.compareSync(senha, usuario.senha)) {
            const secret = process.env.JWT_SECRET

            if (!secret) {
                console.error("JWT_SECRET não configurado no ambiente")
                res.status(500).json({ error: "Configuração de autenticação ausente" })
                return
            }

            const payload = { userLogadoId: usuario.id, userLogadoNome: usuario.nome, userLogadoEmail: usuario.email }
            const options = { expiresIn: '15m' } as object
            const token = jwt.sign(payload, secret, options)
            res.status(200).json({ 
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                token: token
            })
        } else {
            await registraLog(`Tentativa de login falhou para o email (senha incorreta): ${email}`, usuario.id);
            res.status(400).json({ error: mensaPadrao })
        }
    } catch (error) { 
        console.error(error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
})

export default router