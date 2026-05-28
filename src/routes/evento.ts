import { prisma } from "../../lib/prisma"
import { Router } from "express"
import { z } from "zod"

const router = Router()

const eventoBaseSchema = z.object({
    nome: z.string()
        .min(3, { message: "O nome deve conter pelo menos 3 caracteres" })
        .max(60, { message: "O nome deve conter no máximo 60 caracteres" }),
    descricao: z.string().optional(),
    data: z.coerce.date({ message: "A data deve ser válida" }),
    local: z.string()
        .min(3, { message: "O local deve conter pelo menos 3 caracteres" })
        .max(60, { message: "O local deve conter no máximo 60 caracteres" }),
})

const eventoCreateSchema = eventoBaseSchema.extend({
    quantidadeIngressos: z.number().int({ message: "A quantidade de ingressos deve ser um número inteiro" }).nonnegative({ message: "A quantidade de ingressos não pode ser negativa" }).default(0),
})

const eventoUpdateSchema = eventoBaseSchema.partial().extend({
    quantidadeIngressos: z.number().int({ message: "A quantidade de ingressos deve ser um número inteiro" }).nonnegative({ message: "A quantidade de ingressos não pode ser negativa" }).optional(),
})

router.get("/", async (req, res) => {
    try {
        const eventos = await prisma.evento.findMany({
        })
        res.status(200).json(eventos)
    } catch (error) {
        res.status(500).json({ error: "Erro ao buscar evento" })
    }
})

router.post("/", async (req, res) => {
    const valida = eventoCreateSchema.safeParse(req.body)
    if (!valida.success) {
        res.status(400).json({ error: valida.error })
        return
    }
    const { nome, descricao, data, local, quantidadeIngressos } = valida.data
    try {
        const evento = await prisma.evento.create({
            data: { nome, descricao, data, local, quantidadeIngressos }
        })
        res.status(201).json(evento)
    } catch (error) {
        res.status(500).json({ error: "Erro ao criar evento" })
    }
})

router.put("/:id", async (req, res) => {
    const { id } = req.params
    const idNumber = Number(id)
    const valida = eventoUpdateSchema.safeParse(req.body)
    if (!valida.success) {
        res.status(400).json({ error: valida.error })
        return
    }
    const { nome, descricao, data, local, quantidadeIngressos } = valida.data
    const dataUpdate: {
        nome?: string
        descricao?: string
        data?: Date
        local?: string
        quantidadeIngressos?: number
    } = {}

    if (nome !== undefined) dataUpdate.nome = nome
    if (descricao !== undefined) dataUpdate.descricao = descricao
    if (data !== undefined) dataUpdate.data = data
    if (local !== undefined) dataUpdate.local = local
    if (quantidadeIngressos !== undefined) dataUpdate.quantidadeIngressos = quantidadeIngressos

    try {
        const evento = await prisma.evento.update({
            where: { id: idNumber },
            data: dataUpdate
        })
        res.status(200).json(evento)
    } catch (error) {
        res.status(500).json({ error: "Erro ao atualizar evento" })
    }
})

router.delete("/:id", async (req, res) => {
    const { id } = req.params
    const idNumber = Number(id)
    try {
        await prisma.evento.delete({
            where: { id: idNumber }
        })
        res.status(204).send()
    } catch (error) {
        res.status(500).json({ error: "Erro ao deletar evento" })
    }
})

export default router



