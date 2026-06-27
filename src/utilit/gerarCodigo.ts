export function gerarCodigo(): string {
    const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let codigo = ""
    for (let i = 0; i < 6; i++) {
        const indice = Math.floor(Math.random() * caracteres.length)
        codigo += caracteres[indice]
    }
    return codigo
}

