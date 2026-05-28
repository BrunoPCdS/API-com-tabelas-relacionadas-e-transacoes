import { prisma } from "../lib/prisma";
import { type Prisma } from "../generated/prisma/client"

const eventos: Prisma.EventoCreateInput[] = [
    {
        nome: "Chapada tecnológica",
        descricao: "Evento mutcho loco",
        data: "2026-08-15T10:00:00Z",
        local: "Charqueada do guri",
        quantidadeIngressos: 100,
    },
]
async function main() {
    try {
        await prisma.evento.createMany({ data: eventos })
        console.log(`${eventos.length} Eventos Cadastrados...`)
    } catch (error) {
        console.error("Erro nas Inclusões (Seeds):", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

await main()
