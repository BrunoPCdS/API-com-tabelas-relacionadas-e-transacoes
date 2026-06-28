import { prisma } from "../../lib/prisma";
import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { validarSenha } from "../utilit/validaSenha";
import { registraLog } from "../utilit/baseLog";

const router = Router();

const schema = z.object({
    email: z.string(),
    codigo: z.string(),
    novaSenha: z.string().min(6).max(60)
});

router.post("/", async (req, res) => {

    const valida = schema.safeParse(req.body);

    if (!valida.success) {
        res.status(400).json({ error: valida.error });
        return;
    }

    const { email, codigo, novaSenha } = valida.data;

    const usuario = await prisma.usuario.findUnique({
        where: {
            email: email
        }
    });

    if (!usuario) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
    }
    if (usuario.codigoDeRecuperacao !== codigo) {
        res.status(400).json({ erro: "Código inválido" });
        return;
    }
  if (
    !usuario.codigoDeRecuperacao ||
    !usuario.codigoExpiraEm ||
    usuario.codigoExpiraEm < new Date()
  ) {
    res.status(400).json({ erro: "Código expirado" });
    return;
  }
    const erros = validarSenha(novaSenha);

    if (erros.length > 0) {
        res.status(400).json({ error: erros });
        return;
    }

    const salt = bcrypt.genSaltSync(10);
    const senhaHash = bcrypt.hashSync(novaSenha, salt);

    await prisma.usuario.update({
        where: {
            email: email
        },
        data: {
            senha: senhaHash,
            codigoDeRecuperacao: null,
            codigoExpiraEm: null
        }
    });
    //---log---
    await registraLog(`Usuário ${usuario.id} alterou a senha com sucesso.`, usuario.id);
    res.status(200).json({ message: "Senha alterada com sucesso" });
});

export default router;