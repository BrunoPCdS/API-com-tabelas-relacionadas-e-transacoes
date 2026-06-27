
export function validarSenha(senha: string): string[] {
    const mensagens: string[] = []

    if (senha.length < 6) {
        mensagens.push("A senha deve conter pelo menos 6 caracteres")
    }

    if (senha.length > 60) {
        mensagens.push("A senha deve conter no máximo 60 caracteres")
    }
    if (!/[a-z]/.test(senha)) {
        mensagens.push("A senha deve conter pelo menos uma letra minúscula")
    }
    if (!/[A-Z]/.test(senha)) {
        mensagens.push("A senha deve conter pelo menos uma letra maiúscula")
    }
    if (!/[0-9]/.test(senha)) {
        mensagens.push("A senha deve conter pelo menos um número")
    }
    if (!/[^a-zA-Z0-9]/.test(senha)) {
        mensagens.push("A senha deve conter pelo menos um caractere especial")
    }
    return mensagens
}