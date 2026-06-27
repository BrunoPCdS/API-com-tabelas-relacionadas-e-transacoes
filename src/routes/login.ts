import { prisma } from "../../lib/prisma"
import { Router } from "express"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

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
            res.status(400).json({ error: mensaPadrao })
            return
        }

        if (bcrypt.compareSync(senha, usuario.senha)) {

            const payload = { userLogadoId: usuario.id, userLogadoNome: usuario.nome, userLogadoEmail: usuario.email }
            const secret = process.env.JWT_SECRET as string
            const options = { expiresIn: '15m' } as object
            const token = jwt.sign(payload, secret, options)
            res.status(200).json({ 
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                token: token
            })
        } else {
            res.status(400).json({ error: mensaPadrao })
        }
    } catch (error) { 
        res.status(500).json({ error: "Erro ao fazer login" })
    }
})

export default router